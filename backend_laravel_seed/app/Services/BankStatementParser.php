<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser as PdfParser;

class BankStatementParser
{
    private const PROFILE_GENERIC = 'generic';

    private const PROFILE_MONIEPOINT = 'moniepoint';

    private const PROFILE_ACCESS = 'access';

    private const PROFILE_UBA = 'uba';

    private const DATE_PATTERN = '/^(?:\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{4}-\d{2}-\d{2}(?:[T\s]+\d{2}:\d{2}(?::\d{2})?)?)/';

    private const AMOUNT_PATTERN = '/([\d,]+\.\d{2})/';

    public function parsePdf(string $absolutePath): array
    {
        if (! is_file($absolutePath) || ! is_readable($absolutePath)) {
            throw new \RuntimeException('Corrupt PDF or unreadable file.');
        }

        $rawText = $this->extractTextFromPdf($absolutePath);

        if (trim($rawText) === '') {
            $rawText = $this->extractTextViaOcr($absolutePath);
        }

        if (trim($rawText) === '') {
            throw new \RuntimeException('Unable to extract text from statement PDF.');
        }

        $profile = $this->detectProfile($rawText);
        $transactions = $this->parseRawText($rawText, $profile);

        if (empty($transactions)) {
            $transactions = $this->parseUsingAiFallback($rawText);
        }

        if (empty($transactions)) {
            throw new \RuntimeException('No date detected in statement content.');
        }

        $hasBalance = collect($transactions)->contains(fn (array $row) => isset($row['balance']) && (float) $row['balance'] > 0);
        if (! $hasBalance) {
            throw new \RuntimeException('No balance column detected in statement.');
        }

        return [
            'raw_text' => $rawText,
            'profile' => $profile,
            'transactions' => $transactions,
        ];
    }

    public function parseRawText(string $rawText, ?string $profile = null): array
    {
        $activeProfile = $profile ?: $this->detectProfile($rawText);
        $normalized = $this->normalizeText($rawText, $activeProfile);
        $lines = array_values(array_filter(array_map('trim', preg_split('/\R+/', $normalized) ?: [])));

        $transactionLines = $this->mergeTransactionLines($lines, $activeProfile);
        if (empty($transactionLines)) {
            return [];
        }

        $rows = [];

        foreach ($transactionLines as $line) {
            $transaction = $this->extractTransactionFromLine($line, $activeProfile);
            if ($transaction) {
                $rows[] = $transaction;
            }
        }

        return $rows;
    }

    private function extractTextFromPdf(string $absolutePath): string
    {
        try {
            $pdf = (new PdfParser())->parseFile($absolutePath);

            return $pdf->getText() ?? '';
        } catch (\Throwable) {
            return '';
        }
    }

    private function extractTextViaOcr(string $absolutePath): string
    {
        $tesseractPath = (string) config('dcbs.tesseract_binary', 'tesseract');
        $escapedBinary = escapeshellcmd($tesseractPath);
        $escapedFile = escapeshellarg($absolutePath);
        $language = escapeshellarg((string) config('dcbs.ocr_language', 'eng'));

        $command = "{$escapedBinary} {$escapedFile} stdout -l {$language} 2>&1";
        $output = shell_exec($command);

        if (! is_string($output)) {
            return '';
        }

        if (Str::contains(Str::lower($output), ['error', 'not found', 'failed', 'cannot'])) {
            return '';
        }

        return $output;
    }

    private function normalizeText(string $rawText, string $profile): string
    {
        $text = str_replace(["\r\n", "\r", "\t"], ["\n", "\n", ' '], $rawText);
        $text = preg_replace('/[ ]{2,}/', ' ', $text) ?? $text;
        $text = preg_replace('/\s*,\s*/', ',', $text) ?? $text;
        $text = preg_replace('/(\d\.\d{2})(?=\d)/', '$1 ', $text) ?? $text;
        $text = preg_replace('/T(\d{2}:)\s+(\d{2}:\d{2})/', 'T$1$2', $text) ?? $text;

        if ($profile === self::PROFILE_MONIEPOINT) {
            $text = preg_replace('/(Date\s+Narration\s+Reference\s+Debit\s+Credit)\s*Balance/i', '$1 Balance', $text) ?? $text;
            $text = preg_replace('/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+([A-Z]{2,}_[A-Z]{2,}[^\n]*)/', '$1 $2', $text) ?? $text;
        }

        if ($profile === self::PROFILE_ACCESS || $profile === self::PROFILE_UBA) {
            $text = preg_replace('/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/', '$1 $2', $text) ?? $text;
        }

        return trim($text);
    }

    private function mergeTransactionLines(array $lines, string $profile): array
    {
        $rows = [];
        $current = null;

        foreach ($lines as $line) {
            if ($this->isTransactionStartLine($line, $profile)) {
                if ($current !== null) {
                    $rows[] = trim($current);
                }

                $current = $line;

                continue;
            }

            if ($current !== null) {
                $current .= ' '.trim($line);
            }
        }

        if ($current !== null) {
            $rows[] = trim($current);
        }

        return $rows;
    }

    private function extractTransactionFromLine(string $line, string $profile): ?array
    {
        $dateString = null;
        $time = null;
        $rest = null;

        if (preg_match('/^(?<date>\d{4}-\d{2}-\d{2})(?:[T\s]+(?<time>\d{2}:\d{2}(?::\d{2})?))?\s*(?<rest>.*)$/', $line, $isoParts) === 1) {
            $dateString = $isoParts['date'];
            $time = $isoParts['time'] !== '' ? $isoParts['time'] : null;
            $rest = trim($isoParts['rest']);
        } elseif (preg_match('/^(?<date>\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s*(?<rest>.*)$/', $line, $parts) === 1) {
            $dateString = $parts['date'];
            $rest = trim($parts['rest']);
        } elseif (preg_match('/^(?<date>\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(?<time>\d{1,2}:\d{2}(?::\d{2})?))?\s*(?<rest>.*)$/', $line, $slashParts) === 1) {
            $dateString = $slashParts['date'];
            $time = $slashParts['time'] !== '' ? $slashParts['time'] : null;
            $rest = trim($slashParts['rest']);
        }

        if (! $dateString || $rest === null) {
            return null;
        }

        $timestamp = strtotime($dateString);
        if ($timestamp === false) {
            return null;
        }

        preg_match_all(self::AMOUNT_PATTERN, $rest, $amountMatches);
        $amounts = array_map(fn (string $amount) => (float) str_replace(',', '', $amount), $amountMatches[1] ?? []);

        if (count($amounts) < 1) {
            return null;
        }

        $balance = (float) ($amounts[count($amounts) - 1] ?? 0);
        $credit = (float) ($amounts[count($amounts) - 2] ?? 0);
        $debit = (float) ($amounts[count($amounts) - 3] ?? 0);

        $narration = preg_replace(self::AMOUNT_PATTERN, ' ', $rest) ?? $rest;
        $narration = preg_replace('/\s+/', ' ', trim($narration)) ?? trim($narration);

        if ($time === null && preg_match('/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/', $narration, $timeMatch) === 1) {
            $time = $timeMatch[1];
        }

        $action = $debit > 0 ? 'Debit' : 'Credit';
        if ($profile === self::PROFILE_MONIEPOINT && $credit <= 0 && $debit <= 0 && $balance > 0) {
            $action = 'Credit';
        }

        return [
            'date' => date('Y-m-d', $timestamp),
            'time' => $time,
            'narration' => $narration,
            'debit' => round(max(0, $debit), 2),
            'credit' => round(max(0, $credit), 2),
            'balance' => round(max(0, $balance), 2),
            'action' => $action,
        ];
    }

    private function detectProfile(string $rawText): string
    {
        $normalized = Str::lower($rawText);

        if (Str::contains($normalized, ['moniepoint', 'ap_trsf|', 'mfds'])) {
            return self::PROFILE_MONIEPOINT;
        }

        if (Str::contains($normalized, ['access bank', 'access more', 'diamond bank'])) {
            return self::PROFILE_ACCESS;
        }

        if (Str::contains($normalized, ['united bank for africa', 'uba', 'africa\'s global bank'])) {
            return self::PROFILE_UBA;
        }

        return self::PROFILE_GENERIC;
    }

    private function isTransactionStartLine(string $line, string $profile): bool
    {
        $line = trim($line);

        return match ($profile) {
            self::PROFILE_MONIEPOINT => preg_match('/^\d{4}-\d{2}-\d{2}(?:T|\s)\d{2}:\d{2}(?::\d{2})?/', $line) === 1,
            self::PROFILE_ACCESS, self::PROFILE_UBA => preg_match('/^(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{4}-\d{2}-\d{2})/', $line) === 1,
            default => preg_match(self::DATE_PATTERN, $line) === 1,
        };
    }

    private function parseUsingAiFallback(string $rawText): array
    {
        $apiKey = env('AI_PARSER_API_KEY');
        $model = env('AI_PARSER_MODEL', 'gpt-4o-mini');

        if (! $apiKey) {
            return [];
        }

        $prompt = [
            'Extract bank statement transactions from the text below.',
            'Return ONLY valid JSON array. Each item must include: date,time,narration,debit,credit,balance,action.',
            'Use date format YYYY-MM-DD. debit/credit/balance must be numbers.',
            'Text:',
            $rawText,
        ];

        $response = Http::timeout((int) config('dcbs.ai_timeout_seconds', 30))
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a strict financial statement parser.'],
                    ['role' => 'user', 'content' => implode("\n", $prompt)],
                ],
                'temperature' => 0,
            ]);

        if (! $response->successful()) {
            return [];
        }

        $content = $response->json('choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            return [];
        }

        $content = trim($content);
        if (str_starts_with($content, '```')) {
            $content = preg_replace('/^```(?:json)?\s*/', '', $content) ?? $content;
            $content = preg_replace('/\s*```$/', '', $content) ?? $content;
        }

        $decoded = json_decode(trim($content), true);
        if (! is_array($decoded)) {
            return [];
        }

        if (isset($decoded['transactions']) && is_array($decoded['transactions'])) {
            $decoded = $decoded['transactions'];
        }

        $rows = [];

        foreach ($decoded as $row) {
            if (! is_array($row) || empty($row['date']) || ! isset($row['balance'])) {
                continue;
            }

            $rows[] = [
                'date' => (string) $row['date'],
                'time' => isset($row['time']) && $row['time'] !== '' ? (string) $row['time'] : null,
                'narration' => (string) ($row['narration'] ?? ''),
                'debit' => is_numeric($row['debit'] ?? null) ? (float) $row['debit'] : 0.0,
                'credit' => is_numeric($row['credit'] ?? null) ? (float) $row['credit'] : 0.0,
                'balance' => is_numeric($row['balance'] ?? null) ? (float) $row['balance'] : 0.0,
                'action' => (string) ($row['action'] ?? ((float) ($row['debit'] ?? 0) > 0 ? 'Debit' : 'Credit')),
            ];
        }

        return $rows;
    }
}

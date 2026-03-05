<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatementImportService
{
    public function __construct(
        private readonly DailyClosingService $dailyClosingService,
        private readonly BankStatementParser $bankStatementParser,
    ) {
    }

    public function importFromStatement(User $user, string $absoluteFilePath, ?int $bankAccountId = null): array
    {
        ini_set('memory_limit', (string) config('dcbs.statement_memory_limit', '512M'));
        set_time_limit((int) config('dcbs.statement_time_limit_seconds', 300));

        $bankAccount = $this->resolveBankAccount($user, $bankAccountId);
        $rows = $this->parseStatement($absoluteFilePath);

        if (empty($rows)) {
            throw new \RuntimeException('No date detected in statement.');
        }

        $rows = $this->normalizeRows($rows);

        if (empty($rows)) {
            throw new \RuntimeException('No balance column detected in statement.');
        }

        $createdCount = 0;
        $skippedDuplicates = 0;
        $chunkSize = (int) config('dcbs.statement_chunk_size', 500);

        DB::transaction(function () use ($rows, $user, $bankAccount, $chunkSize, &$createdCount, &$skippedDuplicates) {
            foreach (array_chunk($rows, $chunkSize) as $chunk) {
                $existingSignatures = $this->fetchExistingSignatures($user->id, $bankAccount->id, collect($chunk));
                $batch = [];

                foreach ($chunk as $row) {
                    $signature = $this->signatureForRow($row);
                    if (isset($existingSignatures[$signature])) {
                        $skippedDuplicates++;

                        continue;
                    }

                    $batch[] = [
                        'user_id' => $user->id,
                        'bank_account_id' => $bankAccount->id,
                        'transaction_date' => $row['transaction_date'],
                        'narration' => $row['narration'],
                        'debit' => $row['debit'],
                        'credit' => $row['credit'],
                        'balance' => $row['balance'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    $existingSignatures[$signature] = true;
                }

                if (! empty($batch)) {
                    Transaction::query()->insert($batch);
                    $createdCount += count($batch);
                }
            }
        });

        $closingCount = $this->dailyClosingService->recalculateForUserAccount($user->id, $bankAccount->id);

        return [
            'transactions_imported' => $createdCount,
            'duplicates_skipped' => $skippedDuplicates,
            'daily_closings_processed' => $closingCount,
            'bank_account_id' => $bankAccount->id,
        ];
    }

    private function resolveBankAccount(User $user, ?int $bankAccountId): BankAccount
    {
        if ($bankAccountId) {
            return BankAccount::query()
                ->where('id', $bankAccountId)
                ->where('user_id', $user->id)
                ->firstOrFail();
        }

        $defaultAccount = $user->bankAccounts()->where('is_default', true)->first();

        if ($defaultAccount) {
            return $defaultAccount;
        }

        return $user->bankAccounts()->create([
            'bank_name' => 'Primary Account',
            'currency' => config('dcbs.default_currency', 'USD'),
            'is_default' => true,
        ]);
    }

    private function parseStatement(string $filePath): array
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        return match ($extension) {
            'csv', 'txt' => $this->parseCsv($filePath),
            'pdf' => $this->parsePdf($filePath),
            default => throw new \RuntimeException('Unsupported statement format.'),
        };
    }

    private function parsePdf(string $filePath): array
    {
        $parsed = $this->bankStatementParser->parsePdf($filePath);

        return array_map(function (array $row): array {
            $time = $row['time'] ?? null;
            $date = $row['date'];
            $transactionDate = $time ? "{$date} {$time}" : "{$date} 00:00:00";

            return [
                'transaction_date' => date('Y-m-d H:i:s', strtotime($transactionDate) ?: time()),
                'narration' => $row['narration'] ?? 'N/A',
                'debit' => $this->toDecimal($row['debit'] ?? 0) ?? 0.0,
                'credit' => $this->toDecimal($row['credit'] ?? 0) ?? 0.0,
                'balance' => $this->toDecimal($row['balance'] ?? null),
                'action' => $row['action'] ?? (($row['debit'] ?? 0) > 0 ? 'Debit' : 'Credit'),
            ];
        }, $parsed['transactions']);
    }

    private function parseCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'r');

        if (! $handle) {
            throw new \RuntimeException('Unable to open uploaded statement file.');
        }

        $header = fgetcsv($handle);

        if (! $header) {
            fclose($handle);
            throw new \RuntimeException('CSV has no header row.');
        }

        $map = array_map(
            static fn (string $item) => strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $item))),
            $header
        );

        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) < 3) {
                continue;
            }

            $row = [];
            foreach ($map as $index => $key) {
                $row[$key] = $line[$index] ?? null;
            }

            $date = $row['transactiondate'] ?? $row['date'] ?? null;
            $narration = $row['narration'] ?? $row['description'] ?? 'N/A';
            $debit = $this->toDecimal($row['debit'] ?? $row['withdrawal'] ?? null);
            $credit = $this->toDecimal($row['credit'] ?? $row['deposit'] ?? null);
            $balance = $this->toDecimal($row['balance'] ?? $row['closingbalance'] ?? null);

            if (! $date || $balance === null) {
                continue;
            }

            $timestamp = strtotime($date);
            if ($timestamp === false) {
                continue;
            }

            $rows[] = [
                'transaction_date' => date('Y-m-d H:i:s', $timestamp),
                'narration' => $narration,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $balance,
            ];
        }

        fclose($handle);

        return $rows;
    }

    private function normalizeRows(array $rows): array
    {
        $normalized = [];

        foreach ($rows as $row) {
            $balance = $this->toDecimal($row['balance'] ?? null);
            if ($balance === null) {
                continue;
            }

            $debit = $this->toDecimal($row['debit'] ?? 0) ?? 0.0;
            $credit = $this->toDecimal($row['credit'] ?? 0) ?? 0.0;

            if (! is_numeric((string) $debit) || ! is_numeric((string) $credit) || ! is_numeric((string) $balance)) {
                continue;
            }

            $timestamp = strtotime((string) ($row['transaction_date'] ?? ''));
            if ($timestamp === false) {
                continue;
            }

            $normalized[] = [
                'transaction_date' => date('Y-m-d H:i:s', $timestamp),
                'narration' => trim((string) ($row['narration'] ?? 'N/A')),
                'debit' => round((float) $debit, 2),
                'credit' => round((float) $credit, 2),
                'balance' => round((float) $balance, 2),
            ];
        }

        return $normalized;
    }

    private function fetchExistingSignatures(int $userId, int $bankAccountId, Collection $chunk): array
    {
        $minDate = $chunk->min('transaction_date');
        $maxDate = $chunk->max('transaction_date');

        if (! $minDate || ! $maxDate) {
            return [];
        }

        $existing = Transaction::query()
            ->where('user_id', $userId)
            ->where('bank_account_id', $bankAccountId)
            ->whereBetween('transaction_date', [$minDate, $maxDate])
            ->get(['transaction_date', 'narration', 'debit', 'credit', 'balance']);

        $signatures = [];
        foreach ($existing as $row) {
            $signatures[$this->signatureForRow([
                'transaction_date' => $row->transaction_date,
                'narration' => $row->narration,
                'debit' => $row->debit,
                'credit' => $row->credit,
                'balance' => $row->balance,
            ])] = true;
        }

        return $signatures;
    }

    private function signatureForRow(array $row): string
    {
        $amount = ((float) ($row['debit'] ?? 0)) > 0 ? (float) $row['debit'] : (float) ($row['credit'] ?? 0);

        return implode('|', [
            date('Y-m-d H:i:s', strtotime((string) $row['transaction_date']) ?: time()),
            mb_strtolower(trim((string) ($row['narration'] ?? ''))),
            number_format($amount, 2, '.', ''),
            number_format((float) ($row['balance'] ?? 0), 2, '.', ''),
        ]);
    }

    private function toDecimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $normalized = str_replace(',', '', (string) $value);

        return is_numeric($normalized) ? (float) $normalized : null;
    }
}

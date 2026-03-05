<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatementImportService
{
    public function __construct(private readonly DailyClosingService $dailyClosingService)
    {
    }

    public function importFromCsv(User $user, string $absoluteFilePath, ?int $bankAccountId = null): array
    {
        $bankAccount = $this->resolveBankAccount($user, $bankAccountId);
        $rows = $this->parseCsv($absoluteFilePath);

        $createdCount = 0;

        DB::transaction(function () use ($rows, $user, $bankAccount, &$createdCount) {
            foreach ($rows as $row) {
                Transaction::query()->create([
                    'user_id' => $user->id,
                    'bank_account_id' => $bankAccount->id,
                    'transaction_date' => $row['transaction_date'],
                    'narration' => $row['narration'],
                    'debit' => $row['debit'],
                    'credit' => $row['credit'],
                    'balance' => $row['balance'],
                ]);

                $createdCount++;
            }
        });

        $closingCount = $this->dailyClosingService->recalculateForUserAccount($user->id, $bankAccount->id);

        return [
            'transactions_imported' => $createdCount,
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

    private function toDecimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $normalized = str_replace(',', '', (string) $value);

        return is_numeric($normalized) ? (float) $normalized : null;
    }
}

<?php

namespace App\Services;

use App\Models\DailyClosing;
use App\Models\Transaction;
use Carbon\Carbon;

class DailyClosingService
{
    public function recalculateForUserAccount(int $userId, int $bankAccountId): int
    {
        $groupedTransactions = Transaction::query()
            ->where('user_id', $userId)
            ->where('bank_account_id', $bankAccountId)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (Transaction $transaction) => Carbon::parse($transaction->transaction_date)->toDateString());

        $previousClosing = null;
        $processed = 0;

        foreach ($groupedTransactions as $date => $transactions) {
            $lastTransaction = $transactions->last();
            $closingBalance = (float) $lastTransaction->balance;
            $difference = $previousClosing === null ? 0 : $closingBalance - $previousClosing;

            DailyClosing::query()->updateOrCreate(
                [
                    'user_id' => $userId,
                    'bank_account_id' => $bankAccountId,
                    'date' => $date,
                ],
                [
                    'closing_balance' => $closingBalance,
                    'difference' => $difference,
                ]
            );

            $previousClosing = $closingBalance;
            $processed++;
        }

        return $processed;
    }
}

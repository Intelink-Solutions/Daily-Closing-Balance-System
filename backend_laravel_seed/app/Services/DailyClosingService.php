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
            $dateKey = Carbon::parse($date)->startOfDay()->format('Y-m-d H:i:s');
            $firstTransaction = $transactions->first();
            $lastTransaction = $transactions->last();
            $openingBalance = $previousClosing
                ?? ((float) $firstTransaction->balance - (float) $firstTransaction->credit + (float) $firstTransaction->debit);
            $totalCredits = (float) $transactions->sum(fn (Transaction $row) => (float) $row->credit);
            $totalDebits = (float) $transactions->sum(fn (Transaction $row) => (float) $row->debit);
            $closingBalance = (float) $lastTransaction->balance;
            $difference = $closingBalance - $openingBalance;

            $dailyClosing = DailyClosing::query()
                ->withTrashed()
                ->where('user_id', $userId)
                ->where('bank_account_id', $bankAccountId)
                ->whereIn('date', [$date, $dateKey])
                ->first();

            if (! $dailyClosing) {
                $dailyClosing = new DailyClosing();
                $dailyClosing->user_id = $userId;
                $dailyClosing->bank_account_id = $bankAccountId;
            }

            $dailyClosing->date = $dateKey;
            $dailyClosing->opening_balance = $openingBalance;
            $dailyClosing->total_credits = $totalCredits;
            $dailyClosing->total_debits = $totalDebits;
            $dailyClosing->closing_balance = $closingBalance;
            $dailyClosing->difference = $difference;
            $dailyClosing->save();

            if (method_exists($dailyClosing, 'trashed') && $dailyClosing->trashed()) {
                $dailyClosing->restore();
            }

            $previousClosing = $closingBalance;
            $processed++;
        }

        return $processed;
    }
}

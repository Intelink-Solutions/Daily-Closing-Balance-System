<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyClosing;
use App\Models\Transaction;
use App\Support\ApiResponse;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $userId = request()->user()->id;

        $transactions = Transaction::query()
            ->where('user_id', $userId)
            ->orderBy('transaction_date')
            ->get();

        $dailyClosings = DailyClosing::query()
            ->where('user_id', $userId)
            ->orderBy('date')
            ->get();

        $totalCredits = (float) $transactions->sum(fn ($tx) => (float) ($tx->credit ?? 0));
        $totalDebits = (float) $transactions->sum(fn ($tx) => (float) ($tx->debit ?? 0));

        $closingBalance = $dailyClosings->last()?->closing_balance
            ?? $transactions->last()?->balance
            ?? 0;

        $previousClosing = $dailyClosings->count() > 1
            ? $dailyClosings->slice(-2, 1)->first()->closing_balance
            : $closingBalance;

        $trend = $dailyClosings->map(fn ($row) => [
            'date' => $row->date->toDateString(),
            'balance' => (float) $row->closing_balance,
        ])->values();

        $recentClosings = $dailyClosings
            ->sortByDesc('date')
            ->take(6)
            ->map(fn ($row) => [
                'date' => $row->date->toDateString(),
                'closingBalance' => (float) $row->closing_balance,
                'dailyDifference' => (float) $row->difference,
            ])
            ->values();

        return $this->successResponse('Dashboard fetched successfully', [
            'summary' => [
                'totalTransactions' => $transactions->count(),
                'totalCredits' => $totalCredits,
                'totalDebits' => $totalDebits,
                'closingBalance' => (float) $closingBalance,
                'closingBalanceDelta' => (float) $closingBalance - (float) $previousClosing,
            ],
            'trend' => $trend,
            'recentClosings' => $recentClosings,
        ]);
    }
}

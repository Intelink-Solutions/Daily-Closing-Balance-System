<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DailyClosing;
use App\Models\Transaction;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;

class SystemController extends Controller
{
    use ApiResponse;

    public function dashboard()
    {
        $user = request()->user();

        $transactionsQuery = Transaction::query()->where('user_id', $user->id);
        $dailyClosingsQuery = DailyClosing::query()->where('user_id', $user->id);

        if (request()->filled('bank_account_id')) {
            $bankAccountId = request()->integer('bank_account_id');
            $transactionsQuery->where('bank_account_id', $bankAccountId);
            $dailyClosingsQuery->where('bank_account_id', $bankAccountId);
        }

        $transactions = $transactionsQuery
            ->orderBy('transaction_date')
            ->get();

        $dailyClosings = $dailyClosingsQuery
            ->orderBy('date')
            ->get();

        $totalCredits = (float) $transactions->sum('credit');
        $totalDebits = (float) $transactions->sum('debit');
        $closingBalance = $transactions->isNotEmpty() ? (float) $transactions->last()->balance : 0;
        $previousBalance = $transactions->count() > 1 ? (float) $transactions->slice(-2, 1)->first()->balance : $closingBalance;

        $trend = $dailyClosings->map(function (DailyClosing $row) {
            return [
                'date' => $row->date->format('Y-m-d'),
                'balance' => (float) $row->closing_balance,
            ];
        })->values();

        $recentClosings = $dailyClosings
            ->sortByDesc('date')
            ->take(6)
            ->map(function (DailyClosing $row) {
                return [
                    'date' => $row->date->format('Y-m-d'),
                    'closingBalance' => (float) $row->closing_balance,
                    'dailyDifference' => (float) $row->difference,
                ];
            })->values();

        return $this->successResponse('Dashboard fetched successfully', [
            'summary' => [
                'totalTransactions' => $transactions->count(),
                'totalCredits' => $totalCredits,
                'totalDebits' => $totalDebits,
                'closingBalance' => $closingBalance,
                'closingBalanceDelta' => $closingBalance - $previousBalance,
            ],
            'trend' => $trend,
            'recentClosings' => $recentClosings,
        ]);
    }

    public function health()
    {
        try {
            DB::connection()->getPdo();

            return $this->successResponse('API is healthy', [
                'status' => 'ok',
                'database' => 'connected',
                'timestamp' => now(),
            ]);
        } catch (\Throwable $exception) {
            return $this->errorResponse('Health check failed', 500, [
                'status' => 'error',
                'database' => 'disconnected',
                'timestamp' => now(),
            ]);
        }
    }

    public function diagnostics()
    {
        return $this->successResponse('Diagnostics fetched successfully', [
            'transactions_count' => Transaction::query()->count(),
            'daily_closings_count' => DailyClosing::query()->count(),
            'audit_logs_count' => AuditLog::query()->count(),
            'failed_jobs_count' => DB::table('failed_jobs')->count(),
            'jobs_pending_count' => DB::table('jobs')->count(),
            'timestamp' => now(),
        ]);
    }
}

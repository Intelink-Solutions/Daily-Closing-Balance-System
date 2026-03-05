<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\TransactionIndexRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\AuditLogService;
use App\Services\DailyClosingService;
use App\Support\ApiResponse;

class TransactionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly DailyClosingService $dailyClosingService,
        private readonly AuditLogService $auditLogService
    ) {
    }

    public function index(TransactionIndexRequest $request)
    {
        $query = Transaction::query()->where('user_id', $request->user()->id);

        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->integer('bank_account_id'));
        }

        if ($request->filled('search')) {
            $query->where('narration', 'like', '%'.$request->string('search')->toString().'%');
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date('date_to'));
        }

        $transactions = $query
            ->orderByDesc('transaction_date')
            ->paginate($request->integer('per_page', 20));

        return $this->successResponse('Transactions fetched successfully', [
            'items' => TransactionResource::collection($transactions->items()),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function destroy(Transaction $transaction)
    {
        $user = request()->user();

        if ($transaction->user_id !== $user->id && ! $user->isAdmin()) {
            return $this->errorResponse('Forbidden', 403);
        }

        try {
            $bankAccountId = $transaction->bank_account_id;
            $transaction->delete();

            $this->dailyClosingService->recalculateForUserAccount($user->id, $bankAccountId);

            $this->auditLogService->log(
                user: $user,
                action: 'transaction.deleted',
                auditableType: Transaction::class,
                auditableId: $transaction->id,
                payload: ['bank_account_id' => $bankAccountId],
                request: request()
            );

            return $this->successResponse('Transaction deleted successfully');
        } catch (\Throwable $exception) {
            return $this->errorResponse($exception->getMessage(), 500);
        }
    }
}

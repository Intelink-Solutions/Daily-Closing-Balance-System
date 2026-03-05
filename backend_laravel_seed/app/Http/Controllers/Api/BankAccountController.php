<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BankAccount\StoreBankAccountRequest;
use App\Http\Requests\BankAccount\UpdateBankAccountRequest;
use App\Http\Resources\BankAccountResource;
use App\Models\BankAccount;
use App\Services\AuditLogService;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;

class BankAccountController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function index()
    {
        $accounts = BankAccount::query()
            ->where('user_id', request()->user()->id)
            ->orderByDesc('is_default')
            ->latest()
            ->get();

        return $this->successResponse('Bank accounts fetched successfully', BankAccountResource::collection($accounts));
    }

    public function store(StoreBankAccountRequest $request)
    {
        $user = $request->user();

        $account = DB::transaction(function () use ($request, $user) {
            if ($request->boolean('is_default')) {
                BankAccount::query()->where('user_id', $user->id)->update(['is_default' => false]);
            }

            return BankAccount::query()->create([
                'user_id' => $user->id,
                'bank_name' => $request->string('bank_name')->toString(),
                'account_name' => $request->input('account_name'),
                'account_number' => $request->input('account_number'),
                'currency' => $request->input('currency', config('dcbs.default_currency', 'USD')),
                'is_default' => $request->boolean('is_default'),
            ]);
        });

        $this->auditLogService->log(
            user: $user,
            action: 'bank_account.created',
            auditableType: BankAccount::class,
            auditableId: $account->id,
            payload: $account->toArray(),
            request: $request,
        );

        return $this->successResponse('Bank account created successfully', new BankAccountResource($account), 201);
    }

    public function update(UpdateBankAccountRequest $request, BankAccount $bankAccount)
    {
        $user = $request->user();

        if ($bankAccount->user_id !== $user->id && ! $user->isAdmin()) {
            return $this->errorResponse('Forbidden', 403);
        }

        DB::transaction(function () use ($request, $user, $bankAccount) {
            if ($request->has('is_default') && $request->boolean('is_default')) {
                BankAccount::query()->where('user_id', $user->id)->update(['is_default' => false]);
            }

            $bankAccount->update($request->validated());
        });

        $this->auditLogService->log(
            user: $user,
            action: 'bank_account.updated',
            auditableType: BankAccount::class,
            auditableId: $bankAccount->id,
            payload: $bankAccount->fresh()?->toArray(),
            request: $request,
        );

        return $this->successResponse('Bank account updated successfully', new BankAccountResource($bankAccount->fresh()));
    }

    public function destroy(BankAccount $bankAccount)
    {
        $user = request()->user();

        if ($bankAccount->user_id !== $user->id && ! $user->isAdmin()) {
            return $this->errorResponse('Forbidden', 403);
        }

        if ($bankAccount->is_default) {
            return $this->errorResponse('Default account cannot be deleted. Set another default account first.', 422);
        }

        $bankAccount->delete();

        $this->auditLogService->log(
            user: $user,
            action: 'bank_account.deleted',
            auditableType: BankAccount::class,
            auditableId: $bankAccount->id,
            payload: null,
            request: request(),
        );

        return $this->successResponse('Bank account deleted successfully');
    }
}

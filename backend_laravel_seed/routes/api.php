<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\DailyClosingController;
use App\Http\Controllers\Api\StatementController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\BankAccountController;
use Illuminate\Support\Facades\Route;

$authGuard = config('dcbs.auth_guard', 'sanctum');

Route::middleware('throttle:60,1')->group(function () use ($authGuard) {
    Route::get('/health', [SystemController::class, 'health']);

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware("auth:{$authGuard}")->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard', [SystemController::class, 'dashboard']);

        Route::middleware('role:admin')->group(function () {
            Route::get('/admin/users', [AdminUserController::class, 'index']);
            Route::patch('/admin/users/{user}/role', [AdminUserController::class, 'updateRole']);
            Route::get('/admin/diagnostics', [SystemController::class, 'diagnostics']);
        });

        Route::post('/statements/upload', [StatementController::class, 'upload']);
        Route::post('/statements/diagnostics', [StatementController::class, 'diagnostics']);

        Route::get('/bank-accounts', [BankAccountController::class, 'index']);
        Route::post('/bank-accounts', [BankAccountController::class, 'store']);
        Route::patch('/bank-accounts/{bankAccount}', [BankAccountController::class, 'update']);
        Route::delete('/bank-accounts/{bankAccount}', [BankAccountController::class, 'destroy']);

        Route::get('/transactions', [TransactionController::class, 'index']);
        Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy']);

        Route::get('/daily-closings', [DailyClosingController::class, 'index']);
    });
});

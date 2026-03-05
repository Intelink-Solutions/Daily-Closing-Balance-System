<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('bank_accounts')) {
            Schema::create('bank_accounts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('bank_name');
                $table->string('account_name')->nullable();
                $table->string('account_number')->nullable();
                $table->string('currency', 10)->default('USD');
                $table->boolean('is_default')->default(false);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['user_id', 'is_default']);
            });
        }

        if (! Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('bank_account_id')->constrained('bank_accounts')->cascadeOnDelete();
                $table->dateTime('transaction_date');
                $table->text('narration');
                $table->decimal('debit', 20, 2)->default(0);
                $table->decimal('credit', 20, 2)->default(0);
                $table->decimal('balance', 20, 2);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['user_id', 'bank_account_id', 'transaction_date']);
            });
        }

        if (! Schema::hasTable('daily_closings')) {
            Schema::create('daily_closings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('bank_account_id')->constrained('bank_accounts')->cascadeOnDelete();
                $table->date('date');
                $table->decimal('opening_balance', 20, 2)->default(0);
                $table->decimal('total_credits', 20, 2)->default(0);
                $table->decimal('total_debits', 20, 2)->default(0);
                $table->decimal('closing_balance', 20, 2);
                $table->decimal('difference', 20, 2)->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['user_id', 'bank_account_id', 'date'], 'daily_closing_unique_per_day');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('daily_closings')) {
            Schema::drop('daily_closings');
        }

        if (Schema::hasTable('transactions')) {
            Schema::drop('transactions');
        }

        if (Schema::hasTable('bank_accounts')) {
            Schema::drop('bank_accounts');
        }
    }
};

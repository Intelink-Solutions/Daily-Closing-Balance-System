<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('daily_closings')) {
            return;
        }

        Schema::table('daily_closings', function (Blueprint $table): void {
            if (! Schema::hasColumn('daily_closings', 'opening_balance')) {
                $table->decimal('opening_balance', 20, 2)->default(0)->after('date');
            }

            if (! Schema::hasColumn('daily_closings', 'total_credits')) {
                $table->decimal('total_credits', 20, 2)->default(0)->after('opening_balance');
            }

            if (! Schema::hasColumn('daily_closings', 'total_debits')) {
                $table->decimal('total_debits', 20, 2)->default(0)->after('total_credits');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('daily_closings')) {
            return;
        }

        Schema::table('daily_closings', function (Blueprint $table): void {
            if (Schema::hasColumn('daily_closings', 'total_debits')) {
                $table->dropColumn('total_debits');
            }

            if (Schema::hasColumn('daily_closings', 'total_credits')) {
                $table->dropColumn('total_credits');
            }

            if (Schema::hasColumn('daily_closings', 'opening_balance')) {
                $table->dropColumn('opening_balance');
            }
        });
    }
};

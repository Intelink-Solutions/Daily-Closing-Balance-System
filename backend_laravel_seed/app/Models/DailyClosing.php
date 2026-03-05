<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailyClosing extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'bank_account_id',
        'date',
        'opening_balance',
        'total_credits',
        'total_debits',
        'closing_balance',
        'difference',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'opening_balance' => 'decimal:2',
            'total_credits' => 'decimal:2',
            'total_debits' => 'decimal:2',
            'closing_balance' => 'decimal:2',
            'difference' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }
}

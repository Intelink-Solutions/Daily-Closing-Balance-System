<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'bank_account_id' => $this->bank_account_id,
            'transaction_date' => $this->transaction_date,
            'narration' => $this->narration,
            'debit' => $this->debit,
            'credit' => $this->credit,
            'balance' => $this->balance,
            'created_at' => $this->created_at,
        ];
    }
}

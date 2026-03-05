<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyClosingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'bank_account_id' => $this->bank_account_id,
            'date' => $this->date,
            'opening_balance' => $this->opening_balance,
            'total_credits' => $this->total_credits,
            'total_debits' => $this->total_debits,
            'closing_balance' => $this->closing_balance,
            'difference' => $this->difference,
            'created_at' => $this->created_at,
        ];
    }
}

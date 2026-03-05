<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DailyClosingResource;
use App\Models\DailyClosing;
use App\Support\ApiResponse;

class DailyClosingController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $query = DailyClosing::query()->where('user_id', request()->user()->id);

        if (request()->filled('bank_account_id')) {
            $query->where('bank_account_id', request()->integer('bank_account_id'));
        }

        if (request()->filled('date_from')) {
            $query->whereDate('date', '>=', request()->date('date_from'));
        }

        if (request()->filled('date_to')) {
            $query->whereDate('date', '<=', request()->date('date_to'));
        }

        $rows = $query->orderByDesc('date')->get();

        return $this->successResponse('Daily closings fetched successfully', DailyClosingResource::collection($rows));
    }
}

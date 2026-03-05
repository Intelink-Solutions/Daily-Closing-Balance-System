<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Statement\UploadStatementRequest;
use App\Jobs\ProcessStatementImport;
use App\Services\AuditLogService;
use App\Services\StatementImportService;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class StatementController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly StatementImportService $statementImportService,
    ) {
    }

    public function upload(UploadStatementRequest $request)
    {
        try {
            $path = $request->file('file')->store('statements');
            $absolutePath = Storage::path($path);

            $rowCount = $this->estimateRowCount($absolutePath);
            $maxSyncRows = (int) config('dcbs.statement_max_rows_sync', 1000);

            if ($rowCount <= $maxSyncRows) {
                $result = $this->statementImportService->importFromCsv(
                    user: $request->user(),
                    absoluteFilePath: $absolutePath,
                    bankAccountId: $request->integer('bank_account_id') ?: null,
                );

                $this->auditLogService->log(
                    user: $request->user(),
                    action: 'statement.uploaded.sync',
                    auditableType: 'statement',
                    auditableId: null,
                    payload: ['path' => $path, 'rows' => $rowCount] + $result,
                    request: $request
                );

                return $this->successResponse('Statement processed successfully', [
                    'transactionsSaved' => $result['transactions_imported'] ?? 0,
                    'dailyClosingDays' => $result['daily_closings_processed'] ?? 0,
                    'path' => $path,
                    'queued' => false,
                ]);
            }

            ProcessStatementImport::dispatch(
                userId: $request->user()->id,
                absoluteFilePath: $absolutePath,
                bankAccountId: $request->integer('bank_account_id') ?: null,
            )->onQueue('statement-imports');

            $this->auditLogService->log(
                user: $request->user(),
                action: 'statement.uploaded',
                auditableType: 'statement',
                auditableId: null,
                payload: ['path' => $path],
                request: $request
            );

            return $this->successResponse('Statement uploaded successfully. Processing started.', [
                'transactionsSaved' => 0,
                'dailyClosingDays' => 0,
                'path' => $path,
                'queued' => true,
            ], 202);
        } catch (\Throwable $exception) {
            return $this->errorResponse($exception->getMessage(), 500);
        }
    }

    private function estimateRowCount(string $absolutePath): int
    {
        $file = new \SplFileObject($absolutePath, 'r');
        $file->seek(PHP_INT_MAX);

        return max(0, $file->key());
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Statement\DiagnoseStatementRequest;
use App\Http\Requests\Statement\UploadStatementRequest;
use App\Jobs\ProcessStatementImport;
use App\Notifications\StatementProcessedNotification;
use App\Services\AuditLogService;
use App\Services\BankStatementParser;
use App\Services\StatementImportService;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class StatementController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly StatementImportService $statementImportService,
        private readonly BankStatementParser $bankStatementParser,
    ) {
    }

    public function upload(UploadStatementRequest $request)
    {
        try {
            $path = $request->file('file')->store('statements');
            $absolutePath = Storage::path($path);

            $fileSizeKb = (int) ceil((filesize($absolutePath) ?: 0) / 1024);
            $maxSyncFileKb = (int) config('dcbs.statement_max_sync_file_kb', 2048);
            $processSync = $fileSizeKb <= $maxSyncFileKb;

            if ($processSync) {
                $result = $this->statementImportService->importFromStatement(
                    user: $request->user(),
                    absoluteFilePath: $absolutePath,
                    bankAccountId: $request->integer('bank_account_id') ?: null,
                );

                $this->auditLogService->log(
                    user: $request->user(),
                    action: 'statement.uploaded.sync',
                    auditableType: 'statement',
                    auditableId: null,
                    payload: ['path' => $path, 'size_kb' => $fileSizeKb] + $result,
                    request: $request
                );

                $request->user()->notify(new StatementProcessedNotification(
                    transactionsImported: (int) ($result['transactions_imported'] ?? 0),
                    dailyClosingsProcessed: (int) ($result['daily_closings_processed'] ?? 0),
                    queued: false,
                ));

                return $this->successResponse('Statement processed successfully', [
                    'transactionsSaved' => $result['transactions_imported'] ?? 0,
                    'duplicatesSkipped' => $result['duplicates_skipped'] ?? 0,
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

            $request->user()->notify(new StatementProcessedNotification(
                transactionsImported: 0,
                dailyClosingsProcessed: 0,
                queued: true,
            ));

            return $this->successResponse('Statement uploaded successfully. Processing started.', [
                'transactionsSaved' => 0,
                'dailyClosingDays' => 0,
                'path' => $path,
                'queued' => true,
            ], 202);
        } catch (\Illuminate\Validation\ValidationException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        } catch (\RuntimeException $exception) {
            $message = $exception->getMessage();
            $status = str_contains(strtolower($message), 'corrupt') ? 422 : 400;

            return $this->errorResponse($message, $status);
        } catch (\Throwable $exception) {
            return $this->errorResponse($exception->getMessage(), 500);
        }
    }

    public function diagnostics(DiagnoseStatementRequest $request)
    {
        $path = $request->file('file')->store('statements');
        $absolutePath = Storage::path($path);

        try {
            $result = $this->bankStatementParser->parsePdf($absolutePath);
            $sampleSize = $request->integer('sample_size', 5);
            $sampleRows = array_slice($result['transactions'] ?? [], 0, $sampleSize);

            $warnings = [];
            if (empty($result['transactions'])) {
                $warnings[] = 'No transactions parsed from statement text.';
            }

            if (! collect($result['transactions'] ?? [])->contains(fn (array $row) => (float) ($row['balance'] ?? 0) > 0)) {
                $warnings[] = 'No balance values detected in parsed transactions.';
            }

            return $this->successResponse('Statement diagnostics generated successfully', [
                'profile' => $result['profile'] ?? 'generic',
                'transactionsParsed' => count($result['transactions'] ?? []),
                'sampleRows' => $sampleRows,
                'warnings' => $warnings,
            ]);
        } catch (\RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), 400);
        } catch (\Throwable $exception) {
            return $this->errorResponse($exception->getMessage(), 500);
        } finally {
            Storage::delete($path);
        }
    }
}

<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\AuditLogService;
use App\Services\StatementImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessStatementImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function __construct(
        public int $userId,
        public string $absoluteFilePath,
        public ?int $bankAccountId = null
    ) {
    }

    public function handle(StatementImportService $statementImportService, AuditLogService $auditLogService): void
    {
        $user = User::query()->findOrFail($this->userId);

        $result = $statementImportService->importFromCsv(
            user: $user,
            absoluteFilePath: $this->absoluteFilePath,
            bankAccountId: $this->bankAccountId
        );

        $auditLogService->log(
            user: $user,
            action: 'statement.import.processed',
            auditableType: 'statement',
            auditableId: null,
            payload: $result,
        );
    }
}

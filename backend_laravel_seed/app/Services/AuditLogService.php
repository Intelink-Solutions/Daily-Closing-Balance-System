<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AuditLogService
{
    public function log(
        ?User $user,
        string $action,
        ?string $auditableType = null,
        ?int $auditableId = null,
        ?array $payload = null,
        ?Request $request = null
    ): void {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        try {
            AuditLog::create([
                'user_id' => $user?->id,
                'action' => $action,
                'auditable_type' => $auditableType,
                'auditable_id' => $auditableId,
                'payload' => $payload,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
            ]);
        } catch (\Throwable) {
            return;
        }
    }
}

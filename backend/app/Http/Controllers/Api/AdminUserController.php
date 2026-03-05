<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateUserRoleRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\ApiResponse;

class AdminUserController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function index()
    {
        $users = User::query()->latest()->paginate(20);

        return $this->successResponse('Users fetched successfully', [
            'items' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user)
    {
        $oldRole = $user->role;
        $newRole = $request->string('role')->toString();

        $user->update(['role' => $newRole]);

        $this->auditLogService->log(
            user: $request->user(),
            action: 'user.role.updated',
            auditableType: User::class,
            auditableId: $user->id,
            payload: ['old_role' => $oldRole, 'new_role' => $newRole],
            request: $request,
        );

        return $this->successResponse('User role updated successfully', new UserResource($user));
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function register(RegisterRequest $request)
    {
        $user = User::query()->create([
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
            'role' => 'user',
        ]);

        $token = $this->createAccessToken($user);

        $this->auditLogService->log($user, 'auth.register', User::class, $user->id, null, $request);

        return $this->successResponse('Registration successful', [
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $user = User::query()->where('email', $request->string('email')->toString())->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            return $this->errorResponse('Invalid credentials', 401);
        }

        $token = $this->createAccessToken($user);

        $this->auditLogService->log($user, 'auth.login', User::class, $user->id, null, $request);

        return $this->successResponse('Login successful', [
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if (method_exists($request->user(), 'token') && $request->user()->token()) {
            $request->user()->token()->revoke();
        } elseif (method_exists($request->user(), 'currentAccessToken')) {
            $request->user()->currentAccessToken()?->delete();
        }

        $this->auditLogService->log($user, 'auth.logout', User::class, $user?->id, null, $request);

        return $this->successResponse('Logout successful');
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $status = Password::sendResetLink([
            'email' => $request->string('email')->toString(),
        ]);

        if ($status !== Password::RESET_LINK_SENT) {
            return $this->errorResponse(__($status), 422);
        }

        return $this->successResponse('Password reset link sent successfully');
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $status = Password::reset(
            [
                'email' => $request->string('email')->toString(),
                'password' => $request->string('password')->toString(),
                'password_confirmation' => $request->string('password_confirmation')->toString(),
                'token' => $request->string('token')->toString(),
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                if (method_exists($user, 'tokens') && Schema::hasTable('personal_access_tokens')) {
                    DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->delete();
                }
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return $this->errorResponse(__($status), 422);
        }

        return $this->successResponse('Password has been reset successfully');
    }

    private function createAccessToken(User $user): string
    {
        $tokenResult = $user->createToken('api-token');

        if (isset($tokenResult->plainTextToken)) {
            return $tokenResult->plainTextToken;
        }

        if (isset($tokenResult->accessToken)) {
            return $tokenResult->accessToken;
        }

        throw new \RuntimeException('Unable to create API token using configured auth package.');
    }
}

<?php

use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        $middleware->throttleApi('60,1');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Throwable $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($exception instanceof ValidationException) {
                return new JsonResponse([
                    'success' => false,
                    'message' => $exception->getMessage(),
                    'data' => [
                        'errors' => $exception->errors(),
                    ],
                ], 422);
            }

            if ($exception instanceof AuthenticationException) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                    'data' => null,
                ], 401);
            }

            if ($exception instanceof AccessDeniedHttpException) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Forbidden.',
                    'data' => null,
                ], 403);
            }

            if ($exception instanceof NotFoundHttpException) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Resource not found.',
                    'data' => null,
                ], 404);
            }

            if ($exception instanceof ThrottleRequestsException) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Too many requests. Please try again later.',
                    'data' => null,
                ], 429);
            }

            $status = $exception instanceof HttpExceptionInterface
                ? $exception->getStatusCode()
                : 500;

            return new JsonResponse([
                'success' => false,
                'message' => $exception->getMessage() ?: 'Server error',
                'data' => null,
            ], $status);
        });
    })->create();

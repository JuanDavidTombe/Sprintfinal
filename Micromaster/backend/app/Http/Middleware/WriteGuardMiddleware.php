<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WriteGuardMiddleware
{
    protected const WRITE_ACTIONS = [
        'POST' => 'create',
        'PUT' => 'update',
        'PATCH' => 'update',
        'DELETE' => 'delete',
    ];

    protected const EXEMPT_PREFIXES = ['auth/logout', 'profile', 'reports/reconcile-order', 'reports/inventory-snapshots'];

    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('sanctum')->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        $action = self::WRITE_ACTIONS[strtoupper($request->method())] ?? null;

        if ($action === null || $this->isExempt($request->path())) {
            return $next($request);
        }

        if (! in_array($action, $user->role_permissions['can'] ?? [], true)) {
            return response()->json([
                'error' => '403 Forbidden',
                'message' => "El rol {$user->role} no tiene permiso '{$action}' para esta operación.",
                'role' => $user->role,
                'required_permission' => $action,
            ], 403);
        }

        return $next($request);
    }

    private function isExempt(string $path): bool
    {
        $path = preg_replace('#^api(/|$)#', '', $path);

        foreach (self::EXEMPT_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return true;
            }
        }

        return false;
    }
}

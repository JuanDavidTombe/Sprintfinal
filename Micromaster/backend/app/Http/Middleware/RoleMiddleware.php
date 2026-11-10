<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    // Control de registro y roles: verifica que el usuario tenga sesion activa por token Sanctum y que su rol tenga permiso en la ruta
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = Auth::guard('sanctum')->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if (! in_array($user->role, $roles)) {
            return response()->json(['error' => '403 Forbidden: Insufficient permissions'], 403);
        }

        return $next($request);
    }
}

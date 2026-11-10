<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ModulePermissionMiddleware
{
    public function handle(Request $request, Closure $next, string $module, string $mode = 'full')
    {
        $user = Auth::guard('sanctum')->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        $allowed = $mode === 'read'
            ? $user->hasReadModuleAccess($module)
            : $user->hasModuleAccess($module);

        if (! $allowed) {
            return response()->json([
                'error' => '403 Forbidden',
                'message' => "Module access denied: {$module}",
            ], 403);
        }

        return $next($request);
    }
}

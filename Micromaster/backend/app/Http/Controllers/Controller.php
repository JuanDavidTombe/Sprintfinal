<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Auth;

class Controller extends BaseController
{
    // Control de registro y roles: funciones base que heredan los controladores para comprobar el rol y los permisos del modulo antes de responder el JSON
    protected function checkRole(string ...$roles): bool
    {
        $user = Auth::guard('sanctum')->user();
        if (! $user) return false;
        return in_array($user->role, $roles);
    }

    protected function checkModule(string $module): bool
    {
        $user = Auth::guard('sanctum')->user();
        if (! $user) return false;
        return $user->hasModuleAccess($module);
    }

    protected function forbidden(): \Illuminate\Http\JsonResponse
    {
        return response()->json(['error' => '403 Forbidden: Insufficient permissions'], 403);
    }
}

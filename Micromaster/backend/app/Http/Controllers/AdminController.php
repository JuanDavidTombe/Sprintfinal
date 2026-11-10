<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\User;
use App\Models\Batch;
use App\Models\FloorWaste;
use App\Models\Order;
use App\Models\Ingredient;
use App\Models\Route as DeliveryRoute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    // Llenado de CRUDs (index / indexUsers - Listar): consulta todos los usuarios registrados y sus estados para mostrarlos en el panel del administrador
    public function indexUsers(Request $request)
    {
        $users = User::query()
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => $this->serializeUser($u));

        return response()->json([
            'users' => $users,
            'roles' => $this->roleCatalog(),
            'total' => $users->count(),
            'active' => $users->where('status', User::STATUS_ACTIVE)->where('is_active', true)->count(),
            'inactive' => $users->where('status', User::STATUS_ACTIVE)->where('is_active', false)->count(),
            'pending' => $users->where('status', User::STATUS_PENDING)->count(),
            'rejected' => $users->where('status', User::STATUS_REJECTED)->count(),
        ]);
    }

    // Llenado de CRUDs (store / storeUser - Crear): permite al administrador crear un usuario directamente activo con su rol asignado
    public function storeUser(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:150|unique:users,email',
            'password' => 'required|string|min:6|max:60',
            'role' => 'required|string|in:' . implode(',', $this->roleCatalogKeys()),
            'phone' => 'nullable|string|max:40',
            'vehicle' => 'nullable|string|max:60',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'vehicle' => $data['vehicle'] ?? null,
            'status' => User::STATUS_ACTIVE,
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'user' => $this->serializeUser($user),
        ], 201);
    }

    // Llenado de CRUDs (update / updateUser - Actualizar): permite editar los datos o cambiar el rol de un usuario y devuelve el JSON actualizado
    public function updateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'email' => 'sometimes|required|email|max:150|unique:users,email,' . $user->id,
            'role' => 'sometimes|required|string|in:' . implode(',', $this->roleCatalogKeys()),
            'password' => 'nullable|string|min:6|max:60',
            'phone' => 'nullable|string|max:40',
            'vehicle' => 'nullable|string|max:60',
        ]);

        $payload = array_intersect_key($data, array_flip(['name', 'email', 'role', 'phone', 'vehicle']));

        if (! empty($data['password'])) {
            $payload['password'] = Hash::make($data['password']);
        }

        if ($user->id === $request->user()->id && isset($payload['role']) && $payload['role'] !== User::ROLE_ADMINISTRADOR) {
            return response()->json(['message' => 'No puedes cambiar tu propio rol de administrador'], 422);
        }

        $user->update($payload);

        return response()->json([
            'message' => 'Usuario actualizado correctamente',
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    public function toggleUserStatus(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes desactivar tu propia cuenta'], 422);
        }

        if ($user->isPending()) {
            return response()->json([
                'message' => 'Esta cuenta está pendiente de aprobación: apruébala o recházala primero.',
            ], 422);
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        if (! $user->is_active) {
            DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->delete();
        }

        return response()->json([
            'message' => $user->is_active ? 'Usuario reactivado' : 'Usuario inactivado',
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    // Control de registro y roles: lista los usuarios que se registraron y estan en estado PENDING esperando aprobacion del administrador
    public function pendingUsers()
    {
        $users = User::query()
            ->where('status', User::STATUS_PENDING)
            ->orderBy('created_at')
            ->get()
            ->map(fn (User $u) => $this->serializeUser($u));

        return response()->json([
            'users' => $users,
            'pending' => $users->count(),
        ]);
    }

    // Control de registro y roles: aprueba un usuario pendiente, activa su cuenta con el rol autorizado y devuelve confirmacion en JSON
    public function approveUser(Request $request, User $user)
    {
        if (! $user->isPending()) {
            return response()->json([
                'message' => "Esta solicitud ya fue resuelta (estado: {$user->status_label}).",
            ], 422);
        }

        $data = $request->validate([
            'role' => 'nullable|string|in:' . implode(',', $this->roleCatalogKeys()),
        ]);

        $user->update([
            'status' => User::STATUS_ACTIVE,
            'is_active' => true,
            'role' => $data['role'] ?? $user->requested_role ?: $user->role,
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
            'rejection_reason' => null,
        ]);

        return response()->json([
            'message' => "Usuario aprobado. {$user->name} ya puede iniciar sesión como {$user->fresh()->role_label}.",
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    // Control de registro y roles: rechaza la solicitud de un usuario pendiente, revoca cualquier token y devuelve confirmacion en JSON
    public function rejectUser(Request $request, User $user)
    {
        if (! $user->isPending()) {
            return response()->json([
                'message' => "Esta solicitud ya fue resuelta (estado: {$user->status_label}).",
            ], 422);
        }

        $data = $request->validate([
            'reason' => 'nullable|string|max:200',
        ]);

        $user->update([
            'status' => User::STATUS_REJECTED,
            'is_active' => false,
            'rejection_reason' => $data['reason'] ?? null,
        ]);

        DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->delete();

        return response()->json([
            'message' => "Solicitud de {$user->name} rechazada.",
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    public function showCompany()
    {
        $company = CompanySetting::current();

        return response()->json([
            'company' => [
                'company_name' => $company->company_name,
                'tax_id' => $company->tax_id,
                'warehouse_address' => $company->warehouse_address,
                'phone' => $company->phone,
                'email' => $company->email,
                'latitude' => $company->latitude,
                'longitude' => $company->longitude,
            ],
            'system' => [
                'version' => $company->version,
                'environment' => $company->environment,
                'database' => 'MySQL (XAMPP)',
                'backend' => 'Laravel 10 + Sanctum',
                'frontend' => 'React + Vite + Tailwind CSS',
                'auth' => 'Bearer Token (Sanctum)',
                'server' => 'Apache / XAMPP',
            ],
        ]);
    }

    public function updateCompany(Request $request)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:150',
            'tax_id' => 'nullable|string|max:60',
            'warehouse_address' => 'required|string|max:200',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:150',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $company = CompanySetting::current();
        $company->update($data);

        return response()->json([
            'message' => 'Perfil de la empresa actualizado correctamente',
            'company' => $company->fresh()->only([
                'company_name', 'tax_id', 'warehouse_address', 'phone', 'email', 'latitude', 'longitude',
            ]),
        ]);
    }

    public function financialDashboard(Request $request)
    {
        $cashInStreet = (float) Order::whereIn('status', ['in_transit', 'assigned', 'delivered'])
            ->sum('amount');
        if ($cashInStreet <= 0) {
            $cashInStreet = (float) Order::sum('amount');
        }

        $inventoryValue = (float) Batch::join('ingredients', 'batches.ingredient_id', '=', 'ingredients.id')
            ->sum(DB::raw('batches.quantity * ingredients.cost_per_unit'));
        if ($inventoryValue <= 0) {
            $inventoryValue = 48500000.00;
        }

        $dailyWasteCost = (float) FloorWaste::whereDate('created_at', now()->toDateString())->sum('total_cost');
        if ($dailyWasteCost <= 0) {
            $dailyWasteCost = (float) FloorWaste::sum('total_cost');
            if ($dailyWasteCost <= 0) {
                $dailyWasteCost = 156000.00;
            }
        }

        $pendingApprovals = $this->getApprovalsWithPendingUsers();
        $pendingCount = count(array_filter($pendingApprovals, fn ($a) => ($a['status'] ?? 'PENDING') === 'PENDING'));
        $pendingUsersCount = User::where('status', User::STATUS_PENDING)->count();

        $alerts = $this->getCriticalAlertsData();
        $criticalCount = count(array_filter($alerts, fn ($a) => empty($a['dismissed'])));

        return response()->json([
            'kpis' => [
                'cash_in_street' => round($cashInStreet, 2),
                'inventory_value' => round($inventoryValue, 2),
                'daily_waste_cost' => round($dailyWasteCost, 2),
            ],
            'summary' => [
                'pending_approvals_count' => $pendingCount,
                'pending_users_count' => $pendingUsersCount,
                'critical_alerts_count' => $criticalCount,
                'currency' => 'COP',
                'updated_at' => now()->toIso8601String(),
            ],
        ]);
    }

    public function approvals(Request $request)
    {
        $allApprovals = $this->getApprovalsWithPendingUsers();
        $approvals = $allApprovals;
        $filter = $request->query('status');

        if ($filter && $filter !== 'all') {
            $approvals = array_values(array_filter($approvals, fn ($a) => ($a['status'] ?? 'PENDING') === $filter));
        }

        return response()->json([
            'approvals' => $approvals,
            'pending_count' => count(array_filter($allApprovals, fn ($a) => ($a['status'] ?? 'PENDING') === 'PENDING')),
        ]);
    }

    public function actionApproval(Request $request, $id)
    {
        $action = $request->input('action');
        $comment = $request->input('comment', '');

        if (!in_array($action, ['approve', 'reject'])) {
            return response()->json(['error' => 'Acción inválida. Debe ser approve o reject.'], 422);
        }

        if (str_starts_with((string) $id, 'user-')) {
            $userId = (int) substr((string) $id, 5);
            $targetUser = User::find($userId);
            if (!$targetUser) {
                return response()->json(['error' => 'Usuario pendiente no encontrado.'], 404);
            }

            if ($action === 'approve') {
                $targetUser->update([
                    'status' => User::STATUS_ACTIVE,
                    'is_active' => true,
                    'role' => $targetUser->requested_role ?: $targetUser->role,
                    'approved_at' => now(),
                    'approved_by' => $request->user()->id,
                    'rejection_reason' => null,
                ]);
            } else {
                $targetUser->update([
                    'status' => User::STATUS_REJECTED,
                    'is_active' => false,
                    'rejection_reason' => $comment ?: 'Rechazado desde Centro de Aprobaciones',
                ]);
                DB::table('personal_access_tokens')->where('tokenable_id', $targetUser->id)->delete();
            }

            $fresh = $targetUser->fresh();
            $mapped = $this->mapUserToApprovalItem($fresh);

            return response()->json([
                'message' => $action === 'approve'
                    ? "Personal autorizado: {$fresh->name} ya puede iniciar sesión."
                    : "Solicitud de {$fresh->name} rechazada.",
                'approval' => $mapped,
            ]);
        }

        $approvals = $this->getApprovalsData();
        $found = null;

        foreach ($approvals as &$item) {
            if ((string) $item['id'] === (string) $id) {
                $item['status'] = $action === 'approve' ? 'APPROVED' : 'REJECTED';
                $item['status_label'] = $action === 'approve' ? 'Autorizado' : 'Rechazado';
                $item['reviewed_at'] = now()->toIso8601String();
                $item['reviewed_by'] = $request->user()->name ?? 'Administrador';
                $item['admin_comment'] = $comment;
                $found = $item;
                break;
            }
        }

        if (!$found) {
            return response()->json(['error' => 'Solicitud de aprobación no encontrada.'], 404);
        }

        $this->saveApprovalsData($approvals);

        return response()->json([
            'message' => $action === 'approve' ? 'Solicitud autorizada correctamente' : 'Solicitud rechazada',
            'approval' => $found,
        ]);
    }

    private function getApprovalsWithPendingUsers(): array
    {
        $baseApprovals = $this->getApprovalsData();

        $userRequests = User::where(function ($q) {
            $q->where('status', User::STATUS_PENDING)
              ->orWhereNotNull('requested_role');
        })
        ->orderByDesc('created_at')
        ->get()
        ->map(fn (User $u) => $this->mapUserToApprovalItem($u))
        ->all();

        return array_merge($userRequests, $baseApprovals);
    }

    private function mapUserToApprovalItem(User $u): array
    {
        $roleKey = $u->requested_role ?: $u->role;
        $roleLabel = (new User(['role' => $roleKey]))->role_label;

        $mappedStatus = match ($u->status) {
            User::STATUS_PENDING => 'PENDING',
            User::STATUS_REJECTED => 'REJECTED',
            default => 'APPROVED',
        };

        $mappedStatusLabel = match ($mappedStatus) {
            'PENDING' => 'Pendiente de Autorización',
            'REJECTED' => 'Rechazado',
            default => 'Autorizado',
        };

        return [
            'id' => 'user-' . $u->id,
            'event_type' => 'USER_REGISTRATION',
            'title' => "Alta de Personal: {$u->name}",
            'description' => "Solicitud de acceso al sistema MicroMaster como {$roleLabel}.",
            'requester_name' => $u->name,
            'requester_role' => $roleLabel,
            'amount' => 0.00,
            'target_client' => $u->email,
            'details' => "Documento: " . ($u->identity_document ?: 'N/A') . " | Tel: " . ($u->phone ?: 'N/A') . " | Correo: {$u->email}",
            'severity' => 'HIGH',
            'status' => $mappedStatus,
            'status_label' => $mappedStatusLabel,
            'created_at' => ($u->created_at ?? now())->toIso8601String(),
            'reviewed_at' => $u->approved_at?->toIso8601String(),
            'reviewed_by' => 'Administrador',
        ];
    }

    private function getApprovalsData(): array
    {
        $path = storage_path('app/admin_approvals.json');
        if (file_exists($path)) {
            $content = file_get_contents($path);
            $decoded = json_decode($content, true);
            if (is_array($decoded)) return $decoded;
        }

        $seed = [
            [
                'id' => 'app-1',
                'event_type' => 'CREDIT_LIMIT_EXCEEDED',
                'title' => 'Exceso de Cupo de Crédito',
                'description' => 'Cliente Distribuidora El Éxito solicita despacho a crédito superando el límite asignado.',
                'requester_name' => 'María Camila Palechor',
                'requester_role' => 'Operario Logístico',
                'amount' => 145000.00,
                'target_client' => 'Distribuidora El Éxito',
                'details' => 'Cupo disponible: $500.000 | Total pedido: $645.000 | Exceso: $145.000 (Supera margen de $100.000)',
                'severity' => 'HIGH',
                'status' => 'PENDING',
                'status_label' => 'Pendiente de Autorización',
                'created_at' => now()->subMinutes(14)->toIso8601String(),
            ],
            [
                'id' => 'app-2',
                'event_type' => 'HIGH_VALUE_WASTE',
                'title' => 'Baja de Mercancía de Alto Valor',
                'description' => 'Intento de registro de merma por deterioro de insumo en planta.',
                'requester_name' => 'Kevin Jesus Millan',
                'requester_role' => 'Supervisor de Producción',
                'amount' => 84000.00,
                'target_client' => 'Planta Principal - Lote #LT-7821',
                'details' => '18 kg Harina de Trigo Especial por $84.000. Requiere autorización por superar el umbral de $50.000.',
                'severity' => 'MEDIUM',
                'status' => 'PENDING',
                'status_label' => 'Pendiente de Autorización',
                'created_at' => now()->subMinutes(42)->toIso8601String(),
            ],
            [
                'id' => 'app-3',
                'event_type' => 'INVOICE_CANCELLATION',
                'title' => 'Anulación de Factura en Calle',
                'description' => 'El transportista solicita cancelar factura completa #104 en destino.',
                'requester_name' => 'Andrés Rivas Castañeda',
                'requester_role' => 'Transportista (Camión JKP 482)',
                'amount' => 245000.00,
                'target_client' => 'Tiendas Don Lucho',
                'details' => 'Cliente cerrado por remodelación no avisada. Conductor solicita anular entrega y reingresar stock.',
                'severity' => 'CRITICAL',
                'status' => 'PENDING',
                'status_label' => 'Pendiente de Autorización',
                'created_at' => now()->subMinutes(65)->toIso8601String(),
            ],
        ];

        $this->saveApprovalsData($seed);
        return $seed;
    }

    private function saveApprovalsData(array $data): void
    {
        $path = storage_path('app/admin_approvals.json');
        @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function criticalAlerts(Request $request)
    {
        $alerts = $this->getCriticalAlertsData();
        return response()->json([
            'alerts' => $alerts,
            'active_count' => count(array_filter($alerts, fn ($a) => empty($a['dismissed']))),
        ]);
    }

    public function dismissCriticalAlert(Request $request, $id)
    {
        $alerts = $this->getCriticalAlertsData();
        $found = null;

        foreach ($alerts as &$item) {
            if ((string) $item['id'] === (string) $id) {
                $item['dismissed'] = true;
                $item['dismissed_at'] = now()->toIso8601String();
                $found = $item;
                break;
            }
        }

        $this->saveCriticalAlertsData($alerts);

        return response()->json([
            'message' => 'Alerta marcada como atendida',
            'alert' => $found,
        ]);
    }

    private function getCriticalAlertsData(): array
    {
        $path = storage_path('app/admin_critical_alerts.json');
        if (file_exists($path)) {
            $content = file_get_contents($path);
            $decoded = json_decode($content, true);
            if (is_array($decoded)) return $decoded;
        }

        $seed = [
            [
                'id' => 'alt-1',
                'type' => 'ROUTE_CRITICAL_DELAY',
                'title' => 'Ruta Sur-01 con 48% de Retraso',
                'message' => 'La ruta completa supera el 40% de retraso previsto (tiempo estimado: 140 min vs 210 min transcurridos). Riesgo inminente de clientes caídos.',
                'severity' => 'CRITICAL',
                'category' => 'LOGÍSTICA MACRO',
                'affected_entity' => 'Ruta RUTA-SUR-01 (4 clientes en riesgo)',
                'trigger_reason' => 'Vía bloqueada por manifestación en sector San Juan + falla mecánica reportada.',
                'created_at' => now()->subMinutes(18)->toIso8601String(),
                'dismissed' => false,
            ],
            [
                'id' => 'alt-2',
                'type' => 'VITAL_STOCK_DEPLETED',
                'title' => 'Quiebre de Stock: Harina de Trigo Especial',
                'message' => 'El stock de insumo vital para producción llegó a CERO (0 kg en bodega). 2 órdenes de producción detenidas.',
                'severity' => 'EMERGENCY',
                'category' => 'PRODUCCIÓN',
                'affected_entity' => 'Insumo #101 - Harina de Trigo Especial',
                'trigger_reason' => 'Consumo acelerado del turno matutino y retraso en despacho del proveedor Harinera del Valle.',
                'created_at' => now()->subMinutes(35)->toIso8601String(),
                'dismissed' => false,
            ],
            [
                'id' => 'alt-3',
                'type' => 'SANITARY_QUARANTINE',
                'title' => 'Alerta Sanitaria / Cuarentena Automática',
                'message' => 'Se reportó el lote #LT-8492 de Levadura Fresca en cuarentena automática preventiva por inconformidad microbiológica.',
                'severity' => 'CRITICAL',
                'category' => 'CALIDAD & SANITARIA',
                'affected_entity' => 'Lote #LT-8492 (350 kg bloqueados)',
                'trigger_reason' => 'Ruptura de cadena de frío en transporte del proveedor antes del ingreso a bodega.',
                'created_at' => now()->subHours(2)->toIso8601String(),
                'dismissed' => false,
            ],
        ];

        $this->saveCriticalAlertsData($seed);
        return $seed;
    }

    private function saveCriticalAlertsData(array $data): void
    {
        $path = storage_path('app/admin_critical_alerts.json');
        @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'identity_document' => $user->identity_document,
            'role' => $user->role,
            'role_label' => $user->role_label,
            'role_permissions' => $user->role_permissions,
            'requested_role' => $user->requested_role,
            'requested_role_label' => $user->requested_role
                ? (new User(['role' => $user->requested_role]))->role_label
                : null,
            'status' => $user->status ?: User::STATUS_ACTIVE,
            'status_label' => $user->status_label,
            'phone' => $user->phone,
            'vehicle' => $user->vehicle,
            'is_active' => (bool) $user->is_active,
            'approved_at' => $user->approved_at?->toIso8601String(),
            'rejection_reason' => $user->rejection_reason,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    private function roleCatalogKeys(): array
    {
        return array_keys(User::ROLE_PERMISSIONS);
    }

    private function roleCatalog(): array
    {
        return collect(User::ROLE_PERMISSIONS)
            ->map(fn (array $perms, string $key) => [
                'value' => $key,
                'label' => (new User(['role' => $key]))->role_label,
                'modules' => $perms['modules'] ?? [],
                'read_modules' => $perms['read_modules'] ?? [],
                'can' => $perms['can'] ?? [],
            ])
            ->values()
            ->all();
    }
}
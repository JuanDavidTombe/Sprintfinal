<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LogisticsController;
use App\Http\Controllers\MicroCostController;
use App\Http\Controllers\MicroStockController;
use App\Http\Controllers\MicroDeliveryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WarehouseController;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\ModulePermissionMiddleware;

// Control de registro y roles: rutas publicas para registrar usuarios (quedan en espera de aprobacion) e iniciar sesion generando el token Sanctum
Route::post('/auth/register', [AuthController::class, 'register'])
    ->middleware('throttle:10,1')
    ->name('api.v1.auth.register');

Route::post('/auth/login', [AuthController::class, 'login'])
    ->name('api.v1.auth.login');

// Control de registro y roles: grupo protegido por auth:sanctum que verifica que cada peticion traiga un token valido antes de devolver el JSON
Route::middleware(['auth:sanctum', 'write.guard'])->group(function () {

    // Control de registro y roles: consulta del usuario autenticado, cierre de sesion y gestion de su perfil
    Route::get('/user', function (Request $request) {
        return $request->user();
    })->name('api.v1.user');

    Route::get('/auth/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');

    Route::get('/profile', [ProfileController::class, 'show'])->name('api.v1.profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('api.v1.profile.put');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('api.v1.profile.update');
    Route::post('/profile/photo', [ProfileController::class, 'uploadPhoto'])->name('api.v1.profile.photo.store');
    Route::get('/profile/photo', [ProfileController::class, 'photo'])->name('api.v1.profile.photo.show');
    Route::delete('/profile/photo', [ProfileController::class, 'deletePhoto'])->name('api.v1.profile.photo.destroy');
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword'])->name('api.v1.profile.password');
    Route::patch('/profile/preferences', [ProfileController::class, 'updatePreferences'])->name('api.v1.profile.preferences');
    Route::delete('/profile/sessions', [ProfileController::class, 'revokeSessions'])->name('api.v1.profile.sessions.destroy');

    // Comunicacion de peticiones (Dashboard): consulta general de indicadores y retorna un JSON al cliente
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('api.v1.dashboard.index');

    // Llenado de CRUDs (Pedidos - OrderController): estructura index, store, show, update y destroy igual que en adminSena
    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,OPERARIO_LOGISTICO,TRANSPORTISTA')->group(function () {
        Route::get('/orders', [OrderController::class, 'index'])->name('api.v1.orders.index');
        Route::get('/orders/{id}', [OrderController::class, 'show'])->name('api.v1.orders.show');
    });

    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,OPERARIO_LOGISTICO')->group(function () {
        Route::post('/orders', [OrderController::class, 'store'])->name('api.v1.orders.store');
        Route::put('/orders/{id}', [OrderController::class, 'update'])->name('api.v1.orders.put');
        Route::patch('/orders/{id}', [OrderController::class, 'update'])->name('api.v1.orders.update');
        Route::delete('/orders/{id}', [OrderController::class, 'destroy'])->name('api.v1.orders.destroy');
        Route::post('/orders/bulk-release', [OrderController::class, 'bulkRelease'])->name('api.v1.orders.bulk-release');
        Route::post('/orders/simulate-intake', [OrderController::class, 'simulateIntake'])->name('api.v1.orders.simulate-intake');
    });

    // Llenado de CRUDs (Inventario y Lotes - MicroStockController): consulta de lotes, registro de entradas, cruce de ordenes y salidas
    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,OPERARIO_LOGISTICO,SUPERVISOR_PRODUCCION,CONTADOR')->group(function () {
        Route::get('/stock/batches', [MicroStockController::class, 'index'])->name('api.v1.batches.index');
        Route::get('/inventory/summary', [MicroStockController::class, 'inventorySummary'])->name('api.v1.inventory.summary');
        Route::get('/stock/alerts', [MicroStockController::class, 'alerts'])->name('api.v1.stock.alerts');
        Route::get('/stock/ingredients', [MicroStockController::class, 'ingredientStock'])->name('api.v1.stock.ingredients');
        Route::get('/stock/purchase-orders', [MicroStockController::class, 'purchaseOrdersList'])->name('api.v1.purchase-orders.index');
        Route::get('/stock/purchase-orders/{code}', [MicroStockController::class, 'purchaseOrder'])->name('api.v1.purchase-orders.show');
        Route::get('/stock/movements', [MicroStockController::class, 'movements'])->name('api.v1.stock.movements');
    });

    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,OPERARIO_LOGISTICO')->group(function () {
        Route::post('/stock/batches', [MicroStockController::class, 'store'])->name('api.v1.batches.store');
        Route::patch('/stock/batches/{id}/block', [MicroStockController::class, 'block'])->name('api.v1.batches.block');
        Route::post('/stock/entry', [MicroStockController::class, 'entry'])->name('api.v1.stock.entry');
        Route::post('/stock/reception-match', [MicroStockController::class, 'receptionMatch'])->name('api.v1.stock.reception-match');
        Route::post('/stock/exit', [MicroStockController::class, 'exit'])->name('api.v1.stock.exit');
        Route::post('/stock/qr-scan', [MicroStockController::class, 'qrScan'])->name('api.v1.stock.qr-scan');

        // Comunicacion de peticiones (Bodega Movil - WarehouseController): rutas para picking FEFO, recepcion en muelle y auditoria
        Route::get('/warehouse/hub', [WarehouseController::class, 'hub'])->name('api.v1.warehouse.hub');
        Route::get('/warehouse/picking/approved-orders', [WarehouseController::class, 'approvedOrders'])->name('api.v1.warehouse.approved-orders');
        Route::post('/warehouse/picking/complete-order', [WarehouseController::class, 'completeOrderPicking'])->name('api.v1.warehouse.complete-order');
        Route::get('/warehouse/picking-routes', [WarehouseController::class, 'pickingRoutes'])->name('api.v1.warehouse.picking-routes');
        Route::post('/warehouse/picking/verify-scan', [WarehouseController::class, 'verifyPickingScan'])->name('api.v1.warehouse.verify-scan');
        Route::post('/warehouse/picking/confirm-quantity', [WarehouseController::class, 'confirmPickingQuantity'])->name('api.v1.warehouse.confirm-quantity');
        Route::get('/warehouse/reception/orders', [WarehouseController::class, 'receptionOrders'])->name('api.v1.warehouse.reception.orders');
        Route::post('/warehouse/reception/weigh', [WarehouseController::class, 'recordReceptionWeigh'])->name('api.v1.warehouse.reception.weigh');
        Route::post('/warehouse/reception/finish', [WarehouseController::class, 'finishReception'])->name('api.v1.warehouse.reception.finish');
        Route::get('/warehouse/audit/lookup', [WarehouseController::class, 'auditLookup'])->name('api.v1.warehouse.audit.lookup');
        Route::post('/warehouse/audit/adjust', [WarehouseController::class, 'auditAdjust'])->name('api.v1.warehouse.audit.adjust');
        Route::get('/warehouse/audit/zones', [WarehouseController::class, 'auditZones'])->name('api.v1.warehouse.audit.zones');
        Route::get('/warehouse/audit/plan', [WarehouseController::class, 'auditPlan'])->name('api.v1.warehouse.audit.plan');
        Route::post('/warehouse/audit/confirm-batch', [WarehouseController::class, 'confirmBatch'])->name('api.v1.warehouse.audit.confirm-batch');
        Route::post('/warehouse/audit/adjust-batch', [WarehouseController::class, 'adjustBatch'])->name('api.v1.warehouse.audit.adjust-batch');
        Route::post('/warehouse/audit/register-unlisted', [WarehouseController::class, 'registerUnlisted'])->name('api.v1.warehouse.audit.register-unlisted');
        Route::post('/warehouse/audit/finalize-zone', [WarehouseController::class, 'finalizeZone'])->name('api.v1.warehouse.audit.finalize-zone');
    });

    // Llenado de CRUDs (Recetas y Produccion - MicroCostController): listado, creacion, edicion y eliminacion de recetas y tandas
    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,SUPERVISOR_PRODUCCION')->group(function () {
        Route::get('/cost/recipes', [MicroCostController::class, 'recipes'])->name('api.v1.recipes.index');
        Route::post('/cost/recipes', [MicroCostController::class, 'storeRecipe'])->name('api.v1.recipes.store');
        Route::get('/cost/recipes/{id}/stock-check', [MicroCostController::class, 'stockCheck'])->name('api.v1.recipes.show');
        Route::put('/cost/recipes/{id}', [MicroCostController::class, 'updateRecipe'])->name('api.v1.recipes.put');
        Route::patch('/cost/recipes/{id}', [MicroCostController::class, 'updateRecipe'])->name('api.v1.recipes.update');
        Route::delete('/cost/recipes/{id}', [MicroCostController::class, 'destroyRecipe'])->name('api.v1.recipes.destroy');

        Route::get('/cost/ingredients', [MicroCostController::class, 'ingredients'])->name('api.v1.cost.ingredients');
        Route::post('/cost/simulate-scale', [MicroCostController::class, 'simulateScale'])->name('api.v1.cost.simulate-scale');

        Route::get('/cost/production-orders', [MicroCostController::class, 'productionOrders'])->name('api.v1.production-orders.index');
        Route::post('/cost/production-orders', [MicroCostController::class, 'createProductionOrder'])->name('api.v1.production-orders.store');
        Route::get('/cost/production-orders/{id}', [MicroCostController::class, 'showProductionOrder'])->name('api.v1.production-orders.show');
        Route::post('/cost/production-orders/{id}/close', [MicroCostController::class, 'closeProductionOrder'])->name('api.v1.production-orders.close');

        Route::get('/cost/floor-waste', [MicroCostController::class, 'getFloorWastes'])->name('api.v1.floor-waste.index');
        Route::post('/cost/floor-waste', [MicroCostController::class, 'storeFloorWaste'])->name('api.v1.floor-waste.store');
    });

    // Llenado de CRUDs (Rutas y Entregas - LogisticsController / MicroDeliveryController): consulta, creacion y actualizacion de rutas y entregas
    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,OPERARIO_LOGISTICO,TRANSPORTISTA')->group(function () {
        Route::get('/delivery/routes', [LogisticsController::class, 'routes'])->name('api.v1.routes.index');
        Route::get('/delivery/routes/{id}', [LogisticsController::class, 'routeDetail'])->name('api.v1.routes.show');
        Route::get('/delivery/orders', [MicroDeliveryController::class, 'orders'])->name('api.v1.delivery.orders');
        Route::get('/delivery/incidents', [LogisticsController::class, 'incidents'])->name('api.v1.incidents.index');
        Route::post('/delivery/incidents', [LogisticsController::class, 'storeIncident'])->name('api.v1.incidents.store');
        Route::post('/delivery/location', [LogisticsController::class, 'sendLocation'])->name('api.v1.delivery.location');
        Route::post('/delivery/verify-otp', [MicroDeliveryController::class, 'verifyOtp'])->name('api.v1.delivery.verify-otp');
        Route::patch('/delivery/update-payment', [MicroDeliveryController::class, 'updatePayment'])->name('api.v1.delivery.update-payment');
        Route::post('/delivery/complete-payment', [MicroDeliveryController::class, 'completePayment'])->name('api.v1.delivery.complete-payment');
    });

    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR,OPERARIO_LOGISTICO')->group(function () {
        Route::post('/delivery/routes', [LogisticsController::class, 'storeRoute'])->name('api.v1.routes.store');
        Route::put('/delivery/routes/{id}', [LogisticsController::class, 'updateRoute'])->name('api.v1.routes.put');
        Route::patch('/delivery/routes/{id}', [LogisticsController::class, 'updateRoute'])->name('api.v1.routes.update');
        Route::get('/delivery/drivers', [LogisticsController::class, 'drivers'])->name('api.v1.drivers.index');
        Route::patch('/delivery/incidents/{id}', [LogisticsController::class, 'updateIncident'])->name('api.v1.incidents.update');
    });

    // Comunicacion de peticiones (Reportes Contables - ReportController): consultas financieras y descargas en JSON/Excel
    Route::middleware(ModulePermissionMiddleware::class.':reports_simulations')->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('api.v1.reports.index');
        Route::get('/reports/financial-kpis', [ReportController::class, 'financialKpis'])->name('api.v1.reports.financial-kpis');
        Route::get('/reports/inventory-valuation', [ReportController::class, 'inventoryValuation'])->name('api.v1.reports.inventory-valuation');
        Route::post('/reports/inventory-snapshots', [ReportController::class, 'closeInventorySnapshot'])->name('api.v1.reports.inventory-snapshots');
        Route::get('/reports/bank-reconciliation', [ReportController::class, 'bankReconciliation'])->name('api.v1.reports.bank-reconciliation');
        Route::post('/reports/reconcile-order/{id}', [ReportController::class, 'reconcileOrder'])->name('api.v1.reports.reconcile-order');
        Route::get('/reports/export-filtered', [ReportController::class, 'exportFiltered'])->name('api.v1.reports.export-filtered');
        Route::get('/reports/costs', [ReportController::class, 'costs'])->name('api.v1.reports.costs');
        Route::get('/reports/stock', [ReportController::class, 'stock'])->name('api.v1.reports.stock');
        Route::get('/reports/orders', [ReportController::class, 'orders'])->name('api.v1.reports.orders');
        Route::get('/reports/download', [ReportController::class, 'download'])->name('api.v1.reports.download');
    });

    // Control de registro y roles + Llenado de CRUDs (Usuarios y Empresa - AdminController): gestion de usuarios y aprobaciones
    Route::middleware(RoleMiddleware::class.':ADMINISTRADOR')->group(function () {
        Route::get('/settings/users', [AdminController::class, 'indexUsers'])->name('api.v1.users.index');
        Route::post('/settings/users', [AdminController::class, 'storeUser'])->name('api.v1.users.store');
        Route::put('/settings/users/{user}', [AdminController::class, 'updateUser'])->name('api.v1.users.put');
        Route::patch('/settings/users/{user}', [AdminController::class, 'updateUser'])->name('api.v1.users.update');
        Route::patch('/settings/users/{user}/status', [AdminController::class, 'toggleUserStatus'])->name('api.v1.users.status');

        Route::get('/admin/pending-users', [AdminController::class, 'pendingUsers'])->name('api.v1.admin.pending-users');
        Route::post('/admin/users/{user}/approve', [AdminController::class, 'approveUser'])->name('api.v1.admin.users.approve');
        Route::post('/admin/users/{user}/reject', [AdminController::class, 'rejectUser'])->name('api.v1.admin.users.reject');

        Route::get('/settings/company', [AdminController::class, 'showCompany'])->name('api.v1.company.show');
        Route::put('/settings/company', [AdminController::class, 'updateCompany'])->name('api.v1.company.put');
        Route::patch('/settings/company', [AdminController::class, 'updateCompany'])->name('api.v1.company.update');

        Route::get('/admin/dashboard', [AdminController::class, 'financialDashboard'])->name('api.v1.admin.dashboard');
        Route::get('/admin/approvals', [AdminController::class, 'approvals'])->name('api.v1.admin.approvals');
        Route::post('/admin/approvals/{id}/action', [AdminController::class, 'actionApproval'])->name('api.v1.admin.approvals.action');
        Route::get('/admin/critical-alerts', [AdminController::class, 'criticalAlerts'])->name('api.v1.admin.critical-alerts');
        Route::patch('/admin/critical-alerts/{id}/dismiss', [AdminController::class, 'dismissCriticalAlert'])->name('api.v1.admin.critical-alerts.dismiss');
    });
});

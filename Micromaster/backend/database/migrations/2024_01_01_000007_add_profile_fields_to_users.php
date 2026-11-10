<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('identity_document')->nullable()->after('name');
            $table->string('employee_code')->nullable()->unique()->after('identity_document');

            $table->string('warehouse_site')->nullable()->after('employee_code');
            $table->string('shift_schedule')->nullable()->after('warehouse_site');
            $table->string('supervisor_name')->nullable()->after('shift_schedule');

            $table->boolean('two_factor_enabled')->default(false)->after('supervisor_name');
            $table->string('two_factor_method')->nullable()->after('two_factor_enabled');

            $table->string('locale', 5)->default('es')->after('two_factor_method');
            $table->string('theme', 10)->default('light')->after('locale');
            $table->boolean('notify_email')->default(true)->after('theme');
            $table->boolean('notify_push')->default(true)->after('notify_email');
            $table->boolean('notify_sound')->default(true)->after('notify_push');
        });

        $defaults = [
            'ADMINISTRADOR' => ['Bodega Central - Popayán', 'Turno Mañana: 06:00 - 14:00', 'Directorio Ejecutivo'],
            'OPERARIO_LOGISTICO' => ['Bodega Central - Popayán', 'Turno Mañana: 06:00 - 14:00', 'Juan David Tombe'],
            'SUPERVISOR_PRODUCCION' => ['Planta de Producción - Popayán', 'Turno Mañana: 06:00 - 14:00', 'Juan David Tombe'],
            'CONTADOR' => ['Oficina Administrativa - Popayán', 'Turno Oficina: 08:00 - 17:00', 'Juan David Tombe'],
            'TRANSPORTISTA' => ['Bodega Central - Popayán', 'Turno Ruta: 06:00 - 16:00', 'María Camila Palechor'],
        ];

        foreach ($defaults as $role => [$site, $shift, $boss]) {
            DB::table('users')->where('role', $role)->update([
                'warehouse_site' => $site,
                'shift_schedule' => $shift,
                'supervisor_name' => $boss,
            ]);
        }

        DB::table('users')->whereNull('employee_code')->orWhere('employee_code', '')->update([
            'employee_code' => DB::raw("CONCAT('EMP-', LPAD(id, 3, '0'))"),
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['employee_code']);
            $table->dropColumn([
                'identity_document',
                'employee_code',
                'warehouse_site',
                'shift_schedule',
                'supervisor_name',
                'two_factor_enabled',
                'two_factor_method',
                'locale',
                'theme',
                'notify_email',
                'notify_push',
                'notify_sound',
            ]);
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->string('supplier_name')->nullable()->after('batch_code');

            $table->string('qr_code_hash')->unique()->nullable()->after('supplier_name');

            $table->decimal('initial_quantity', 10, 4)->nullable()->after('quantity');
        });

        DB::table('batches')->whereNull('initial_quantity')
            ->update(['initial_quantity' => DB::raw('quantity')]);
    }

    public function down(): void
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->dropUnique(['qr_code_hash']);
            $table->dropColumn(['supplier_name', 'qr_code_hash', 'initial_quantity']);
        });
    }
};

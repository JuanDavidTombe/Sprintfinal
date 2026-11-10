<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory;

    // Llenado de CRUDs: campos permitidos para ordenes de compra de proveedores en la tabla purchase_orders
    protected $fillable = [
        'code',
        'supplier_name',
        'expected_date',
        'status',
    ];

    // Relaciones del modelo (hasMany): una orden de compra contiene varios insumos esperados
    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    protected $casts = [
        'expected_date' => 'date',
    ];
}

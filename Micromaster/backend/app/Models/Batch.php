<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    use HasFactory;

    // Llenado de CRUDs: campos permitidos para crear y actualizar lotes de inventario en la tabla batches
    protected $fillable = [
        'ingredient_id',
        'batch_code',
        'supplier_name',
        'storage_zone',
        'qr_code_hash',
        'quantity',
        'initial_quantity',
        'expiration_date',
        'status',
        'is_quarantined',
        'quarantine_reason',
        'quality_status',
        'purchase_order_code',
        'received_at',
    ];

    // Relaciones del modelo (belongsTo): cada lote pertenece a un insumo de la tabla ingredients
    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }

    protected $casts = [
        'quantity' => 'decimal:4',
        'initial_quantity' => 'decimal:4',
        'expiration_date' => 'date',
        'received_at' => 'datetime',
        'is_quarantined' => 'boolean',
    ];

    protected $appends = [
        'status_color',
        'days_to_expire',
        'remaining_percentage',
        'unit_cost',
        'total_value',
    ];

    public function getUnitCostAttribute(): float
    {
        return (float) ($this->ingredient?->cost_per_unit ?? 0);
    }

    public function getTotalValueAttribute(): float
    {
        $cost = (float) ($this->ingredient?->cost_per_unit ?? 0);
        return round((float) $this->quantity * $cost, 2);
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'critical' => '#FF0000',
            'warning' => '#F09163',
            default => '#CCFF00',
        };
    }

    public function getDaysToExpireAttribute(): int
    {
        return (int) now()->diffInDays($this->expiration_date, false);
    }

    public function getRemainingPercentageAttribute(): float
    {
        $initial = (float) $this->initial_quantity;

        return $initial > 0 ? round(((float) $this->quantity / $initial) * 100, 1) : 100.0;
    }

    public static function fefoStatusFor($expirationDate): string
    {
        $days = (int) now()->diffInDays($expirationDate, false);

        if ($days < 0) {
            return 'critical';
        }

        return $days <= 7 ? 'warning' : 'optimal';
    }
}

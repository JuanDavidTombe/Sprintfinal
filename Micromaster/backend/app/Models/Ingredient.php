<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ingredient extends Model
{
    use HasFactory;

    // Llenado de CRUDs: campos permitidos para crear y actualizar insumos en la tabla ingredients
    protected $fillable = [
        'name',
        'unit',
        'cost_per_unit',
        'min_stock',
        'is_variable_weight',
    ];

    // Relaciones del modelo (hasMany): un insumo tiene muchos lotes en bodega y participa en varias recetas
    public function batches()
    {
        return $this->hasMany(Batch::class);
    }

    public function recipeIngredients()
    {
        return $this->hasMany(RecipeIngredient::class);
    }

    protected $casts = [
        'cost_per_unit' => 'decimal:2',
        'min_stock' => 'decimal:4',
        'is_variable_weight' => 'boolean',
    ];
}

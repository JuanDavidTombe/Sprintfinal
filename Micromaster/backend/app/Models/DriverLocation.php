<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverLocation extends Model
{
    protected $table = 'driver_locations';

    protected $fillable = [
        'driver_id',
        'latitude',
        'longitude',
        'speed_kmh',
        'heading',
        'recorded_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'speed_kmh' => 'decimal:2',
        'heading' => 'decimal:2',
        'recorded_at' => 'datetime',
    ];

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function ageSeconds(): int
    {
        return (int) $this->recorded_at->diffInSeconds(now());
    }

    public function signal(): string
    {
        $age = $this->ageSeconds();

        if ($age <= 30) {
            return 'live';
        }

        return $age <= 120 ? 'weak' : 'stale';
    }
}

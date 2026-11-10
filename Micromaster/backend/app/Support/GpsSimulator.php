<?php

namespace App\Support;

class GpsSimulator
{
    private const EARTH_KM = 6371.0;

    private const SECONDS_PER_LEG = 90;

    public static function position(array $path, float $phase): ?array
    {
        $path = array_values(array_filter($path, fn($p) => isset($p['latitude'], $p['longitude'])));

        if (count($path) === 0) {
            return null;
        }

        $phase = max(0.0, min(1.0, $phase));

        if (count($path) === 1) {
            return [
                'latitude' => (float) $path[0]['latitude'],
                'longitude' => (float) $path[0]['longitude'],
                'heading' => 0.0,
                'leg_index' => 0,
                'leg_progress' => 1.0,
            ];
        }

        $segments = [];
        $total = 0.0;

        for ($i = 0; $i < count($path) - 1; $i++) {
            $len = self::distanceKm($path[$i], $path[$i + 1]);
            $segments[$i] = $len;
            $total += $len;
        }

        if ($total <= 0.0) {
            return [
                'latitude' => (float) $path[0]['latitude'],
                'longitude' => (float) $path[0]['longitude'],
                'heading' => 0.0,
                'leg_index' => 0,
                'leg_progress' => 0.0,
            ];
        }

        $target = $phase * $total;
        $acc = 0.0;

        foreach ($segments as $i => $len) {
            if ($acc + $len >= $target || $i === count($segments) - 1) {
                $ratio = $len > 0 ? min(1.0, max(0.0, ($target - $acc) / $len)) : 1.0;
                $a = $path[$i];
                $b = $path[$i + 1];

                return [
                    'latitude' => (float) ($a['latitude'] + ($b['latitude'] - $a['latitude']) * $ratio),
                    'longitude' => (float) ($a['longitude'] + ($b['longitude'] - $a['longitude']) * $ratio),
                    'heading' => self::bearing($a, $b),
                    'leg_index' => $i,
                    'leg_progress' => round($ratio, 3),
                ];
            }

            $acc += $len;
        }

        return null;
    }

    public static function phase(?int $driverId, int $stopCount = 6): float
    {
        $period = self::periodSeconds($stopCount);
        $offset = abs(($driverId ?? 0) * 37) % $period;

        return ((now()->getTimestamp() + $offset) % $period) / $period;
    }

    public static function periodSeconds(int $stopCount): int
    {
        return max(1, $stopCount) * self::SECONDS_PER_LEG;
    }

    public static function distanceKm(array $a, array $b): float
    {
        $lat1 = deg2rad((float) $a['latitude']);
        $lon1 = deg2rad((float) $a['longitude']);
        $lat2 = deg2rad((float) $b['latitude']);
        $lon2 = deg2rad((float) $b['longitude']);

        $dLat = $lat2 - $lat1;
        $dLon = $lon2 - $lon1;

        $h = sin($dLat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($dLon / 2) ** 2;

        return 2 * self::EARTH_KM * asin(min(1.0, sqrt($h)));
    }

    public static function bearing(array $a, array $b): float
    {
        $lat1 = deg2rad((float) $a['latitude']);
        $lat2 = deg2rad((float) $b['latitude']);
        $dLon = deg2rad((float) $b['longitude'] - (float) $a['longitude']);

        $y = sin($dLon) * cos($lat2);
        $x = cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($dLon);

        return round(rad2deg(atan2($y, $x)) + 360) % 360;
    }
}

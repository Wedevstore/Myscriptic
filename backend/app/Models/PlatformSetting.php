<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public static function get(string $key, ?string $default = null): ?string
    {
        $row = static::query()->find($key);

        return $row?->value ?? $default;
    }

    public static function set(string $key, string $value): void
    {
        static::query()->updateOrInsert(['key' => $key], ['value' => $value, 'updated_at' => now(), 'created_at' => now()]);
    }
}

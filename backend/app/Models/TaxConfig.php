<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxConfig extends Model
{
    protected $fillable = ['name', 'rate', 'is_enabled', 'country_code'];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'is_enabled' => 'boolean',
        ];
    }
}

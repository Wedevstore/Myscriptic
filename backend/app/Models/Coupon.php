<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'discount_type', 'discount_value', 'expires_at',
        'max_uses', 'used_count', 'min_order_amount', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'discount_value' => 'decimal:2',
            'min_order_amount' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}

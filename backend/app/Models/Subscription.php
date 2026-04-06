<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'user_id', 'plan_id', 'subscription_order_id',
        'starts_at', 'ends_at', 'status', 'canceled_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'canceled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(SubscriptionOrder::class, 'subscription_order_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function overlapsRange(\Carbon\CarbonInterface $start, \Carbon\CarbonInterface $end): bool
    {
        return $this->starts_at <= $end && $this->ends_at >= $start;
    }
}

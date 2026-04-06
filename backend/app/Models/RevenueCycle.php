<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RevenueCycle extends Model
{
    protected $fillable = [
        'period_label', 'cycle_start', 'cycle_end',
        'gross_subscription_revenue', 'admin_commission_pct',
        'admin_earnings', 'author_pool', 'total_engagement_weight',
        'status', 'finalized_at', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'cycle_start' => 'date',
            'cycle_end' => 'date',
            'gross_subscription_revenue' => 'decimal:2',
            'admin_commission_pct' => 'decimal:2',
            'admin_earnings' => 'decimal:2',
            'author_pool' => 'decimal:2',
            'total_engagement_weight' => 'decimal:4',
            'finalized_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(RevenueCycleEngagement::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(AuthorPayout::class);
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }
}

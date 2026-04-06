<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthorPayout extends Model
{
    protected $fillable = [
        'author_id', 'revenue_cycle_id', 'engagement_weight',
        'share_percentage', 'gross_earnings', 'status', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'engagement_weight' => 'decimal:4',
            'share_percentage' => 'decimal:6',
            'gross_earnings' => 'decimal:2',
            'meta' => 'array',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function revenueCycle(): BelongsTo
    {
        return $this->belongsTo(RevenueCycle::class);
    }
}

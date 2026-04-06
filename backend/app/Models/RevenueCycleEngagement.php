<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevenueCycleEngagement extends Model
{
    protected $fillable = [
        'revenue_cycle_id', 'user_id', 'book_id', 'author_id',
        'completion_percentage', 'reading_time_seconds',
    ];

    protected function casts(): array
    {
        return [
            'completion_percentage' => 'decimal:2',
            'reading_time_seconds' => 'integer',
        ];
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(RevenueCycle::class, 'revenue_cycle_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Book extends Model
{
    protected $fillable = [
        'author_id',
        'title',
        'description',
        'category',
        'tags',
        'cover_url',
        'file_key',
        'audio_key',
        'access_type',
        'format',
        'price',
        'currency',
        'approval_status',
        'rejection_reason',
        'approved_at',
        'approved_by',
        'is_trending',
        'is_new',
        'rating_avg',
        'review_count',
        'is_available',
        'discount_price',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'approved_at' => 'datetime',
            'is_trending' => 'boolean',
            'is_new' => 'boolean',
            'price' => 'decimal:2',
            'rating_avg' => 'decimal:2',
            'is_available' => 'boolean',
            'discount_price' => 'decimal:2',
        ];
    }

    public function effectivePrice(): ?float
    {
        if ($this->price === null) {
            return null;
        }
        $base = (float) $this->price;
        if ($this->discount_price !== null) {
            return min((float) $this->discount_price, $base);
        }

        return $base;
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopePublicVisible($query)
    {
        return $query->where('approval_status', 'approved');
    }

    public function saleEarnings(): HasMany
    {
        return $this->hasMany(AuthorSaleEarning::class, 'book_id');
    }

    public function engagements(): HasMany
    {
        return $this->hasMany(UserBookEngagement::class, 'book_id');
    }
}

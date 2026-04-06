<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomepageItem extends Model
{
    protected $fillable = [
        'homepage_section_id', 'sort_order', 'item_type', 'title', 'subtitle',
        'image_url', 'cta_label', 'link_type', 'link_value', 'book_id',
        'is_active', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(HomepageSection::class, 'homepage_section_id');
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}

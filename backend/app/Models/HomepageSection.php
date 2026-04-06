<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HomepageSection extends Model
{
    protected $fillable = ['title', 'section_type', 'sort_order', 'is_active', 'settings'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(HomepageItem::class)->orderBy('sort_order');
    }

    public function activeItems(): HasMany
    {
        return $this->items()->where('is_active', true);
    }
}

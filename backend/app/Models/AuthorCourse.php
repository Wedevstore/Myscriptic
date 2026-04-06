<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuthorCourse extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'description',
        'thumbnail_url',
        'published',
        'access_type',
        'price',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'published' => 'boolean',
            'price' => 'decimal:2',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(AuthorCourseLesson::class)->orderBy('sort_order');
    }
}

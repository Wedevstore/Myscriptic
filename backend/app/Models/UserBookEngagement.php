<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBookEngagement extends Model
{
    protected $table = 'user_book_engagements';

    protected $fillable = [
        'user_id', 'book_id', 'pages_read', 'total_pages',
        'completion_percentage', 'reading_time_seconds', 'last_sync_at',
    ];

    protected function casts(): array
    {
        return [
            'completion_percentage' => 'decimal:2',
            'reading_time_seconds' => 'integer',
            'last_sync_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}

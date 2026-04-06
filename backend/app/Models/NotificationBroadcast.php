<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationBroadcast extends Model
{
    protected $fillable = [
        'created_by', 'title', 'body', 'data', 'audience',
        'recipient_count', 'status',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

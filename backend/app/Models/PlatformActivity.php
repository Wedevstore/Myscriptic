<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformActivity extends Model
{
    protected $fillable = [
        'actor_id', 'subject_user_id', 'action', 'entity_type', 'entity_id',
        'metadata', 'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function subjectUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subject_user_id');
    }
}

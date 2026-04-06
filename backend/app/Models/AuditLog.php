<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'actor_id', 'action', 'entity_type', 'entity_id', 'payload', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (AuditLog $log) {
            $log->created_at ??= now();
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public static function record(?int $actorId, string $action, ?string $entityType = null, ?string $entityId = null, ?array $payload = null): self
    {
        return static::query()->create([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'payload' => $payload,
        ]);
    }
}

<?php

namespace App\Services\Platform;

use App\Models\PlatformActivity;
use App\Models\User;
use Illuminate\Http\Request;

class PlatformActivityLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public static function log(
        ?User $actor,
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        array $metadata = [],
        ?User $subjectUser = null,
        ?string $ipAddress = null,
    ): void {
        PlatformActivity::query()->create([
            'actor_id' => $actor?->id,
            'subject_user_id' => $subjectUser?->id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata' => $metadata ?: null,
            'ip_address' => $ipAddress,
        ]);
    }

    public static function fromRequest(Request $request, string $action, ?string $entityType = null, ?string $entityId = null, array $metadata = []): void
    {
        self::log(
            $request->user(),
            $action,
            $entityType,
            $entityId,
            $metadata,
            null,
            $request->ip(),
        );
    }
}

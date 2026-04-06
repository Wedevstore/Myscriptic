<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessNotificationBroadcastJob;
use App\Models\NotificationBroadcast;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminNotificationBroadcastController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:4000'],
            'audience' => ['required', 'string', Rule::in(['all', 'subscribers'])],
            'type' => ['sometimes', 'string', 'max:64'],
        ]);

        $broadcast = NotificationBroadcast::query()->create([
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'body' => $data['body'] ?? null,
            'audience' => $data['audience'],
            'data' => ['type' => $data['type'] ?? 'promo'],
            'status' => 'queued',
        ]);

        ProcessNotificationBroadcastJob::dispatch($broadcast->id);

        PlatformActivityLogger::fromRequest(
            $request,
            'notification.broadcast.queued',
            NotificationBroadcast::class,
            (string) $broadcast->id,
            ['audience' => $data['audience']]
        );

        return response()->json([
            'data' => [
                'id' => (string) $broadcast->id,
                'status' => $broadcast->status,
            ],
        ], 202);
    }

    public function index(): JsonResponse
    {
        $rows = NotificationBroadcast::query()
            ->with('creator:id,name')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($b) => [
                'id' => (string) $b->id,
                'title' => $b->title,
                'audience' => $b->audience,
                'recipient_count' => $b->recipient_count,
                'status' => $b->status,
                'created_by' => $b->creator?->name,
                'created_at' => $b->created_at->toIso8601String(),
            ]),
        ]);
    }
}

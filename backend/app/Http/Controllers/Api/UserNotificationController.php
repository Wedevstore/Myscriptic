<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $p = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'data' => collect($p->items())->map(fn (UserNotification $n) => $this->payload($n)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }

    public function markRead(Request $request, UserNotification $userNotification): JsonResponse
    {
        if ($userNotification->user_id !== $request->user()->id) {
            abort(404);
        }

        $userNotification->update(['read_at' => now()]);

        return response()->json(['data' => $this->payload($userNotification->fresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(UserNotification $n): array
    {
        return [
            'id' => (string) $n->id,
            'type' => $n->type,
            'title' => $n->title,
            'body' => $n->body,
            'data' => $n->data ?? [],
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at->toIso8601String(),
        ];
    }
}

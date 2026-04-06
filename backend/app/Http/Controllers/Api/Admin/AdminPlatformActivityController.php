<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlatformActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = PlatformActivity::query()
            ->with(['actor:id,name,email', 'subjectUser:id,name,email'])
            ->orderByDesc('id');

        if ($request->filled('action')) {
            $q->where('action', 'like', '%'.$request->string('action').'%');
        }

        $p = $q->paginate($request->integer('per_page', 40));

        return response()->json([
            'data' => collect($p->items())->map(fn (PlatformActivity $a) => [
                'id' => (string) $a->id,
                'action' => $a->action,
                'entity_type' => $a->entity_type,
                'entity_id' => $a->entity_id,
                'metadata' => $a->metadata ?? [],
                'actor' => $a->actor ? ['id' => (string) $a->actor->id, 'name' => $a->actor->name] : null,
                'subject_user' => $a->subjectUser ? ['id' => (string) $a->subjectUser->id, 'name' => $a->subjectUser->name] : null,
                'ip_address' => $a->ip_address,
                'created_at' => $a->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }
}

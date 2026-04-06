<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminContactSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(1, (int) $request->input('per_page', 40)));

        $paginator = ContactSubmission::query()
            ->orderByDesc('id')
            ->paginate($perPage);

        $data = $paginator->getCollection()->map(static function (ContactSubmission $c): array {
            return [
                'id' => (string) $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'topic' => $c->topic,
                'message' => $c->message,
                'author_ref' => $c->author_ref,
                'ip_address' => $c->ip_address,
                'created_at' => $c->created_at?->toIso8601String(),
            ];
        })->values()->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}

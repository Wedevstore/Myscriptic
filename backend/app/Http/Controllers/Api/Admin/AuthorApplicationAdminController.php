<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthorApplication;
use App\Models\User;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthorApplicationAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = AuthorApplication::query()->with('user:id,name,email')->orderByDesc('id')->get();

        return response()->json([
            'data' => $rows->map(fn (AuthorApplication $a) => [
                'id' => (string) $a->id,
                'user_id' => (string) $a->user_id,
                'name' => $a->user?->name,
                'email' => $a->user?->email,
                'bio' => $a->bio,
                'payout_method' => $a->payout_method,
                'status' => $a->status,
                'created_at' => $a->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function approve(Request $request, AuthorApplication $authorApplication): JsonResponse
    {
        if ($authorApplication->status !== 'pending') {
            return response()->json(['message' => 'Not pending.'], 422);
        }

        $authorApplication->update(['status' => 'approved']);
        User::query()->whereKey($authorApplication->user_id)->update(['role' => 'author']);

        PlatformActivityLogger::fromRequest(
            $request,
            'author_application.approved',
            AuthorApplication::class,
            (string) $authorApplication->id,
            ['user_id' => (string) $authorApplication->user_id]
        );

        return response()->json(['ok' => true]);
    }

    public function reject(Request $request, AuthorApplication $authorApplication): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);
        $authorApplication->update([
            'status' => 'rejected',
            'rejection_reason' => $data['reason'],
        ]);

        PlatformActivityLogger::fromRequest(
            $request,
            'author_application.rejected',
            AuthorApplication::class,
            (string) $authorApplication->id,
            ['user_id' => (string) $authorApplication->user_id]
        );

        return response()->json(['ok' => true]);
    }
}

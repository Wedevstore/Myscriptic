<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorFollow;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthorFollowController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $ids = AuthorFollow::query()
            ->where('follower_id', $request->user()->id)
            ->pluck('author_id')
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        return response()->json(['data' => $ids]);
    }

    public function store(Request $request, User $author): JsonResponse
    {
        if ($author->role !== 'author') {
            abort(404);
        }

        if ($author->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot follow yourself.'], 422);
        }

        AuthorFollow::query()->firstOrCreate([
            'follower_id' => $request->user()->id,
            'author_id' => $author->id,
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, User $author): JsonResponse
    {
        if ($author->role !== 'author') {
            abort(404);
        }

        AuthorFollow::query()
            ->where('follower_id', $request->user()->id)
            ->where('author_id', $author->id)
            ->delete();

        return response()->json(['ok' => true]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrendingAuthorsController extends Controller
{
    /** Public: top authors by follower count, then by approved book count. */
    public function index(Request $request): JsonResponse
    {
        $limit = min(48, max(1, (int) $request->query('limit', 8)));

        $authors = User::query()
            ->where('role', 'author')
            ->whereNull('blocked_at')
            ->withCount([
                'authoredBooks as books_count' => fn ($q) => $q->where('approval_status', 'approved'),
                'receivedAuthorFollows as followers_count',
            ])
            ->orderByDesc('followers_count')
            ->orderByDesc('books_count')
            ->limit($limit)
            ->get(['id', 'name', 'avatar']);

        return response()->json([
            'data' => $authors->map(fn (User $u) => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'avatar' => $u->avatar ?? '',
                'books' => (int) $u->books_count,
                'followers' => (int) $u->followers_count,
            ]),
        ]);
    }
}

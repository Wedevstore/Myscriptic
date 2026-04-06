<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AuthorPublicController extends Controller
{
    public function show(User $author): JsonResponse
    {
        if ($author->role !== 'author') {
            abort(404);
        }

        if ($author->blocked_at !== null) {
            abort(404);
        }

        $author->loadCount([
            'authoredBooks as books_count' => fn ($q) => $q->where('approval_status', 'approved'),
            'receivedAuthorFollows as followers_count',
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $author->id,
                'name' => $author->name,
                'avatar' => $author->avatar ?? '',
                'books' => (int) $author->books_count,
                'followers' => (int) $author->followers_count,
                'courses' => CoursePublicController::coursesForAuthor($author),
            ],
        ]);
    }
}

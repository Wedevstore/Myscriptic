<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $ids = WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->pluck('book_id')
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        return response()->json(['data' => $ids]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'book_id' => ['required', 'string'],
        ]);

        $bookId = (int) $validated['book_id'];
        if ($bookId < 1) {
            return response()->json(['message' => 'Invalid book.'], 422);
        }

        $book = Book::query()->publicVisible()->whereKey($bookId)->first();
        if (! $book) {
            return response()->json(['message' => 'Book not found.'], 404);
        }

        WishlistItem::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'book_id' => $book->id,
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, string $bookId): JsonResponse
    {
        if (! ctype_digit($bookId)) {
            return response()->json(['message' => 'Invalid book.'], 422);
        }

        WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->where('book_id', (int) $bookId)
            ->delete();

        return response()->json(['ok' => true]);
    }
}

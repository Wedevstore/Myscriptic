<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBookModerationController extends Controller
{
    public function pending(): JsonResponse
    {
        $books = Book::query()
            ->where('approval_status', 'pending')
            ->with('author:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $books->map(fn (Book $b) => $this->bookPayload($b)),
        ]);
    }

    public function approve(Request $request, Book $book): JsonResponse
    {
        if ($book->approval_status !== 'pending') {
            abort(422, 'Book is not pending approval.');
        }

        $book->update([
            'approval_status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
            'rejection_reason' => null,
        ]);

        $book->load('author:id,name');
        PlatformActivityLogger::fromRequest($request, 'book.approved', Book::class, (string) $book->id, ['title' => $book->title]);

        return response()->json(['data' => $this->bookPayload($book)]);
    }

    public function reject(Request $request, Book $book): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        if ($book->approval_status !== 'pending') {
            abort(422, 'Book is not pending approval.');
        }

        $book->update([
            'approval_status' => 'rejected',
            'rejection_reason' => $data['reason'],
            'approved_at' => null,
            'approved_by' => null,
        ]);

        $book->load('author:id,name');
        PlatformActivityLogger::fromRequest($request, 'book.rejected', Book::class, (string) $book->id, ['title' => $book->title]);

        return response()->json(['data' => $this->bookPayload($book)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function bookPayload(Book $book): array
    {
        $authorName = $book->relationLoaded('author')
            ? ($book->author?->name ?? 'Unknown')
            : ($book->author()->value('name') ?? 'Unknown');

        return [
            'id' => (string) $book->id,
            'title' => $book->title,
            'author' => $authorName,
            'authorId' => (string) $book->author_id,
            'description' => $book->description,
            'category' => $book->category,
            'tags' => $book->tags ?? [],
            'coverUrl' => $book->cover_url,
            'accessType' => $book->access_type,
            'format' => $book->format,
            'price' => $book->price !== null ? (float) $book->price : null,
            'currency' => $book->currency,
            'approvalStatus' => $book->approval_status,
            'isTrending' => $book->is_trending,
            'isNew' => $book->is_new,
            'rating' => $book->rating_avg !== null ? (float) $book->rating_avg : null,
            'reviewCount' => $book->review_count,
            'createdAt' => $book->created_at->toIso8601String(),
        ];
    }
}

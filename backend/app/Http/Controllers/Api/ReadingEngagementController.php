<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\UserBookEngagement;
use App\Services\Engagement\EngagementTrackingService;
use App\Support\AssetCdn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingEngagementController extends Controller
{
    public function __construct(protected EngagementTrackingService $engagement) {}

    /** Aggregate reading stats for the reader dashboard (all books with engagement rows). */
    public function analytics(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $rows = UserBookEngagement::query()
            ->where('user_id', $userId)
            ->with(['book:id,title,category,format,cover_url,author_id', 'book.author:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        $totalSeconds = (int) $rows->sum('reading_time_seconds');
        $totalPagesRead = (int) $rows->sum('pages_read');
        $completed = $rows->filter(fn (UserBookEngagement $r) => (float) $r->completion_percentage >= 95.0)->count();
        $withActivity = $rows->filter(fn (UserBookEngagement $r) => (int) $r->pages_read > 0)->count();
        $avgComp = $rows->isEmpty()
            ? 0.0
            : round((float) $rows->avg('completion_percentage'), 1);

        $books = $rows->map(function (UserBookEngagement $r) {
            $b = $r->book;

            return [
                'book_id' => (string) $r->book_id,
                'title' => $b?->title ?? 'Unknown',
                'author' => $b?->author?->name ?? '',
                'cover_url' => AssetCdn::transformUrl($b?->cover_url),
                'category' => $b?->category,
                'format' => $b?->format ?? 'ebook',
                'pages_read' => (int) $r->pages_read,
                'pages_total' => (int) ($r->total_pages ?? 0),
                'completion_percentage' => (float) $r->completion_percentage,
                'reading_time_seconds' => (int) $r->reading_time_seconds,
                'last_sync_at' => $r->last_sync_at?->toIso8601String(),
            ];
        })->values()->all();

        return response()->json([
            'data' => [
                'summary' => [
                    'total_reading_time_seconds' => $totalSeconds,
                    'total_pages_read' => $totalPagesRead,
                    'books_tracked' => $rows->count(),
                    'books_with_activity' => $withActivity,
                    'books_completed' => $completed,
                    'average_completion_pct' => $avgComp,
                ],
                'books' => $books,
            ],
        ]);
    }

    public function show(Request $request, int $bookId): JsonResponse
    {
        $book = Book::query()->findOrFail($bookId);
        $row = UserBookEngagement::query()
            ->where('user_id', $request->user()->id)
            ->where('book_id', $bookId)
            ->first();

        return response()->json([
            'book_id' => (string) $bookId,
            'page_number' => $row?->pages_read ?? 0,
            'pages_total' => $row?->total_pages ?? 0,
            'percent_complete' => $row ? (float) $row->completion_percentage : 0.0,
            'reading_time_seconds' => $row?->reading_time_seconds ?? 0,
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'page_number' => ['required', 'integer', 'min:0'],
            'pages_total' => ['nullable', 'integer', 'min:1'],
            'seconds_read' => ['nullable', 'integer', 'min:0'],
        ]);

        $book = Book::query()->findOrFail($data['book_id']);

        $row = $this->engagement->sync($request->user(), $book, [
            'pages_read' => $data['page_number'],
            'total_pages' => $data['pages_total'] ?? null,
            'seconds_read' => (int) ($data['seconds_read'] ?? 0),
        ]);

        return response()->json([
            'page_number' => $row->pages_read,
            'pages_total' => $row->total_pages ?? 0,
            'percent_complete' => (float) $row->completion_percentage,
            'reading_time_seconds' => $row->reading_time_seconds,
        ]);
    }
}

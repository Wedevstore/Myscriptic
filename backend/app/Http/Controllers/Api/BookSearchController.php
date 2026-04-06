<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Services\Cache\BookListCacheService;
use App\Services\Search\BookSearchService;
use App\Support\AssetCdn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookSearchController extends Controller
{
    public function __construct(protected BookSearchService $searchService) {}

    public function __invoke(Request $request): JsonResponse
    {
        $q = (string) $request->string('q', '');
        $perPage = $request->integer('per_page', 15);
        $parts = ['q' => $q, 'per' => $perPage, 'page' => $request->integer('page', 1)];
        $ttl = (int) config('myscriptic.search_cache_ttl', 30);

        $payload = BookListCacheService::remember('api:books:search', $parts, $ttl, function () use ($q, $perPage) {
            $paginator = $this->searchService->search($q, $perPage);

            return [
                'data' => $paginator->getCollection()->map(fn (Book $b) => $this->bookPayload($b))->values()->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ];
        });

        return response()->json($payload);
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
            'coverUrl' => AssetCdn::transformUrl($book->cover_url),
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

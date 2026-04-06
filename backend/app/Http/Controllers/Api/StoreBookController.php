<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Services\Cache\BookListCacheService;
use App\Support\AssetCdn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreBookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 24);
        $parts = [
            'category' => $request->string('category')->toString(),
            'min_price' => $request->string('min_price')->toString(),
            'max_price' => $request->string('max_price')->toString(),
            'page' => $request->integer('page', 1),
            'per' => $perPage,
        ];
        $ttl = (int) config('myscriptic.store_list_cache_ttl', 120);

        $payload = BookListCacheService::remember('api:store:books', $parts, $ttl, function () use ($request, $perPage) {
            $q = Book::query()
                ->with('author:id,name')
                ->publicVisible()
                ->where('access_type', 'PAID')
                ->where('is_available', true)
                ->whereNotNull('price')
                ->orderByDesc('created_at');

            if ($request->filled('category')) {
                $q->where('category', $request->string('category'));
            }
            if ($request->filled('min_price')) {
                $q->where('price', '>=', $request->float('min_price'));
            }
            if ($request->filled('max_price')) {
                $q->where('price', '<=', $request->float('max_price'));
            }

            $p = $q->paginate($perPage);

            return [
                'data' => $p->getCollection()->map(fn (Book $b) => $this->shape($b))->values()->all(),
                'meta' => [
                    'current_page' => $p->currentPage(),
                    'last_page' => $p->lastPage(),
                    'per_page' => $p->perPage(),
                    'total' => $p->total(),
                ],
            ];
        });

        return response()->json($payload);
    }

    public function featured(): JsonResponse
    {
        $ttl = (int) config('myscriptic.store_list_cache_ttl', 120);
        $data = BookListCacheService::remember('api:store:featured', [], $ttl, function () {
            return Book::query()
                ->with('author:id,name')
                ->publicVisible()
                ->where('access_type', 'PAID')
                ->where('is_available', true)
                ->where(function ($q) {
                    $q->where('is_trending', true)->orWhere('is_new', true);
                })
                ->orderByDesc('is_trending')
                ->limit(12)
                ->get()
                ->map(fn (Book $b) => $this->shape($b))
                ->values()
                ->all();
        });

        return response()->json(['data' => $data]);
    }

    private function shape(Book $b): array
    {
        $author = $b->relationLoaded('author') ? ($b->author?->name ?? '') : ($b->author()->value('name') ?? '');

        return [
            'id' => (string) $b->id,
            'title' => $b->title,
            'author' => $author,
            'coverUrl' => AssetCdn::transformUrl($b->cover_url),
            'rating' => $b->rating_avg !== null ? (float) $b->rating_avg : null,
            'reviewCount' => $b->review_count,
            'accessType' => $b->access_type,
            'format' => $b->format,
            'category' => $b->category,
            'price' => $b->effectivePrice(),
            'currency' => $b->currency,
            'isTrending' => $b->is_trending,
            'isNew' => $b->is_new,
        ];
    }
}

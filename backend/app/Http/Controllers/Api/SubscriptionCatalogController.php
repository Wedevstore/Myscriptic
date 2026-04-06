<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Support\AssetCdn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionCatalogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->activeSubscription()) {
            abort(403, 'Active subscription required.');
        }

        $q = Book::query()
            ->with('author:id,name')
            ->publicVisible()
            ->whereIn('access_type', ['FREE', 'SUBSCRIPTION']);

        if ($request->filled('category')) {
            $q->where('category', $request->string('category'));
        }
        if ($request->filled('format')) {
            $q->where('format', $request->string('format'));
        }

        $sort = $request->string('sort')->toString();
        match ($sort) {
            'rating' => $q->orderByDesc('rating_avg')->orderByDesc('created_at'),
            'az' => $q->orderBy('title'),
            'newest' => $q->orderByDesc('created_at'),
            default => $q->orderByDesc('is_trending')->orderByDesc('created_at'),
        };

        $perPage = min(500, max(1, $request->integer('per_page', 24)));
        $p = $q->paginate($perPage);

        return response()->json([
            'data' => $p->getCollection()->map(fn (Book $b) => [
                'id' => (string) $b->id,
                'title' => $b->title,
                'author' => $b->author?->name ?? '',
                'cover_url' => AssetCdn::transformUrl($b->cover_url),
                'format' => $b->format,
                'category' => $b->category,
                'access_type' => $b->access_type,
                'rating_avg' => $b->rating_avg !== null ? (float) $b->rating_avg : null,
                'is_new' => (bool) $b->is_new,
                'is_trending' => (bool) $b->is_trending,
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
            ],
        ]);
    }
}

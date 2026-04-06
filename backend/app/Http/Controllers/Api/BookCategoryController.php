<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Services\Cache\BookListCacheService;
use Illuminate\Http\JsonResponse;

class BookCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $ttl = (int) config('myscriptic.categories_cache_ttl', 600);

        $names = BookListCacheService::remember('api:books:categories', [], $ttl, function () {
            return Book::query()
                ->publicVisible()
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->select('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category')
                ->values()
                ->all();
        });

        return response()->json(['data' => $names]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use App\Services\Cms\HomepagePayloadService;
use Illuminate\Http\JsonResponse;

class CmsPublicController extends Controller
{
    public function homepage(): JsonResponse
    {
        return response()->json(HomepagePayloadService::cachedPayload());
    }

    public function page(string $slug): JsonResponse
    {
        $page = CmsPage::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json([
            'data' => [
                'title' => $page->title,
                'slug' => $page->slug,
                'content' => $page->content,
                'updatedAt' => $page->updated_at->toIso8601String(),
            ],
        ]);
    }
}

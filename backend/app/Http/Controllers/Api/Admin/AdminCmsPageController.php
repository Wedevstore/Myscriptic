<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use App\Services\Cms\CmsContentSanitizer;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCmsPageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => CmsPage::query()->orderBy('title')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9\-]+$/', 'unique:cms_pages,slug'],
            'content' => ['required', 'string'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        $page = CmsPage::query()->create([
            'title' => $data['title'],
            'slug' => $data['slug'],
            'content' => CmsContentSanitizer::sanitize($data['content']),
            'is_published' => $data['is_published'] ?? false,
        ]);

        PlatformActivityLogger::fromRequest($request, 'cms.page.created', CmsPage::class, (string) $page->id);

        return response()->json(['data' => $page], 201);
    }

    public function update(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:120', 'regex:/^[a-z0-9\-]+$/', Rule::unique('cms_pages', 'slug')->ignore($cmsPage->id)],
            'content' => ['sometimes', 'string'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['content'])) {
            $data['content'] = CmsContentSanitizer::sanitize($data['content']);
        }

        $cmsPage->update($data);
        PlatformActivityLogger::fromRequest($request, 'cms.page.updated', CmsPage::class, (string) $cmsPage->id);

        return response()->json(['data' => $cmsPage->fresh()]);
    }

    public function destroy(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $id = (string) $cmsPage->id;
        $cmsPage->delete();
        PlatformActivityLogger::fromRequest($request, 'cms.page.deleted', CmsPage::class, $id);

        return response()->noContent();
    }
}

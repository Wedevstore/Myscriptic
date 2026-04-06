<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomepageItem;
use App\Models\HomepageSection;
use App\Services\Cms\CmsContentSanitizer;
use App\Services\Cms\HomepagePayloadService;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminHomepageController extends Controller
{
    public function sectionsIndex(): JsonResponse
    {
        $sections = HomepageSection::query()
            ->orderBy('sort_order')
            ->with(['items' => fn ($q) => $q->orderBy('sort_order')->with('book:id,title,cover_url')])
            ->get();

        return response()->json(['data' => $sections]);
    }

    public function storeSection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'section_type' => ['required', 'string', Rule::in([
                'hero_carousel', 'book_list', 'category_strip', 'flash_sale', 'subscription_cta', 'custom_html',
            ])],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['nullable', 'array'],
        ]);

        $max = (int) HomepageSection::query()->max('sort_order');
        $settings = $data['settings'] ?? null;
        if (is_array($settings) && isset($settings['html']) && is_string($settings['html'])) {
            $settings['html'] = CmsContentSanitizer::sanitize($settings['html']);
        }

        $section = HomepageSection::query()->create([
            'title' => $data['title'],
            'section_type' => $data['section_type'],
            'sort_order' => $data['sort_order'] ?? ($max + 1),
            'is_active' => $data['is_active'] ?? true,
            'settings' => $settings,
        ]);

        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.section.created', HomepageSection::class, (string) $section->id);

        return response()->json(['data' => $section->load('items')], 201);
    }

    public function updateSection(Request $request, HomepageSection $homepageSection): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'section_type' => ['sometimes', 'string', Rule::in([
                'hero_carousel', 'book_list', 'category_strip', 'flash_sale', 'subscription_cta', 'custom_html',
            ])],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['nullable', 'array'],
        ]);

        if (isset($data['settings']) && is_array($data['settings']) && isset($data['settings']['html']) && is_string($data['settings']['html'])) {
            $data['settings']['html'] = CmsContentSanitizer::sanitize($data['settings']['html']);
        }

        $homepageSection->update($data);
        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.section.updated', HomepageSection::class, (string) $homepageSection->id);

        return response()->json(['data' => $homepageSection->fresh()->load('items')]);
    }

    public function destroySection(Request $request, HomepageSection $homepageSection): JsonResponse
    {
        $id = (string) $homepageSection->id;
        $homepageSection->delete();
        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.section.deleted', HomepageSection::class, $id);

        return response()->noContent();
    }

    public function reorderSections(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'exists:homepage_sections,id'],
        ]);

        foreach ($data['order'] as $i => $sectionId) {
            HomepageSection::query()->whereKey($sectionId)->update(['sort_order' => $i]);
        }

        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.sections.reordered', null, null, ['order' => $data['order']]);

        return response()->json(['success' => true]);
    }

    public function storeItem(Request $request, HomepageSection $homepageSection): JsonResponse
    {
        $data = $request->validate([
            'item_type' => ['required', 'string', Rule::in(['banner', 'book', 'category_link', 'html_block'])],
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:512'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'cta_label' => ['nullable', 'string', 'max:120'],
            'link_type' => ['nullable', 'string', Rule::in(['book', 'category', 'external', 'subscription', 'store'])],
            'link_value' => ['nullable', 'string', 'max:512'],
            'book_id' => ['nullable', 'integer', 'exists:books,id'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'meta' => ['nullable', 'array'],
        ]);

        $max = (int) $homepageSection->items()->max('sort_order');
        $item = $homepageSection->items()->create([
            ...$data,
            'sort_order' => $data['sort_order'] ?? ($max + 1),
            'is_active' => $data['is_active'] ?? true,
        ]);

        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.item.created', HomepageItem::class, (string) $item->id);

        return response()->json(['data' => $item->load('book:id,title,cover_url')], 201);
    }

    public function updateItem(Request $request, HomepageItem $homepageItem): JsonResponse
    {
        $data = $request->validate([
            'item_type' => ['sometimes', 'string', Rule::in(['banner', 'book', 'category_link', 'html_block'])],
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:512'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'cta_label' => ['nullable', 'string', 'max:120'],
            'link_type' => ['nullable', 'string', Rule::in(['book', 'category', 'external', 'subscription', 'store'])],
            'link_value' => ['nullable', 'string', 'max:512'],
            'book_id' => ['nullable', 'integer', 'exists:books,id'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'meta' => ['nullable', 'array'],
        ]);

        $homepageItem->update($data);
        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.item.updated', HomepageItem::class, (string) $homepageItem->id);

        return response()->json(['data' => $homepageItem->fresh()->load('book:id,title,cover_url')]);
    }

    public function destroyItem(Request $request, HomepageItem $homepageItem): JsonResponse
    {
        $id = (string) $homepageItem->id;
        $homepageItem->delete();
        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.item.deleted', HomepageItem::class, $id);

        return response()->noContent();
    }

    public function reorderItems(Request $request, HomepageSection $homepageSection): JsonResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'exists:homepage_items,id'],
        ]);

        foreach ($data['order'] as $i => $itemId) {
            HomepageItem::query()
                ->whereKey($itemId)
                ->where('homepage_section_id', $homepageSection->id)
                ->update(['sort_order' => $i]);
        }

        HomepagePayloadService::forgetCache();
        PlatformActivityLogger::fromRequest($request, 'homepage.items.reordered', HomepageSection::class, (string) $homepageSection->id);

        return response()->json(['success' => true]);
    }
}

<?php

namespace App\Services\Cms;

use App\Models\Book;
use App\Models\HomepageItem;
use App\Models\HomepageSection;
use App\Support\AssetCdn;
use Illuminate\Support\Facades\Cache;

class HomepagePayloadService
{
    public static function cacheKey(): string
    {
        return 'cms:homepage:v1';
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::cacheKey());
    }

    /**
     * @return array<string, mixed>
     */
    public static function buildPayload(): array
    {
        $sections = HomepageSection::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->with([
                'items' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'items.book' => fn ($q) => $q->select('id', 'author_id', 'title', 'description', 'category', 'tags', 'cover_url', 'access_type', 'format', 'price', 'currency', 'approval_status', 'is_trending', 'is_new', 'rating_avg', 'review_count', 'created_at', 'discount_price')
                    ->with('author:id,name'),
            ])
            ->get();

        return [
            'sections' => $sections->map(fn (HomepageSection $s) => self::sectionPayload($s))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function cachedPayload(): array
    {
        $ttl = (int) config('myscriptic.homepage_cache_ttl', 300);

        return Cache::remember(self::cacheKey(), max(1, $ttl), fn () => self::buildPayload());
    }

    /**
     * @return array<string, mixed>
     */
    private static function sectionPayload(HomepageSection $s): array
    {
        return [
            'id' => $s->id,
            'title' => $s->title,
            'section_type' => $s->section_type,
            'sort_order' => $s->sort_order,
            'is_active' => $s->is_active,
            'settings' => $s->settings ?? [],
            'items' => $s->items->map(fn (HomepageItem $i) => self::itemPayload($i))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function itemPayload(HomepageItem $i): array
    {
        $book = null;
        if ($i->book_id && $i->relationLoaded('book') && $i->book instanceof Book) {
            $b = $i->book;
            $authorName = $b->relationLoaded('author') ? ($b->author?->name ?? 'Unknown') : 'Unknown';
            $book = [
                'id' => (string) $b->id,
                'title' => $b->title,
                'author' => $authorName,
                'authorId' => (string) $b->author_id,
                'description' => $b->description,
                'category' => $b->category,
                'tags' => $b->tags ?? [],
                'coverUrl' => AssetCdn::transformUrl($b->cover_url),
                'accessType' => $b->access_type,
                'format' => $b->format,
                'price' => $b->price !== null ? (float) $b->price : null,
                'currency' => $b->currency,
                'approvalStatus' => $b->approval_status,
                'isTrending' => $b->is_trending,
                'isNew' => $b->is_new,
                'rating' => $b->rating_avg !== null ? (float) $b->rating_avg : null,
                'reviewCount' => $b->review_count,
                'createdAt' => $b->created_at->toIso8601String(),
            ];
        }

        return [
            'id' => $i->id,
            'sort_order' => $i->sort_order,
            'item_type' => $i->item_type,
            'title' => $i->title,
            'subtitle' => $i->subtitle,
            'image_url' => AssetCdn::transformUrl($i->image_url),
            'cta_label' => $i->cta_label,
            'link_type' => $i->link_type,
            'link_value' => $i->link_value,
            'book_id' => $i->book_id,
            'meta' => $i->meta ?? [],
            'book' => $book,
        ];
    }
}

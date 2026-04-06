<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\CmsPage;
use App\Models\HomepageSection;
use App\Services\Cms\CmsContentSanitizer;
use App\Services\Cms\HomepagePayloadService;
use Illuminate\Database\Seeder;

class Phase4CmsSeeder extends Seeder
{
    public function run(): void
    {
        if (HomepageSection::query()->exists()) {
            return;
        }

        $hero = HomepageSection::query()->create([
            'title' => 'Hero carousel',
            'section_type' => 'hero_carousel',
            'sort_order' => 0,
            'is_active' => true,
            'settings' => [],
        ]);

        $hero->items()->createMany([
            [
                'sort_order' => 0,
                'item_type' => 'banner',
                'title' => 'Read Africa. Write the future.',
                'subtitle' => 'Discover ebooks, audiobooks, and unlimited subscription reading on MyScriptic.',
                'image_url' => 'https://picsum.photos/seed/ms-hero-store/1200/800',
                'cta_label' => 'Browse store',
                'link_type' => 'store',
                'link_value' => '/store',
                'is_active' => true,
            ],
            [
                'sort_order' => 1,
                'item_type' => 'banner',
                'title' => 'Unlimited reading',
                'subtitle' => 'One subscription. Thousands of titles. Cancel anytime.',
                'image_url' => 'https://picsum.photos/seed/ms-hero-subscribe/1200/800',
                'cta_label' => 'View plans',
                'link_type' => 'subscription',
                'link_value' => '/subscription',
                'is_active' => true,
            ],
        ]);

        $books = Book::query()->publicVisible()->orderByDesc('is_trending')->orderByDesc('id')->limit(8)->get();

        $trending = HomepageSection::query()->create([
            'title' => 'Trending this week',
            'section_type' => 'book_list',
            'sort_order' => 1,
            'is_active' => true,
            'settings' => ['see_all_href' => '/books?sort=trending'],
        ]);

        foreach ($books->take(4) as $i => $book) {
            $trending->items()->create([
                'sort_order' => $i,
                'item_type' => 'book',
                'book_id' => $book->id,
                'is_active' => true,
            ]);
        }

        $featured = HomepageSection::query()->create([
            'title' => 'New arrivals',
            'section_type' => 'book_list',
            'sort_order' => 2,
            'is_active' => true,
            'settings' => ['see_all_href' => '/books?sort=new'],
        ]);

        foreach ($books->slice(4)->take(4)->values() as $i => $book) {
            $featured->items()->create([
                'sort_order' => $i,
                'item_type' => 'book',
                'book_id' => $book->id,
                'is_active' => true,
            ]);
        }

        HomepageSection::query()->create([
            'title' => 'Browse categories',
            'section_type' => 'category_strip',
            'sort_order' => 3,
            'is_active' => true,
            'settings' => [],
        ]);

        HomepageSection::query()->create([
            'title' => 'Flash deals',
            'section_type' => 'flash_sale',
            'sort_order' => 4,
            'is_active' => true,
            'settings' => ['headline' => 'Weekend sale — up to 40% off select titles'],
        ]);

        $subList = HomepageSection::query()->create([
            'title' => 'Read with subscription',
            'section_type' => 'book_list',
            'sort_order' => 5,
            'is_active' => true,
            'settings' => ['see_all_href' => '/books?access=SUBSCRIPTION', 'variant' => 'scroll', 'columns' => 6],
        ]);
        $subBooks = Book::query()->publicVisible()->where('access_type', 'SUBSCRIPTION')->orderByDesc('id')->limit(6)->get();
        foreach ($subBooks as $i => $book) {
            $subList->items()->create([
                'sort_order' => $i,
                'item_type' => 'book',
                'book_id' => $book->id,
                'is_active' => true,
            ]);
        }

        HomepageSection::query()->create([
            'title' => 'Subscription CTA',
            'section_type' => 'subscription_cta',
            'sort_order' => 6,
            'is_active' => true,
            'settings' => [],
        ]);

        $audioSec = HomepageSection::query()->create([
            'title' => 'Top audiobooks',
            'section_type' => 'book_list',
            'sort_order' => 7,
            'is_active' => true,
            'settings' => [
                'subtitle' => 'Listen on the go',
                'see_all_href' => '/audiobooks',
                'columns' => 4,
            ],
        ]);
        $audioBooks = Book::query()->publicVisible()->where('format', 'audiobook')->orderByDesc('id')->limit(4)->get();
        foreach ($audioBooks as $i => $book) {
            $audioSec->items()->create([
                'sort_order' => $i,
                'item_type' => 'book',
                'book_id' => $book->id,
                'is_active' => true,
            ]);
        }

        $freeSec = HomepageSection::query()->create([
            'title' => 'Free to read',
            'section_type' => 'book_list',
            'sort_order' => 8,
            'is_active' => true,
            'settings' => [
                'subtitle' => 'Start reading right now — no subscription needed',
                'see_all_href' => '/books?access=FREE',
                'columns' => 4,
            ],
        ]);
        $freeBooks = Book::query()->publicVisible()->where('access_type', 'FREE')->orderByDesc('id')->limit(4)->get();
        foreach ($freeBooks as $i => $book) {
            $freeSec->items()->create([
                'sort_order' => $i,
                'item_type' => 'book',
                'book_id' => $book->id,
                'is_active' => true,
            ]);
        }

        HomepageSection::query()->create([
            'title' => 'Learn from authors',
            'section_type' => 'author_courses',
            'sort_order' => 9,
            'is_active' => true,
            'settings' => [
                'subtitle' => 'Video courses — lessons stream from YouTube or Vimeo.',
            ],
        ]);

        $about = '<p>MyScriptic connects readers with African and global stories across ebooks and audiobooks.</p>'.
            '<p><strong>Demo content</strong> — replace this copy and add images from the admin CMS when you go live.</p>';
        foreach ([
            ['title' => 'About Us', 'slug' => 'about'],
            ['title' => 'Terms of Service', 'slug' => 'terms'],
            ['title' => 'Privacy Policy', 'slug' => 'privacy'],
        ] as $row) {
            CmsPage::query()->firstOrCreate(
                ['slug' => $row['slug']],
                [
                    'title' => $row['title'],
                    'content' => CmsContentSanitizer::sanitize($about),
                    'is_published' => true,
                ]
            );
        }

        HomepagePayloadService::forgetCache();
    }
}

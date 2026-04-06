<?php

namespace Database\Seeders;

use App\Models\AuthorApplication;
use App\Models\Book;
use App\Models\CartItem;
use App\Models\FcmDevice;
use App\Models\LibraryEntry;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PlatformActivity;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserBookEngagement;
use App\Models\UserNotification;
use App\Services\Cms\CmsContentSanitizer;
use App\Services\Cms\HomepagePayloadService;
use App\Models\CmsPage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Extra demo accounts & content. Users have is_demo=true — remove with: php artisan myscriptic:clear-demo
 */
class DemoDataSeeder extends Seeder
{
    private static function pic(int $w, int $h, string $seed): string
    {
        return 'https://picsum.photos/seed/'.rawurlencode($seed)."/{$w}/{$h}";
    }

    public function run(): void
    {
        if (User::query()->where('email', 'demo.author@demo.myscriptic.test')->exists()) {
            $this->command?->info('DemoDataSeeder: skipped (demo users already exist).');

            return;
        }

        $admin = User::query()->where('email', 'admin@myscriptic.com')->first();
        $jane = User::query()->where('email', 'author@myscriptic.com')->first();
        if (! $admin || ! $jane) {
            $this->command?->warn('DemoDataSeeder: core users missing; run DatabaseSeeder first.');

            return;
        }

        $demoAuthor = User::query()->create([
            'name' => 'Demo Author Collective',
            'email' => 'demo.author@demo.myscriptic.test',
            'password' => Hash::make('demo12345'),
            'role' => 'author',
            'avatar' => self::pic(160, 160, 'demo-author-avatar'),
            'is_demo' => true,
        ]);

        $demoReader = User::query()->create([
            'name' => 'Demo Reader',
            'email' => 'demo.reader@demo.myscriptic.test',
            'password' => Hash::make('demo12345'),
            'role' => 'user',
            'avatar' => self::pic(160, 160, 'demo-reader-avatar'),
            'is_demo' => true,
        ]);

        $demoApplicant = User::query()->create([
            'name' => 'Demo Applicant',
            'email' => 'demo.applicant@demo.myscriptic.test',
            'password' => Hash::make('demo12345'),
            'role' => 'user',
            'avatar' => self::pic(160, 160, 'demo-applicant-avatar'),
            'is_demo' => true,
        ]);

        $demoBooks = [
            ['title' => 'Market Day Dreams', 'category' => 'Fiction', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 7.99, 'seed' => 'demo-book-market'],
            ['title' => 'Neon Nairoberry', 'category' => 'Sci-Fi', 'access_type' => 'SUBSCRIPTION', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-neon'],
            ['title' => 'Coastal Recipes', 'category' => 'Lifestyle', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 14.5, 'seed' => 'demo-book-coast'],
            ['title' => 'The Last Dhow', 'category' => 'Historical', 'access_type' => 'FREE', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-dhow'],
            ['title' => 'Startup Safari', 'category' => 'Business', 'access_type' => 'PAID', 'format' => 'audiobook', 'price' => 18.0, 'seed' => 'demo-book-safari'],
            ['title' => 'Rain Season Letters', 'category' => 'Poetry', 'access_type' => 'SUBSCRIPTION', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-rain'],
            ['title' => 'Code & Cowries', 'category' => 'Technology', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 22.99, 'seed' => 'demo-book-code'],
            ['title' => 'Little Zebra\'s Big Day', 'category' => 'Children', 'access_type' => 'FREE', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-zebra'],
            ['title' => 'Harbor Lights Romance', 'category' => 'Romance', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 9.99, 'seed' => 'demo-book-harbor'],
            ['title' => 'Boardroom Ancestors', 'category' => 'Leadership', 'access_type' => 'SUBSCRIPTION', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-board'],
            ['title' => 'Velvet Visa Run', 'category' => 'Romance', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 8.49, 'seed' => 'demo-book-velvet'],
            ['title' => 'APIs Before Breakfast', 'category' => 'Technology', 'access_type' => 'SUBSCRIPTION', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-api'],
            ['title' => 'Mango Season Memoirs', 'category' => 'Lifestyle', 'access_type' => 'FREE', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-mango'],
            ['title' => 'Satellite Town Blues', 'category' => 'Fiction', 'access_type' => 'PAID', 'format' => 'audiobook', 'price' => 11.99, 'seed' => 'demo-book-satellite'],
            ['title' => 'CFO in Flip-Flops', 'category' => 'Business', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 16.49, 'seed' => 'demo-book-cfo'],
            ['title' => 'Starship Adabraka', 'category' => 'Sci-Fi', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 13.99, 'seed' => 'demo-book-starship'],
            ['title' => 'Drums at Dawn', 'category' => 'Historical', 'access_type' => 'SUBSCRIPTION', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-drums'],
            ['title' => 'Tiny Tutu Troupe', 'category' => 'Children', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 4.99, 'seed' => 'demo-book-tutu'],
            ['title' => 'Index Fund Igbo', 'category' => 'Finance', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 9.99, 'seed' => 'demo-book-index'],
            ['title' => 'Sprint Rituals', 'category' => 'Leadership', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 12.99, 'seed' => 'demo-book-sprint'],
            ['title' => 'Haiku Highway', 'category' => 'Poetry', 'access_type' => 'FREE', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-haiku'],
            ['title' => 'Street Food SQL', 'category' => 'Technology', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 19.99, 'seed' => 'demo-book-sql'],
            ['title' => 'Lagoon Legends', 'category' => 'Magazine', 'access_type' => 'PAID', 'format' => 'magazine', 'price' => 3.99, 'seed' => 'demo-book-lagoon-mag'],
            ['title' => 'Cassava & Capital', 'category' => 'Business', 'access_type' => 'SUBSCRIPTION', 'format' => 'audiobook', 'price' => null, 'seed' => 'demo-book-cassava'],
            ['title' => 'Neon Nomads', 'category' => 'Sci-Fi', 'access_type' => 'FREE', 'format' => 'ebook', 'price' => null, 'seed' => 'demo-book-nomads'],
            ['title' => 'Palm Wine PM', 'category' => 'Self-Help', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 7.49, 'seed' => 'demo-book-palm'],
            ['title' => 'Rooftop Algorithms', 'category' => 'Technology', 'access_type' => 'PAID', 'format' => 'ebook', 'price' => 23.99, 'seed' => 'demo-book-roof'],
            ['title' => 'Golden Hour Gallery', 'category' => 'Lifestyle', 'access_type' => 'SUBSCRIPTION', 'format' => 'magazine', 'price' => null, 'seed' => 'demo-book-gallery'],
        ];

        $paidBook = null;
        $firstPaidExcerpt = "The market woke before the sun. Mama Nkechi tied her gele with practiced hands, already hearing the distant rumble of okadas along the main road.\n\nShe counted the crates of dried fish twice — habit, not hope. Today had to go well; the children’s fees were due before the week ran out.";
        foreach ($demoBooks as $i => $row) {
            $book = Book::query()->create([
                'author_id' => $demoAuthor->id,
                'title' => $row['title'],
                'description' => 'Demo description for '.$row['title'].'. Replace with real copy in production.',
                'sample_excerpt' => ($i === 0 && $row['format'] === 'ebook') ? $firstPaidExcerpt : null,
                'category' => $row['category'],
                'tags' => ['demo', strtolower($row['category'])],
                'cover_url' => self::pic(240, 360, $row['seed']),
                'access_type' => $row['access_type'],
                'format' => $row['format'],
                'price' => $row['price'],
                'currency' => 'USD',
                'approval_status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $admin->id,
                'is_trending' => $i < 9 || $i % 4 === 0,
                'is_new' => $i >= 6 || $i % 5 === 2,
                'rating_avg' => round(4 + (mt_rand(0, 9) / 10), 1),
                'review_count' => mt_rand(120, 3200),
            ]);
            if ($row['access_type'] === 'PAID' && $paidBook === null) {
                $paidBook = $book;
            }
        }

        $janePaid = Book::query()->where('author_id', $jane->id)->where('access_type', 'PAID')->first();

        AuthorApplication::query()->create([
            'user_id' => $demoApplicant->id,
            'bio' => 'Demo applicant bio — passionate about YA fiction and community workshops.',
            'payout_method' => 'bank',
            'payout_details' => ['bank_name' => 'Demo Bank', 'account_hint' => '****1234'],
            'status' => 'pending',
        ]);

        foreach ([
            ['type' => 'promo', 'title' => 'Weekend reading challenge', 'body' => 'Finish any demo book and unlock a badge (demo).'],
            ['type' => 'new_book', 'title' => 'New in your library', 'body' => 'We added fresh titles to the demo catalog.'],
            ['type' => 'info', 'title' => 'Profile tip', 'body' => 'Upload a profile photo to personalize your reader page.'],
        ] as $n) {
            UserNotification::query()->create([
                'user_id' => $demoReader->id,
                'type' => $n['type'],
                'title' => $n['title'],
                'body' => $n['body'],
                'read_at' => $n['type'] === 'info' ? now() : null,
            ]);
        }

        FcmDevice::query()->firstOrCreate(
            ['user_id' => $demoReader->id, 'token' => 'demo-fcm-web-placeholder'],
            ['platform' => 'web', 'last_used_at' => now()]
        );

        if ($paidBook) {
            CartItem::query()->create(['user_id' => $demoReader->id, 'book_id' => $paidBook->id, 'quantity' => 1]);
        }
        if ($janePaid) {
            CartItem::query()->create(['user_id' => $demoReader->id, 'book_id' => $janePaid->id, 'quantity' => 1]);
        }

        $purchaseBook = $janePaid ?? $paidBook;
        if ($purchaseBook) {
            $purchaseBook->load('author:id,name');

            $order = Order::query()->create([
                'user_id' => $demoReader->id,
                'order_number' => 'DEMO-'.strtoupper(Str::random(10)),
                'subtotal' => (float) $purchaseBook->price,
                'discount' => 0,
                'tax' => 0,
                'total_amount' => (float) $purchaseBook->price,
                'currency' => 'USD',
                'local_total' => null,
                'coupon_id' => null,
                'payment_gateway' => 'mock',
                'payment_ref' => 'demo-pay-'.Str::random(12),
                'status' => 'paid',
                'paid_at' => now()->subDays(2),
                'refunded_at' => null,
                'meta' => ['demo' => true],
            ]);

            OrderItem::query()->create([
                'order_id' => $order->id,
                'book_id' => $purchaseBook->id,
                'title' => $purchaseBook->title,
                'author_name' => $purchaseBook->author->name ?? 'Author',
                'cover_url' => $purchaseBook->cover_url,
                'format' => $purchaseBook->format,
                'unit_price' => (float) $purchaseBook->price,
                'quantity' => 1,
            ]);

            LibraryEntry::query()->create([
                'user_id' => $demoReader->id,
                'book_id' => $purchaseBook->id,
                'source' => 'purchase',
                'order_id' => $order->id,
                'granted_at' => now()->subDays(2),
            ]);
        }

        $freeJane = Book::query()->where('author_id', $jane->id)->where('access_type', 'FREE')->first();
        if ($freeJane) {
            LibraryEntry::query()->firstOrCreate(
                ['user_id' => $demoReader->id, 'book_id' => $freeJane->id],
                ['source' => 'free', 'order_id' => null, 'granted_at' => now()->subDay()]
            );

            UserBookEngagement::query()->create([
                'user_id' => $demoReader->id,
                'book_id' => $freeJane->id,
                'pages_read' => 42,
                'total_pages' => 200,
                'completion_percentage' => 21,
                'reading_time_seconds' => 3600,
                'last_sync_at' => now()->subHours(3),
            ]);
        }

        PlatformActivity::query()->create([
            'actor_id' => $admin->id,
            'subject_user_id' => $demoReader->id,
            'action' => 'demo.seed',
            'entity_type' => 'user',
            'entity_id' => (string) $demoReader->id,
            'metadata' => ['note' => 'Demo platform activity row'],
            'ip_address' => '127.0.0.1',
        ]);

        PlatformSetting::set('ads_enabled', '0');
        PlatformSetting::set('ads_network', 'adsense');
        PlatformSetting::set('ads_client_id', '');
        PlatformSetting::set('ads_slot_banner', '');
        PlatformSetting::set('ads_slot_feed', '');
        PlatformSetting::set('feature_flags_json', json_encode(['demo_catalog' => true, 'rewarded_ads' => false]));

        $blogHtml = CmsContentSanitizer::sanitize(
            '<h2>Welcome to the demo blog</h2>'.
            '<p>This page is seeded for demos. Hero images on the homepage use photos from <a href="https://picsum.photos" rel="noopener noreferrer">picsum.photos</a>; swap them for your brand assets anytime.</p>'.
            '<p>Delete or rewrite this post from <strong>Admin → CMS</strong> when you go live.</p>'
        );
        CmsPage::query()->updateOrCreate(
            ['slug' => 'blog'],
            ['title' => 'Blog', 'content' => $blogHtml, 'is_published' => true]
        );

        HomepagePayloadService::forgetCache();

        $this->command?->info('DemoDataSeeder: demo users (password demo12345):');
        $this->command?->line('  demo.author@demo.myscriptic.test');
        $this->command?->line('  demo.reader@demo.myscriptic.test');
        $this->command?->line('  demo.applicant@demo.myscriptic.test');
        $this->command?->info('Clear later: php artisan myscriptic:clear-demo');
    }
}

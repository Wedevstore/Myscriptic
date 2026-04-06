<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\Coupon;
use App\Models\PlatformSetting;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\TaxConfig;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /** Deterministic stock-style photos (no API keys). Safe to replace with your CDN later. */
    private static function pic(string $seed, int $w = 240, int $h = 360): string
    {
        return 'https://picsum.photos/seed/'.rawurlencode($seed)."/{$w}/{$h}";
    }

    /**
     * Demo accounts aligned with the Next.js mock auth provider.
     * Core users are not flagged is_demo (kept when you run myscriptic:clear-demo).
     */
    public function run(): void
    {
        $admin = User::query()->create([
            'name' => 'Admin User',
            'email' => 'admin@myscriptic.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'avatar' => self::pic('core-admin-avatar', 160, 160),
            'is_demo' => false,
        ]);

        $author = User::query()->create([
            'name' => 'Jane Austen',
            'email' => 'author@myscriptic.com',
            'password' => Hash::make('author123'),
            'role' => 'author',
            'avatar' => self::pic('core-author-jane', 160, 160),
            'is_demo' => false,
        ]);

        $reader = User::query()->create([
            'name' => 'John Reader',
            'email' => 'reader@myscriptic.com',
            'password' => Hash::make('reader123'),
            'role' => 'user',
            'avatar' => self::pic('core-reader-john', 160, 160),
            'is_demo' => false,
        ]);

        $planMonthly = SubscriptionPlan::query()->create([
            'name' => 'Pro Monthly',
            'slug' => 'pro-monthly',
            'price' => 9.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'unlimited_reading' => true,
            'status' => 'active',
            'sort_order' => 1,
        ]);

        SubscriptionPlan::query()->create([
            'name' => 'Pro Annual',
            'slug' => 'pro-annual',
            'price' => 99.00,
            'currency' => 'USD',
            'duration_days' => 365,
            'unlimited_reading' => true,
            'status' => 'active',
            'sort_order' => 2,
        ]);

        $readerSubEnd = now()->addDays(25);
        Subscription::query()->create([
            'user_id' => $reader->id,
            'plan_id' => $planMonthly->id,
            'subscription_order_id' => null,
            'starts_at' => now()->subDays(5),
            'ends_at' => $readerSubEnd,
            'status' => 'active',
        ]);

        $reader->update([
            'subscription_plan' => $planMonthly->name,
            'subscription_expires_at' => $readerSubEnd,
        ]);

        PlatformSetting::set('subscription_pool_commission_pct', '30');

        $lagosOpening = <<<'TEXT'
Chapter 1: The City That Never Sleeps

The Lagos sun had already begun its lazy descent by the time Adaeze Okonkwo stepped out of the yellow danfo and onto the cracked pavement of Victoria Island. Her leather satchel — a gift from her mother, worn smooth at the straps — hung heavy across her shoulder, stuffed with the manuscripts she had been editing all afternoon.

She paused at the intersection, watching the traffic policeman in his faded white uniform perform his daily ballet, arms slicing the air in gestures that only the most seasoned Lagos drivers could interpret.

Lagos. It never ceased to amaze her.
TEXT;

        $samples = [
            [
                'title' => 'The Lagos Chronicles',
                'description' => 'A literary journey through contemporary Lagos — family, ambition, and the pulse of the city.',
                'sample_excerpt' => $lagosOpening,
                'category' => 'Fiction',
                'tags' => ['africa', 'literary'],
                'cover_url' => self::pic('core-bk-lagos'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.8,
                'review_count' => 1240,
            ],
            [
                'title' => 'Atomic Habits: African Edition',
                'description' => 'Build better habits with examples grounded in everyday life across the continent.',
                'sample_excerpt' => "You do not rise to the level of your goals. You fall to the level of your systems.\n\nThis edition opens with market women in Ibadan who rebuilt their savings habits one tiny stack of receipts at a time — no drama, no apps, just repetition until the behaviour felt inevitable.",
                'category' => 'Self-Help',
                'tags' => ['habits', 'productivity'],
                'cover_url' => self::pic('core-bk-atomic'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 12.99,
                'is_new' => true,
                'is_trending' => true,
                'rating_avg' => 4.9,
                'review_count' => 3400,
            ],
            [
                'title' => 'Voices from the Savanna',
                'description' => 'A poetry collection on land, memory, and belonging.',
                'category' => 'Poetry',
                'tags' => ['poetry', 'nature'],
                'cover_url' => self::pic('core-bk-savanna'),
                'access_type' => 'FREE',
                'format' => 'ebook',
                'is_new' => true,
                'rating_avg' => 4.6,
                'review_count' => 780,
            ],
            [
                'title' => 'The Entrepreneur\'s Code',
                'description' => 'From side hustle to scalable business — frameworks that work in emerging markets.',
                'category' => 'Business',
                'tags' => ['startup', 'finance'],
                'cover_url' => self::pic('core-bk-entrepreneur'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.7,
                'review_count' => 2100,
            ],
            [
                'title' => 'Midnight in Accra',
                'description' => 'A contemporary romance set against the glow of Accra after dark.',
                'category' => 'Romance',
                'tags' => ['romance', 'urban'],
                'cover_url' => self::pic('core-bk-accra'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 8.99,
                'rating_avg' => 4.5,
                'review_count' => 920,
            ],
            [
                'title' => 'Tech Giants of Africa',
                'description' => 'Profiles of builders reshaping fintech, logistics, and media.',
                'category' => 'Technology',
                'tags' => ['tech', 'profiles'],
                'cover_url' => self::pic('core-bk-tech-giants'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_new' => true,
                'rating_avg' => 4.4,
                'review_count' => 560,
            ],
            [
                'title' => 'The Baobab Tree',
                'description' => 'An illustrated story for young readers about community and courage.',
                'category' => 'Children',
                'tags' => ['children', 'illustrated'],
                'cover_url' => self::pic('core-bk-baobab'),
                'access_type' => 'FREE',
                'format' => 'ebook',
                'rating_avg' => 4.8,
                'review_count' => 1560,
            ],
            [
                'title' => 'Currency of Knowledge',
                'description' => 'Economics and personal finance explained without jargon.',
                'category' => 'Finance',
                'tags' => ['finance', 'education'],
                'cover_url' => self::pic('core-bk-currency'),
                'access_type' => 'PAID',
                'format' => 'audiobook',
                'price' => 19.99,
                'rating_avg' => 4.3,
                'review_count' => 340,
            ],
            [
                'title' => 'Sacred Grounds',
                'description' => 'Historical fiction weaving oral tradition with colonial-era archives.',
                'category' => 'Historical',
                'tags' => ['history', 'fiction'],
                'cover_url' => self::pic('core-bk-sacred'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.6,
                'review_count' => 890,
            ],
            [
                'title' => 'Python for Data Scientists',
                'description' => 'Notebooks, pipelines, and deployment patterns for real-world teams.',
                'category' => 'Technology',
                'tags' => ['python', 'data'],
                'cover_url' => self::pic('core-bk-python'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 24.99,
                'is_new' => true,
                'rating_avg' => 4.7,
                'review_count' => 2800,
            ],
            [
                'title' => 'The River Between Us',
                'description' => 'Literary fiction about two families linked by a shared river.',
                'category' => 'Fiction',
                'tags' => ['literary', 'family'],
                'cover_url' => self::pic('core-bk-river'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'audiobook',
                'rating_avg' => 4.5,
                'review_count' => 670,
            ],
            [
                'title' => 'Leadership in Crisis',
                'description' => 'Decision-making under pressure — case studies from the field.',
                'category' => 'Leadership',
                'tags' => ['leadership', 'management'],
                'cover_url' => self::pic('core-bk-leadership'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.8,
                'review_count' => 1100,
            ],
            [
                'title' => 'Copper Sun Rising',
                'description' => 'Interlocking stories of migration, music, and memory across three cities.',
                'category' => 'Fiction',
                'tags' => ['literary', 'urban'],
                'cover_url' => self::pic('core-bk-013-copper'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.6,
                'review_count' => 1840,
            ],
            [
                'title' => 'The Taxman\'s Daughter',
                'description' => 'A sharp guide to personal tax planning and wealth habits.',
                'category' => 'Finance',
                'tags' => ['tax', 'money'],
                'cover_url' => self::pic('core-bk-014-taxman'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 11.99,
                'rating_avg' => 4.4,
                'review_count' => 412,
            ],
            [
                'title' => 'Selma Street Blues',
                'description' => 'Neighbourhood noir: a saxophonist uncovers a decade-old secret.',
                'category' => 'Fiction',
                'tags' => ['noir', 'mystery'],
                'cover_url' => self::pic('core-bk-015-selma'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 10.49,
                'is_new' => true,
                'rating_avg' => 4.5,
                'review_count' => 228,
            ],
            [
                'title' => 'Docker on a Budget',
                'description' => 'Ship small apps to the cloud without overspending on infra.',
                'category' => 'Technology',
                'tags' => ['devops', 'cloud'],
                'cover_url' => self::pic('core-bk-016-docker'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 15.99,
                'is_new' => true,
                'is_trending' => true,
                'rating_avg' => 4.7,
                'review_count' => 1520,
            ],
            [
                'title' => 'Morning Meditations',
                'description' => 'Five-minute rituals to reset your nervous system before work.',
                'category' => 'Self-Help',
                'tags' => ['mindfulness', 'health'],
                'cover_url' => self::pic('core-bk-017-morning'),
                'access_type' => 'FREE',
                'format' => 'ebook',
                'rating_avg' => 4.5,
                'review_count' => 5600,
            ],
            [
                'title' => 'Queen of the Terrace',
                'description' => 'Romantic comedy set on a bustling rooftop restaurant.',
                'category' => 'Romance',
                'tags' => ['romcom', 'food'],
                'cover_url' => self::pic('core-bk-018-terrace'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.3,
                'review_count' => 990,
            ],
            [
                'title' => 'Little Giants',
                'description' => 'Bedtime stories about kids who dream big — and help each other.',
                'category' => 'Children',
                'tags' => ['bedtime', 'friendship'],
                'cover_url' => self::pic('core-bk-019-giants'),
                'access_type' => 'FREE',
                'format' => 'ebook',
                'rating_avg' => 4.9,
                'review_count' => 2100,
            ],
            [
                'title' => 'Grain Routes',
                'description' => 'How trade roads shaped empires — and families — before the railways.',
                'category' => 'Historical',
                'tags' => ['trade', 'epic'],
                'cover_url' => self::pic('core-bk-020-grain'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 13.99,
                'rating_avg' => 4.6,
                'review_count' => 743,
            ],
            [
                'title' => 'The VC Playbook',
                'description' => 'Term sheets, cap tables, and founder-friendly negotiation.',
                'category' => 'Business',
                'tags' => ['venture', 'startups'],
                'cover_url' => self::pic('core-bk-021-vc'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'is_trending' => true,
                'rating_avg' => 4.8,
                'review_count' => 3100,
            ],
            [
                'title' => 'Nights in Dakar',
                'description' => 'Slow-burn romance between a DJ and a museum curator.',
                'category' => 'Romance',
                'tags' => ['music', 'contemporary'],
                'cover_url' => self::pic('core-bk-022-dakar'),
                'access_type' => 'PAID',
                'format' => 'audiobook',
                'price' => 9.49,
                'rating_avg' => 4.6,
                'review_count' => 445,
            ],
            [
                'title' => 'Ansible for Humans',
                'description' => 'Automate servers and sleep better at night.',
                'category' => 'Technology',
                'tags' => ['automation', 'linux'],
                'cover_url' => self::pic('core-bk-023-ansible'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 21.99,
                'rating_avg' => 4.5,
                'review_count' => 880,
            ],
            [
                'title' => 'Rhymes for Rainy Days',
                'description' => 'Short verses for windowsill days and thunder nights.',
                'category' => 'Poetry',
                'tags' => ['weather', 'comfort'],
                'cover_url' => self::pic('core-bk-024-rhymes'),
                'access_type' => 'FREE',
                'format' => 'ebook',
                'rating_avg' => 4.7,
                'review_count' => 1200,
            ],
            [
                'title' => 'Board Exam Survival',
                'description' => 'Study systems used by top medical and law candidates.',
                'category' => 'Self-Help',
                'tags' => ['exams', 'focus'],
                'cover_url' => self::pic('core-bk-025-board'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 6.99,
                'is_new' => true,
                'rating_avg' => 4.4,
                'review_count' => 3200,
            ],
            [
                'title' => 'The Copper Mine',
                'description' => 'A strike, a whistleblower, and a town divided.',
                'category' => 'Historical',
                'tags' => ['labor', 'drama'],
                'cover_url' => self::pic('core-bk-026-mine'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'rating_avg' => 4.5,
                'review_count' => 670,
            ],
            [
                'title' => 'African SF Anthology Vol. 1',
                'description' => 'Twelve futures from the continent — bold, strange, hopeful.',
                'category' => 'Sci-Fi',
                'tags' => ['anthology', 'future'],
                'cover_url' => self::pic('core-bk-027-sf-anth'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 16.99,
                'is_new' => true,
                'is_trending' => true,
                'rating_avg' => 4.8,
                'review_count' => 1890,
            ],
            [
                'title' => 'Smoothie Science',
                'description' => 'Nutrition myths busted — 80 blender-friendly recipes.',
                'category' => 'Lifestyle',
                'tags' => ['health', 'recipes'],
                'cover_url' => self::pic('core-bk-028-smoothie'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 8.99,
                'rating_avg' => 4.2,
                'review_count' => 2100,
            ],
            [
                'title' => 'Podcasting Gold',
                'description' => 'Audience growth, sponsors, and studio setup on a shoestring.',
                'category' => 'Business',
                'tags' => ['media', 'audio'],
                'cover_url' => self::pic('core-bk-029-podcast'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 14.99,
                'rating_avg' => 4.6,
                'review_count' => 540,
            ],
            [
                'title' => 'Kente & Algorithms',
                'description' => 'Pattern, recursion, and cultural motifs in modern software design.',
                'category' => 'Technology',
                'tags' => ['culture', 'patterns'],
                'cover_url' => self::pic('core-bk-030-kente'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'rating_avg' => 4.7,
                'review_count' => 920,
            ],
            [
                'title' => 'The Orphan Express',
                'description' => 'A train journey, a hidden map, and three unlikely friends.',
                'category' => 'Children',
                'tags' => ['adventure', 'middle-grade'],
                'cover_url' => self::pic('core-bk-031-orphan'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 5.99,
                'rating_avg' => 4.8,
                'review_count' => 760,
            ],
            [
                'title' => 'War Room Ethics',
                'description' => 'When the stakes are high, how do good leaders stay honest?',
                'category' => 'Leadership',
                'tags' => ['ethics', 'teams'],
                'cover_url' => self::pic('core-bk-032-warroom'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'audiobook',
                'rating_avg' => 4.5,
                'review_count' => 430,
            ],
            [
                'title' => 'Coffee Table Africa',
                'description' => 'Quarterly: architecture, fashion, and city guides — issue 12.',
                'category' => 'Magazine',
                'tags' => ['magazine', 'design'],
                'cover_url' => self::pic('core-bk-033-mag'),
                'access_type' => 'PAID',
                'format' => 'magazine',
                'price' => 4.99,
                'is_new' => true,
                'rating_avg' => 4.6,
                'review_count' => 890,
            ],
            [
                'title' => 'Listening to Lagos',
                'description' => 'Full-cast audio drama — traffic, hope, and hustle in twelve acts.',
                'category' => 'Fiction',
                'tags' => ['audio', 'drama'],
                'cover_url' => self::pic('core-bk-034-lagos-audio'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'audiobook',
                'is_trending' => true,
                'rating_avg' => 4.9,
                'review_count' => 2400,
            ],
            [
                'title' => 'Garden State Mind',
                'description' => 'Urban gardening as therapy — balconies to backyards.',
                'category' => 'Self-Help',
                'tags' => ['nature', 'wellbeing'],
                'cover_url' => self::pic('core-bk-035-garden'),
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'rating_avg' => 4.4,
                'review_count' => 1100,
            ],
            [
                'title' => 'Eclipse over Addis',
                'description' => 'First contact, ancient observatories, and a city under blackout.',
                'category' => 'Sci-Fi',
                'tags' => ['first-contact', 'thriller'],
                'cover_url' => self::pic('core-bk-036-eclipse'),
                'access_type' => 'PAID',
                'format' => 'ebook',
                'price' => 12.49,
                'is_trending' => true,
                'rating_avg' => 4.7,
                'review_count' => 1450,
            ],
        ];

        foreach ($samples as $row) {
            Book::query()->create([
                ...$row,
                'author_id' => $author->id,
                'approval_status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $admin->id,
                'currency' => 'USD',
            ]);
        }

        Coupon::query()->create([
            'code' => 'READ20',
            'discount_type' => 'pct',
            'discount_value' => 20,
            'expires_at' => now()->addYear(),
            'max_uses' => 500,
            'used_count' => 0,
            'min_order_amount' => 0,
            'is_active' => true,
        ]);

        Coupon::query()->create([
            'code' => 'WELCOME5',
            'discount_type' => 'fixed',
            'discount_value' => 5,
            'expires_at' => now()->addMonths(6),
            'max_uses' => 100,
            'used_count' => 0,
            'min_order_amount' => 10,
            'is_active' => true,
        ]);

        TaxConfig::query()->create([
            'name' => 'VAT',
            'rate' => 0.075,
            'is_enabled' => true,
            'country_code' => null,
        ]);

        TaxConfig::query()->create([
            'name' => 'GST',
            'rate' => 0.10,
            'is_enabled' => false,
            'country_code' => null,
        ]);

        $this->call(Phase4CmsSeeder::class);
        $this->call(DemoDataSeeder::class);
    }
}

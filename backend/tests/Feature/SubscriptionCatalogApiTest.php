<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    protected function createActiveSubscriber(): User
    {
        $user = User::factory()->create(['role' => 'user']);
        $plan = SubscriptionPlan::query()->create([
            'name' => 'Pro Monthly',
            'slug' => 'pro-monthly',
            'price' => 9.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'unlimited_reading' => true,
            'status' => 'active',
            'sort_order' => 0,
        ]);
        Subscription::query()->create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'subscription_order_id' => null,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
            'status' => 'active',
        ]);

        return $user;
    }

    public function test_catalog_requires_active_subscription(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/subscription/catalog')->assertForbidden();
    }

    public function test_catalog_returns_free_and_subscription_books(): void
    {
        $user = $this->createActiveSubscriber();
        Sanctum::actingAs($user);

        Book::query()->create([
            'author_id' => $user->id,
            'title' => 'Sub Title',
            'access_type' => 'SUBSCRIPTION',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);
        Book::query()->create([
            'author_id' => $user->id,
            'title' => 'Paid Only',
            'access_type' => 'PAID',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);

        $res = $this->getJson('/api/subscription/catalog?per_page=50')->assertOk();
        $titles = collect($res->json('data'))->pluck('title')->all();
        $this->assertContains('Sub Title', $titles);
        $this->assertNotContains('Paid Only', $titles);
    }

    public function test_catalog_pagination_and_per_page_cap(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $user = $this->createActiveSubscriber();
        Sanctum::actingAs($user);

        for ($i = 0; $i < 5; $i++) {
            Book::query()->create([
                'author_id' => $author->id,
                'title' => "Catalog Page Book {$i}",
                'access_type' => 'SUBSCRIPTION',
                'format' => 'ebook',
                'approval_status' => 'approved',
            ]);
        }

        $p1 = $this->getJson('/api/subscription/catalog?per_page=2&page=1')->assertOk();
        $p2 = $this->getJson('/api/subscription/catalog?per_page=2&page=2')->assertOk();

        $this->assertSame(2, $p1->json('meta.per_page'));
        $this->assertSame(5, $p1->json('meta.total'));
        $this->assertSame(3, $p1->json('meta.last_page'));
        $this->assertCount(2, $p1->json('data'));
        $this->assertCount(2, $p2->json('data'));

        $big = $this->getJson('/api/subscription/catalog?per_page=999')->assertOk();
        $this->assertSame(500, $big->json('meta.per_page'));
    }
}

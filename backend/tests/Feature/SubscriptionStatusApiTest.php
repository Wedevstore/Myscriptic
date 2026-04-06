<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionStatusApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_status_requires_authentication(): void
    {
        $this->getJson('/api/subscription/status')->assertUnauthorized();
    }

    public function test_subscription_status_inactive_when_user_has_none(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/subscription/status')
            ->assertOk()
            ->assertJson([
                'active' => false,
                'plan' => null,
                'expires_at' => null,
                'subscription_id' => null,
            ]);
    }

    public function test_subscription_status_returns_active_plan_for_current_subscription(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::query()->create([
            'name' => 'Pro Monthly',
            'slug' => 'pro-monthly-'.uniqid(),
            'price' => 9.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'unlimited_reading' => true,
            'status' => 'active',
            'sort_order' => 0,
        ]);

        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'subscription_order_id' => null,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
            'status' => 'active',
            'canceled_at' => null,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/subscription/status')
            ->assertOk()
            ->assertJsonPath('active', true)
            ->assertJsonPath('plan.id', (string) $plan->id)
            ->assertJsonPath('plan.name', 'Pro Monthly')
            ->assertJsonPath('plan.slug', $plan->slug)
            ->assertJsonPath('subscription_id', (string) $subscription->id);
    }

    public function test_subscription_cancel_requires_authentication(): void
    {
        $this->postJson('/api/subscription/cancel')->assertUnauthorized();
    }

    public function test_subscription_cancel_422_when_no_active_subscription(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/subscription/cancel')
            ->assertStatus(422)
            ->assertJson(['message' => 'No active subscription.']);
    }

    public function test_subscription_cancel_sets_canceled_at_and_returns_access_until(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::query()->create([
            'name' => 'Annual',
            'slug' => 'annual-'.uniqid(),
            'price' => 99,
            'currency' => 'USD',
            'duration_days' => 365,
            'unlimited_reading' => true,
            'status' => 'active',
            'sort_order' => 0,
        ]);

        $ends = now()->addMonths(2);
        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'subscription_order_id' => null,
            'starts_at' => now()->subMonth(),
            'ends_at' => $ends,
            'status' => 'active',
            'canceled_at' => null,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/subscription/cancel')
            ->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonPath('access_until', $ends->toIso8601String());

        $subscription->refresh();
        $this->assertNotNull($subscription->canceled_at);
    }
}

<?php

namespace Tests\Feature;

use App\Models\RevenueCycle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminRevenueCyclesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_revenue_cycles_requires_authentication(): void
    {
        $this->getJson('/api/admin/revenue-cycles')->assertUnauthorized();
    }

    public function test_revenue_cycles_requires_admin(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/revenue-cycles')->assertForbidden();
    }

    public function test_admin_lists_revenue_cycles(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        RevenueCycle::query()->create([
            'period_label' => '2026-01',
            'cycle_start' => '2026-01-01',
            'cycle_end' => '2026-01-31',
            'gross_subscription_revenue' => 1000,
            'admin_commission_pct' => 30,
            'admin_earnings' => 300,
            'author_pool' => 700,
            'total_engagement_weight' => 1.5,
            'status' => 'open',
        ]);

        $this->getJson('/api/admin/revenue-cycles')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.period_label', '2026-01')
            ->assertJsonPath('data.0.status', 'open');
    }
}

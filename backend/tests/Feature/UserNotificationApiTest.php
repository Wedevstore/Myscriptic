<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserNotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_notifications_requires_authentication(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
    }

    public function test_user_lists_notifications_newest_first(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'info',
            'title' => 'Older',
            'body' => 'First',
            'data' => [],
            'read_at' => null,
        ]);
        UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'promo',
            'title' => 'Newer',
            'body' => 'Second',
            'data' => [],
            'read_at' => null,
        ]);

        $this->getJson('/api/notifications?per_page=10')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Newer')
            ->assertJsonPath('data.1.title', 'Older');
    }

    public function test_mark_read_updates_read_at(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $n = UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'info',
            'title' => 'Unread',
            'body' => 'Body',
            'data' => [],
            'read_at' => null,
        ]);

        $res = $this->patchJson("/api/notifications/{$n->id}/read")->assertOk();
        $this->assertNotNull($res->json('data.read_at'));

        $this->assertNotNull($n->fresh()->read_at);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AuthorApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorApplicationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_apply_requires_authentication(): void
    {
        $this->postJson('/api/author/apply', [
            'bio' => 'Writer bio',
            'payout_method' => 'paystack',
            'payout_details' => ['paystack_email' => 'pay@example.test'],
        ])->assertUnauthorized();
    }

    public function test_apply_creates_pending_application(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->postJson('/api/author/apply', [
            'bio' => 'I write literary fiction.',
            'payout_method' => 'paystack',
            'payout_details' => ['paystack_email' => 'pay@example.test'],
        ])
            ->assertCreated()
            ->assertJsonStructure(['application_id']);

        $this->assertDatabaseHas('author_applications', [
            'user_id' => $user->id,
            'status' => 'pending',
            'payout_method' => 'paystack',
        ]);
    }

    public function test_apply_rejected_when_already_author(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $this->postJson('/api/author/apply', [
            'bio' => 'Bio',
            'payout_method' => 'paypal',
            'payout_details' => ['paypal_email' => 'p@example.test'],
        ])->assertStatus(422);
    }

    public function test_apply_rejected_when_pending_exists(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        AuthorApplication::query()->create([
            'user_id' => $user->id,
            'bio' => 'Existing',
            'payout_method' => 'paystack',
            'payout_details' => [],
            'status' => 'pending',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/author/apply', [
            'bio' => 'Another bio',
            'payout_method' => 'paypal',
            'payout_details' => ['paypal_email' => 'p@example.test'],
        ])->assertStatus(422);
    }
}

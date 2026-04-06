<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorFollowApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_trending_authors_is_public(): void
    {
        User::factory()->create([
            'role' => 'author',
            'email' => 'a@trending.test',
        ]);

        $this->getJson('/api/authors/trending')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'avatar', 'books', 'followers']]]);
    }

    public function test_trending_authors_respects_limit_query(): void
    {
        foreach (range(1, 5) as $i) {
            User::factory()->create([
                'role' => 'author',
                'email' => "trend{$i}@test.example",
            ]);
        }

        $this->getJson('/api/authors/trending?limit=3')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_follow_requires_authentication(): void
    {
        $author = User::factory()->create(['role' => 'author']);

        $this->postJson("/api/authors/{$author->id}/follow")->assertUnauthorized();
    }

    public function test_follow_and_unfollow_round_trip(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $reader = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($reader);

        $this->postJson("/api/authors/{$author->id}/follow")->assertOk()->assertJson(['ok' => true]);

        $this->getJson('/api/me/followed-authors')
            ->assertOk()
            ->assertJson(['data' => [(string) $author->id]]);

        $this->deleteJson("/api/authors/{$author->id}/follow")->assertOk();

        $this->getJson('/api/me/followed-authors')
            ->assertOk()
            ->assertJson(['data' => []]);
    }

    public function test_cannot_follow_self(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $this->postJson("/api/authors/{$author->id}/follow")
            ->assertStatus(422);
    }

    public function test_cannot_follow_non_author_user(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        $other  = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($reader);

        $this->postJson("/api/authors/{$other->id}/follow")->assertNotFound();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorPublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_author_profile_returns_shape_for_author_role(): void
    {
        $author = User::factory()->create([
            'role' => 'author',
            'name' => 'Public Author',
            'avatar' => 'https://example.test/a.png',
        ]);

        $this->getJson("/api/authors/{$author->id}")
            ->assertOk()
            ->assertJsonPath('data.id', (string) $author->id)
            ->assertJsonPath('data.name', 'Public Author')
            ->assertJsonPath('data.avatar', 'https://example.test/a.png')
            ->assertJsonStructure(['data' => ['id', 'name', 'avatar', 'books', 'followers', 'courses']])
            ->assertJsonPath('data.courses', []);
    }

    public function test_public_author_profile_404_for_non_author(): void
    {
        $reader = User::factory()->create(['role' => 'user']);

        $this->getJson("/api/authors/{$reader->id}")->assertNotFound();
    }
}

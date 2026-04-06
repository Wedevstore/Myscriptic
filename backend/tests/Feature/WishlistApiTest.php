<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WishlistApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_wishlist_requires_authentication(): void
    {
        $this->getJson('/api/wishlist')->assertUnauthorized();
        $this->postJson('/api/wishlist', ['book_id' => '1'])->assertUnauthorized();
        $this->deleteJson('/api/wishlist/1')->assertUnauthorized();
    }

    public function test_add_list_remove_round_trip(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        $author = User::factory()->create(['role' => 'author']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Wish Me',
            'category' => 'Fiction',
            'access_type' => 'PAID',
            'format' => 'ebook',
            'price' => 9.99,
            'currency' => 'USD',
            'approval_status' => 'approved',
        ]);

        Sanctum::actingAs($reader);

        $this->getJson('/api/wishlist')->assertOk()->assertJson(['data' => []]);

        $this->postJson('/api/wishlist', ['book_id' => (string) $book->id])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->getJson('/api/wishlist')
            ->assertOk()
            ->assertJson(['data' => [(string) $book->id]]);

        $this->postJson('/api/wishlist', ['book_id' => (string) $book->id])
            ->assertOk();

        $this->assertSame(1, WishlistItem::query()->where('user_id', $reader->id)->count());

        $this->deleteJson("/api/wishlist/{$book->id}")->assertOk()->assertJson(['ok' => true]);

        $this->getJson('/api/wishlist')->assertOk()->assertJson(['data' => []]);
    }

    public function test_cannot_add_unapproved_book(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        $author = User::factory()->create(['role' => 'author']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Pending',
            'category' => 'Fiction',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'pending',
        ]);

        Sanctum::actingAs($reader);

        $this->postJson('/api/wishlist', ['book_id' => (string) $book->id])
            ->assertStatus(404);
    }

    public function test_invalid_book_id_validation(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($reader);

        $this->postJson('/api/wishlist', [])->assertStatus(422);
        $this->deleteJson('/api/wishlist/abc')->assertNotFound();
    }
}

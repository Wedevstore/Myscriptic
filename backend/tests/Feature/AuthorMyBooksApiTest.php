<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\User;
use App\Models\UserBookEngagement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorMyBooksApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_my_books_requires_author_role(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($reader);

        $this->getJson('/api/author/my-books')->assertForbidden();
    }

    public function test_my_books_returns_only_own_books(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $other = User::factory()->create(['role' => 'author']);

        Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Mine',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'pending',
        ]);
        Book::query()->create([
            'author_id' => $other->id,
            'title' => 'Theirs',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);

        Sanctum::actingAs($author);

        $this->getJson('/api/author/my-books')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Mine')
            ->assertJsonPath('data.0.engagement.readerCount', 0)
            ->assertJsonPath('data.0.engagement.pagesRead', 0);
    }

    public function test_my_books_includes_engagement_aggregates_per_book(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $readerA = User::factory()->create(['role' => 'user']);
        $readerB = User::factory()->create(['role' => 'user']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Engaged',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);

        UserBookEngagement::query()->create([
            'user_id' => $readerA->id,
            'book_id' => $book->id,
            'pages_read' => 12,
            'total_pages' => 200,
            'completion_percentage' => 6.0,
            'reading_time_seconds' => 120,
        ]);
        UserBookEngagement::query()->create([
            'user_id' => $readerB->id,
            'book_id' => $book->id,
            'pages_read' => 8,
            'total_pages' => 200,
            'completion_percentage' => 4.0,
            'reading_time_seconds' => 80,
        ]);

        Sanctum::actingAs($author);

        $this->getJson('/api/author/my-books')
            ->assertOk()
            ->assertJsonPath('data.0.engagement.readerCount', 2)
            ->assertJsonPath('data.0.engagement.pagesRead', 20)
            ->assertJsonPath('data.0.engagement.avgCompletionPct', 5);
    }

    public function test_author_can_delete_own_book(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Delete me',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'pending',
        ]);
        Sanctum::actingAs($author);

        $this->deleteJson("/api/books/{$book->id}")->assertNoContent();

        $this->assertDatabaseMissing('books', ['id' => $book->id]);
    }

    public function test_author_cannot_delete_other_book(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $other = User::factory()->create(['role' => 'author']);
        $book = Book::query()->create([
            'author_id' => $other->id,
            'title' => 'Not yours',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);
        Sanctum::actingAs($author);

        $this->deleteJson("/api/books/{$book->id}")->assertForbidden();
        $this->assertDatabaseHas('books', ['id' => $book->id]);
    }

    public function test_delete_book_requires_authentication(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Protected',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'pending',
        ]);

        $this->deleteJson("/api/books/{$book->id}")->assertUnauthorized();
    }
}

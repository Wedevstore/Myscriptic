<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\LibraryEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LibraryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_library_requires_authentication(): void
    {
        $this->getJson('/api/library')->assertUnauthorized();
    }

    public function test_library_returns_user_entries_with_book_metadata(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        $author = User::factory()->create(['role' => 'author']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Shelf Test',
            'category' => 'Fiction',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);

        LibraryEntry::query()->create([
            'user_id' => $reader->id,
            'book_id' => $book->id,
            'source' => 'purchase',
            'order_id' => null,
            'granted_at' => now(),
        ]);

        Sanctum::actingAs($reader);

        $this->getJson('/api/library')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.book_id', (string) $book->id)
            ->assertJsonPath('data.0.source', 'purchase')
            ->assertJsonPath('data.0.book.title', 'Shelf Test')
            ->assertJsonPath('data.0.book.category', 'Fiction')
            ->assertJsonPath('data.0.book.author', $author->name);
    }
}

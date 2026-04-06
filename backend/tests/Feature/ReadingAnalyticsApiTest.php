<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\User;
use App\Models\UserBookEngagement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReadingAnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_reading_analytics_requires_authentication(): void
    {
        $this->getJson('/api/reading-analytics')->assertUnauthorized();
    }

    public function test_reading_analytics_returns_empty_summary_when_no_engagements(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($reader);

        $this->getJson('/api/reading-analytics')
            ->assertOk()
            ->assertJsonPath('data.summary.total_reading_time_seconds', 0)
            ->assertJsonPath('data.summary.total_pages_read', 0)
            ->assertJsonPath('data.summary.books_tracked', 0)
            ->assertJsonPath('data.summary.books_with_activity', 0)
            ->assertJsonPath('data.summary.books_completed', 0)
            ->assertJsonPath('data.summary.average_completion_pct', 0)
            ->assertJsonCount(0, 'data.books');
    }

    public function test_reading_analytics_returns_only_current_user_books(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $readerA = User::factory()->create(['role' => 'user']);
        $readerB = User::factory()->create(['role' => 'user']);

        $bookMine = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Alpha',
            'category' => 'Fiction',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);
        $bookTheirs = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Beta',
            'category' => 'Business',
            'access_type' => 'FREE',
            'format' => 'audiobook',
            'approval_status' => 'approved',
        ]);

        UserBookEngagement::query()->create([
            'user_id' => $readerA->id,
            'book_id' => $bookMine->id,
            'pages_read' => 10,
            'total_pages' => 100,
            'completion_percentage' => 10.0,
            'reading_time_seconds' => 100,
        ]);
        UserBookEngagement::query()->create([
            'user_id' => $readerB->id,
            'book_id' => $bookTheirs->id,
            'pages_read' => 99,
            'total_pages' => 100,
            'completion_percentage' => 99.0,
            'reading_time_seconds' => 9999,
        ]);

        Sanctum::actingAs($readerA);

        $this->getJson('/api/reading-analytics')
            ->assertOk()
            ->assertJsonPath('data.summary.books_tracked', 1)
            ->assertJsonPath('data.summary.total_pages_read', 10)
            ->assertJsonPath('data.summary.total_reading_time_seconds', 100)
            ->assertJsonPath('data.summary.books_with_activity', 1)
            ->assertJsonPath('data.summary.books_completed', 0)
            ->assertJsonPath('data.summary.average_completion_pct', 10)
            ->assertJsonCount(1, 'data.books')
            ->assertJsonPath('data.books.0.title', 'Alpha')
            ->assertJsonPath('data.books.0.category', 'Fiction')
            ->assertJsonPath('data.books.0.format', 'ebook');
    }
}

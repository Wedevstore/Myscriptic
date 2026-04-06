<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookIndexAuthorFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_filters_by_author_id(): void
    {
        $author1 = User::factory()->create(['role' => 'author']);
        $author2 = User::factory()->create(['role' => 'author']);

        Book::query()->create([
            'author_id' => $author1->id,
            'title' => 'Alpha',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);
        Book::query()->create([
            'author_id' => $author1->id,
            'title' => 'Beta',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);
        Book::query()->create([
            'author_id' => $author2->id,
            'title' => 'Other',
            'access_type' => 'FREE',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);

        $res = $this->getJson("/api/books?author_id={$author1->id}&per_page=48")
            ->assertOk();

        $titles = collect($res->json('data'))->pluck('title')->all();
        $this->assertCount(2, $titles);
        $this->assertContains('Alpha', $titles);
        $this->assertContains('Beta', $titles);
        $this->assertNotContains('Other', $titles);
    }
}

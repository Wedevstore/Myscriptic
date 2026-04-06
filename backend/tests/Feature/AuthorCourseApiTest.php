<?php

namespace Tests\Feature;

use App\Models\AuthorCourse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorCourseApiTest extends TestCase
{
    use RefreshDatabase;

    private const VALID_YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    public function test_courses_index_lists_only_published_with_lesson_count(): void
    {
        $author = User::factory()->create(['role' => 'author']);

        $pub = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Public Course',
            'slug' => 'public-course',
            'description' => 'Hi',
            'thumbnail_url' => null,
            'published' => true,
        ]);
        $pub->lessons()->create([
            'title' => 'L1',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Draft',
            'slug' => 'draft-only',
            'description' => null,
            'thumbnail_url' => null,
            'published' => false,
        ]);

        $res = $this->getJson('/api/courses')->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('public-course', $data[0]['slug']);
        $this->assertSame(1, $data[0]['lesson_count']);
        $this->assertArrayNotHasKey('lessons', $data[0]);
        $this->assertSame('SUBSCRIPTION', $data[0]['access_type']);
    }

    public function test_courses_index_filters_by_query_param_q(): void
    {
        $author = User::factory()->create(['role' => 'author']);

        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Alpha Workshop',
            'slug' => 'alpha-workshop',
            'description' => 'Beginner friendly',
            'thumbnail_url' => null,
            'published' => true,
        ]);
        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Beta Club',
            'slug' => 'beta-club',
            'description' => 'Advanced',
            'thumbnail_url' => null,
            'published' => true,
        ]);

        $this->getJson('/api/courses?q=Alpha')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'alpha-workshop');

        $this->getJson('/api/courses?q=advanced')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'beta-club');
    }

    public function test_courses_index_accepts_very_long_q_without_error(): void
    {
        $this->getJson('/api/courses?q='.str_repeat('z', 400))->assertOk();
    }

    public function test_courses_show_published_without_auth(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $course = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Open',
            'slug' => 'open-slug',
            'description' => 'Desc',
            'thumbnail_url' => null,
            'published' => true,
        ]);
        $course->lessons()->create([
            'title' => 'One',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        $this->getJson('/api/courses/open-slug')
            ->assertOk()
            ->assertJsonPath('data.slug', 'open-slug')
            ->assertJsonPath('data.lessons.0.title', 'One');
    }

    public function test_courses_show_unpublished_returns_404_without_preview(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Hidden',
            'slug' => 'hidden-slug',
            'description' => null,
            'thumbnail_url' => null,
            'published' => false,
        ]);

        $this->getJson('/api/courses/hidden-slug')->assertNotFound();
    }

    public function test_courses_show_draft_preview_for_owner_with_token(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Draft',
            'slug' => 'draft-slug',
            'description' => null,
            'thumbnail_url' => null,
            'published' => false,
        ]);

        Sanctum::actingAs($author);

        $this->getJson('/api/courses/draft-slug?preview=1')
            ->assertOk()
            ->assertJsonPath('data.slug', 'draft-slug')
            ->assertJsonPath('data.published', false);
    }

    public function test_courses_show_draft_preview_denied_for_other_user(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $other = User::factory()->create(['role' => 'author']);

        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Draft',
            'slug' => 'draft-2',
            'description' => null,
            'thumbnail_url' => null,
            'published' => false,
        ]);

        Sanctum::actingAs($other);

        $this->getJson('/api/courses/draft-2?preview=1')->assertNotFound();
    }

    public function test_author_courses_crud_requires_author_role(): void
    {
        $reader = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($reader);

        $this->getJson('/api/author/courses')->assertForbidden();
        $this->postJson('/api/author/courses', [])->assertForbidden();
    }

    public function test_author_create_paid_course_requires_price(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $this->postJson('/api/author/courses', [
            'title' => 'Paid only',
            'access_type' => 'PAID',
            'published' => false,
            'lessons' => [
                ['title' => 'L', 'video_url' => self::VALID_YT],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['price']);
    }

    public function test_author_create_paid_course_with_price_succeeds(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $this->postJson('/api/author/courses', [
            'title' => 'Paid OK',
            'slug' => 'paid-ok',
            'access_type' => 'PAID',
            'price' => 12.5,
            'currency' => 'USD',
            'published' => true,
            'lessons' => [
                ['title' => 'L', 'video_url' => self::VALID_YT],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.access_type', 'PAID')
            ->assertJsonPath('data.price', 12.5)
            ->assertJsonPath('data.currency', 'USD');

        $this->getJson('/api/courses/paid-ok')
            ->assertOk()
            ->assertJsonPath('data.access_type', 'PAID')
            ->assertJsonPath('data.price', 12.5)
            ->assertJsonPath('data.lessons.0.video_url', self::VALID_YT);
    }

    public function test_public_paid_course_redacts_video_urls_for_guest(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $course = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Paid Guest',
            'slug' => 'paid-guest',
            'description' => null,
            'thumbnail_url' => null,
            'published' => true,
            'access_type' => 'PAID',
            'price' => 4.99,
            'currency' => 'USD',
        ]);
        $course->lessons()->create([
            'title' => 'Secret',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        $this->getJson('/api/courses/paid-guest')
            ->assertOk()
            ->assertJsonPath('data.access_type', 'PAID')
            ->assertJsonPath('data.lessons.0.title', 'Secret')
            ->assertJsonPath('data.lessons.0.video_url', '');
    }

    public function test_public_paid_course_includes_video_urls_for_owner(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $course = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Paid Owner',
            'slug' => 'paid-owner',
            'description' => null,
            'thumbnail_url' => null,
            'published' => true,
            'access_type' => 'PAID',
            'price' => 3,
            'currency' => 'USD',
        ]);
        $course->lessons()->create([
            'title' => 'L',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        Sanctum::actingAs($author);

        $this->getJson('/api/courses/paid-owner')
            ->assertOk()
            ->assertJsonPath('data.lessons.0.video_url', self::VALID_YT);
    }

    public function test_public_paid_course_redacts_video_for_non_owner_even_when_authenticated(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        $reader = User::factory()->create(['role' => 'user']);
        $course = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Paid Reader',
            'slug' => 'paid-reader',
            'description' => null,
            'thumbnail_url' => null,
            'published' => true,
            'access_type' => 'PAID',
            'price' => 10,
            'currency' => 'USD',
        ]);
        $course->lessons()->create([
            'title' => 'L',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        Sanctum::actingAs($reader);

        $this->getJson('/api/courses/paid-reader')
            ->assertOk()
            ->assertJsonPath('data.lessons.0.video_url', '');
    }

    public function test_author_create_course_rejects_invalid_video_url(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $this->postJson('/api/author/courses', [
            'title' => 'Bad',
            'published' => false,
            'lessons' => [
                ['title' => 'L', 'video_url' => 'https://example.com/evil.mp4'],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'Lesson 1 must use a YouTube or Vimeo video URL.']);
    }

    public function test_author_create_update_delete_course_round_trip(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $create = $this->postJson('/api/author/courses', [
            'title' => 'New Course',
            'slug' => 'new-course',
            'description' => 'Hello',
            'published' => true,
            'lessons' => [
                ['title' => 'A', 'video_url' => self::VALID_YT],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'new-course')
            ->assertJsonPath('data.access_type', 'SUBSCRIPTION');

        $id = $create->json('data.id');

        $this->putJson("/api/author/courses/{$id}", [
            'title' => 'Renamed',
            'published' => true,
            'lessons' => [
                ['title' => 'B', 'video_url' => 'https://vimeo.com/148751763'],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Renamed')
            ->assertJsonPath('data.lessons.0.title', 'B');

        $this->deleteJson("/api/author/courses/{$id}")->assertNoContent();

        $this->getJson('/api/courses/new-course')->assertNotFound();
    }

    public function test_public_author_profile_includes_published_courses(): void
    {
        $author = User::factory()->create(['role' => 'author', 'name' => 'Course Author']);

        $course = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'On Profile',
            'slug' => 'on-profile',
            'description' => null,
            'thumbnail_url' => 'https://example.test/thumb.jpg',
            'published' => true,
        ]);
        $course->lessons()->create([
            'title' => 'L',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        $this->getJson("/api/authors/{$author->id}")
            ->assertOk()
            ->assertJsonPath('data.courses.0.slug', 'on-profile')
            ->assertJsonPath('data.courses.0.title', 'On Profile')
            ->assertJsonPath('data.courses.0.lesson_count', 1)
            ->assertJsonPath('data.courses.0.thumbnail_url', 'https://example.test/thumb.jpg')
            ->assertJsonPath('data.courses.0.access_type', 'SUBSCRIPTION');
    }

    public function test_admin_author_courses_index_requires_admin(): void
    {
        $author = User::factory()->create(['role' => 'author']);
        Sanctum::actingAs($author);

        $this->getJson('/api/admin/author-courses')->assertForbidden();
    }

    public function test_admin_author_courses_index_lists_courses(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $author = User::factory()->create(['role' => 'author']);

        $course = AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Listed',
            'slug' => 'listed',
            'description' => null,
            'thumbnail_url' => null,
            'published' => true,
        ]);
        $course->lessons()->create([
            'title' => 'L',
            'video_url' => self::VALID_YT,
            'sort_order' => 0,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/author-courses')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'listed')
            ->assertJsonPath('data.0.lessons_count', 1);
    }
}

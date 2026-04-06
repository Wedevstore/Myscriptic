<?php

namespace Tests\Feature;

use App\Models\AuthorCourse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_includes_author_courses_total(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $author = User::factory()->create(['role' => 'author']);

        AuthorCourse::query()->create([
            'user_id' => $author->id,
            'title' => 'Listed',
            'slug' => 'listed-dash',
            'description' => null,
            'thumbnail_url' => null,
            'published' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('author_courses_total', 1);
    }
}

<?php

namespace Tests\Feature;

use App\Models\ContactSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminContactSubmissionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_submissions_requires_authentication(): void
    {
        $this->getJson('/api/admin/contact-submissions')->assertUnauthorized();
    }

    public function test_contact_submissions_requires_admin_role(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/contact-submissions')->assertForbidden();
    }

    public function test_admin_lists_contact_submissions_newest_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        ContactSubmission::query()->create([
            'name' => 'First',
            'email' => 'first@example.test',
            'topic' => 'General',
            'message' => 'Older',
            'author_ref' => null,
            'ip_address' => '127.0.0.1',
        ]);
        $second = ContactSubmission::query()->create([
            'name' => 'Second',
            'email' => 'second@example.test',
            'topic' => 'Support',
            'message' => 'Newer',
            'author_ref' => 'auth_1',
            'ip_address' => null,
        ]);

        $res = $this->getJson('/api/admin/contact-submissions?per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.current_page', 1);

        $data = $res->json('data');
        $this->assertIsArray($data);
        $this->assertCount(2, $data);
        $this->assertSame((string) $second->id, $data[0]['id']);
        $this->assertSame('Second', $data[0]['name']);
        $this->assertSame('auth_1', $data[0]['author_ref']);
        $this->assertSame('First', $data[1]['name']);
    }
}

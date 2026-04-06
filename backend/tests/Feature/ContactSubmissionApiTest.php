<?php

namespace Tests\Feature;

use App\Models\ContactSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactSubmissionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_stores_submission(): void
    {
        $this->postJson('/api/contact', [
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.test',
            'topic' => 'General Enquiry',
            'message' => 'Hello from the test suite.',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Thanks — we received your message.');

        $this->assertDatabaseHas('contact_submissions', [
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.test',
            'topic' => 'General Enquiry',
            'author_ref' => null,
        ]);
    }

    public function test_contact_accepts_optional_author_ref(): void
    {
        $this->postJson('/api/contact', [
            'name' => 'Reader',
            'email' => 'reader@example.test',
            'topic' => 'Author / Publishing',
            'message' => 'Question about an author.',
            'author_ref' => 'auth_001',
        ])->assertOk();

        $row = ContactSubmission::query()->first();
        $this->assertSame('auth_001', $row->author_ref);
    }

    public function test_contact_validation_errors(): void
    {
        $this->postJson('/api/contact', [
            'name' => '',
            'email' => 'not-an-email',
            'topic' => '',
            'message' => '',
        ])->assertStatus(422);

        $this->assertSame(0, ContactSubmission::query()->count());
    }
}

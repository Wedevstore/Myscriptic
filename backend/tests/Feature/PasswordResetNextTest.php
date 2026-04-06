<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetNextTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_succeeds_with_valid_internal_next(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'reader@test.example']);

        $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
            'next'  => '/cart',
        ])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_does_not_store_protocol_or_protocol_relative_next(): void
    {
        Notification::fake();

        $cases = [
            ['email' => 'evil-https@test.example', 'next' => 'https://evil.example'],
            ['email' => 'evil-slash@test.example', 'next' => '//evil.example/path'],
        ];

        foreach ($cases as $case) {
            $user = User::factory()->create(['email' => $case['email']]);

            $this->postJson('/api/auth/forgot-password', [
                'email' => $user->email,
                'next'  => $case['next'],
            ])->assertOk();

            $this->assertNull(Cache::get('pw_reset_next:'.mb_strtolower($user->email)));
        }
    }

    public function test_reset_email_includes_next_query_when_cached(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'withnext@test.example']);

        $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
            'next'  => '/library',
        ])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $mail = $notification->toMail($user);
            $url  = $mail->actionUrl ?? '';

            return str_contains($url, 'next=') && str_contains($url, '%2Flibrary');
        });
    }
}

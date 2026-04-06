<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_patch_me_requires_authentication(): void
    {
        $this->patchJson('/api/auth/me', ['name' => 'New Name'])->assertUnauthorized();
    }

    public function test_user_can_update_display_name(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);

        Sanctum::actingAs($user);

        $this->patchJson('/api/auth/me', ['name' => 'Updated Reader'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Reader')
            ->assertJsonPath('user.email', $user->email);

        $this->assertSame('Updated Reader', $user->fresh()->name);
    }

    public function test_patch_me_validates_name(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->patchJson('/api/auth/me', [])->assertStatus(422);
    }
}

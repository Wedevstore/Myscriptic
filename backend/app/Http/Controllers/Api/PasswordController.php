<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PasswordController extends Controller
{
    public function forgot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'next' => ['nullable', 'string', 'max:512'],
        ]);

        $next = $validated['next'] ?? null;
        if (is_string($next) && str_starts_with($next, '/') && ! str_starts_with($next, '//')) {
            $key = 'pw_reset_next:'.mb_strtolower($validated['email']);
            Cache::put($key, mb_substr($next, 0, 512), now()->addMinutes(65));
        }

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'If an account exists for that email, a reset link has been sent.']);
        }

        return response()->json(['message' => 'Unable to send reset link. Try again later.'], 422);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password has been reset. You can sign in now.']);
        }

        return response()->json(['message' => __($status)], 422);
    }
}

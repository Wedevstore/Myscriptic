<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FcmDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FcmDeviceController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['sometimes', 'string', 'max:32'],
        ]);

        $user = $request->user();
        FcmDevice::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'token' => $data['token'],
            ],
            [
                'platform' => $data['platform'] ?? 'web',
                'last_used_at' => now(),
            ]
        );

        return response()->json(['success' => true]);
    }
}

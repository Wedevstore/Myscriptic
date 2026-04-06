<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthorApplicationController extends Controller
{
    public function apply(Request $request): JsonResponse
    {
        if ($request->user()->role === 'author' || $request->user()->role === 'admin') {
            return response()->json(['message' => 'You are already an author.'], 422);
        }

        if (AuthorApplication::query()->where('user_id', $request->user()->id)->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'Application already pending.'], 422);
        }

        $data = $request->validate([
            'bio' => ['required', 'string', 'max:5000'],
            'payout_method' => ['required', 'string', 'max:64'],
            'payout_details' => ['required', 'array'],
        ]);

        $app = AuthorApplication::query()->create([
            'user_id' => $request->user()->id,
            'bio' => $data['bio'],
            'payout_method' => $data['payout_method'],
            'payout_details' => $data['payout_details'],
            'status' => 'pending',
        ]);

        return response()->json(['application_id' => (string) $app->id], 201);
    }
}

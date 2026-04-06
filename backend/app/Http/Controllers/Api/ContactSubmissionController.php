<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactSubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'topic' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:10000'],
            'author_ref' => ['nullable', 'string', 'max:64'],
        ]);

        ContactSubmission::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'topic' => $data['topic'],
            'message' => $data['message'],
            'author_ref' => $data['author_ref'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Thanks — we received your message.']);
    }
}

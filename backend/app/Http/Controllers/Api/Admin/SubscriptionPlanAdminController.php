<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubscriptionPlanAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = SubscriptionPlan::query()->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'slug' => ['nullable', 'string', 'max:128'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'unlimited_reading' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $slug = $data['slug'] ?? Str::slug($data['name']);
        if (SubscriptionPlan::query()->where('slug', $slug)->exists()) {
            $slug .= '-'.Str::lower(Str::random(4));
        }

        $plan = SubscriptionPlan::query()->create([
            'name' => $data['name'],
            'slug' => $slug,
            'price' => $data['price'],
            'currency' => $data['currency'] ?? 'USD',
            'duration_days' => $data['duration_days'],
            'unlimited_reading' => $data['unlimited_reading'] ?? true,
            'status' => $data['status'] ?? 'active',
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $plan], 201);
    }

    public function update(Request $request, SubscriptionPlan $subscriptionPlan): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:128'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'duration_days' => ['sometimes', 'integer', 'min:1'],
            'unlimited_reading' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $subscriptionPlan->update($data);

        return response()->json(['data' => $subscriptionPlan->fresh()]);
    }

    public function destroy(SubscriptionPlan $subscriptionPlan): JsonResponse
    {
        $subscriptionPlan->delete();

        return response()->json(null, 204);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionStatusController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $sub = $request->user()->activeSubscription();

        return response()->json([
            'active' => $sub !== null,
            'plan' => $sub ? [
                'id' => (string) $sub->plan_id,
                'name' => $sub->plan->name,
                'slug' => $sub->plan->slug,
            ] : null,
            'expires_at' => $sub?->ends_at->toIso8601String(),
            'subscription_id' => $sub ? (string) $sub->id : null,
        ]);
    }

    public function cancel(Request $request): JsonResponse
    {
        $sub = $request->user()->activeSubscription();
        if (! $sub) {
            return response()->json(['message' => 'No active subscription.'], 422);
        }

        // Stop renewal; access continues until ends_at (activeSubscription still applies).
        $sub->update(['canceled_at' => now()]);

        return response()->json([
            'success' => true,
            'access_until' => $sub->ends_at->toIso8601String(),
        ]);
    }
}

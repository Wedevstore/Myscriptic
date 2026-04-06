<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;

class SubscriptionPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = SubscriptionPlan::query()->active()->orderBy('sort_order')->orderBy('id')->get();

        return response()->json([
            'data' => $plans->map(fn (SubscriptionPlan $p) => [
                'id' => (string) $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => (float) $p->price,
                'currency' => $p->currency,
                'duration_days' => $p->duration_days,
                'unlimited_reading' => $p->unlimited_reading,
            ]),
        ]);
    }
}

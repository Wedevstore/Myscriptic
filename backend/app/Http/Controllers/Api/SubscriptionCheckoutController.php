<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Subscription\SubscriptionCheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionCheckoutController extends Controller
{
    public function __construct(protected SubscriptionCheckoutService $checkout) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:subscription_plans,id'],
            'payment_gateway' => ['required', 'string', 'in:paystack,flutterwave,paypal,korapay'],
            'return_url' => ['nullable', 'string', 'url'],
        ]);

        $result = $this->checkout->createCheckout($request->user(), [
            'plan_id' => $data['plan_id'],
            'payment_gateway' => $data['payment_gateway'],
            'return_url' => $data['return_url'] ?? null,
        ]);

        return response()->json([
            'order_id' => $result['order_id'],
            'payment_url' => $result['payment_url'],
            'amount' => (float) $result['order']->amount,
            'currency' => $result['order']->currency,
        ], 201);
    }
}

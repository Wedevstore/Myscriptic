<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\PaymentRedirectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentInitializeController extends Controller
{
    public function __construct(protected PaymentRedirectService $redirects) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'gateway' => ['required', 'string'],
            'currency' => ['required', 'string'],
            'return_url' => ['nullable', 'string', 'url'],
        ]);

        $order = Order::query()->findOrFail($data['order_id']);
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }
        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Order is not pending payment.'], 422);
        }

        $url = $this->redirects->buildPaymentUrl($order, $data['return_url'] ?? null);

        return response()->json([
            'payment_url' => $url,
            'reference' => (string) ($order->payment_ref ?? ''),
        ]);
    }
}

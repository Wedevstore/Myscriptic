<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\OrderFulfillmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookPaystackController extends Controller
{
    public function __construct(protected OrderFulfillmentService $fulfillment) {}

    public function __invoke(Request $request)
    {
        $secret = config('myscriptic.paystack_secret');
        if ($secret) {
            $sig = $request->header('x-paystack-signature');
            $computed = hash_hmac('sha512', $request->getContent(), $secret);
            if (! hash_equals($computed, (string) $sig)) {
                abort(401, 'Invalid signature');
            }
        }

        $payload = $request->all();
        Log::info('paystack.webhook', $payload);

        $data = $payload['data'] ?? [];
        $reference = $data['reference'] ?? null;
        $status = $data['status'] ?? null;
        if ($reference && $status === 'success') {
            $order = Order::query()->where('status', 'pending')->where('payment_ref', $reference)->first()
                ?? Order::query()->where('status', 'pending')->where('id', $data['metadata']['order_id'] ?? 0)->first();
            if ($order) {
                $this->fulfillment->fulfill($order, $reference, 'paystack', $payload);
            }
        }

        return response('OK', 200);
    }
}

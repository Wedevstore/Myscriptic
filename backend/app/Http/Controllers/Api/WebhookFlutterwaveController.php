<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\OrderFulfillmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookFlutterwaveController extends Controller
{
    public function __construct(protected OrderFulfillmentService $fulfillment) {}

    public function __invoke(Request $request)
    {
        $secret = config('myscriptic.flutterwave_secret');
        if ($secret) {
            $hash = (string) $request->header('verif-hash', '');
            if ($hash === '' || ! hash_equals($secret, $hash)) {
                abort(401, 'Invalid signature');
            }
        }

        $payload = $request->all();
        Log::info('flutterwave.webhook', $payload);

        $data = $payload['data'] ?? [];
        $reference = $data['tx_ref'] ?? $data['flw_ref'] ?? $data['reference'] ?? null;
        $status = strtolower((string) ($data['status'] ?? ''));

        if ($reference && ($status === 'successful' || ($payload['event'] ?? '') === 'charge.completed')) {
            $this->fulfillIfPending($reference, $payload);
        }

        return response('OK', 200);
    }

    protected function fulfillIfPending(string $reference, array $payload): void
    {
        $order = Order::query()->where('status', 'pending')->where('payment_ref', $reference)->first();
        if (! $order) {
            $oid = (int) data_get($payload, 'meta.order_id');
            if ($oid > 0) {
                $order = Order::query()->where('status', 'pending')->whereKey($oid)->first();
            }
        }

        if ($order) {
            $this->fulfillment->fulfill($order, $reference, 'flutterwave', $payload);
        }
    }
}

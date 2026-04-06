<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\OrderFulfillmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookKorapayController extends Controller
{
    public function __construct(protected OrderFulfillmentService $fulfillment) {}

    public function __invoke(Request $request)
    {
        $secret = config('myscriptic.korapay_secret');
        if ($secret) {
            $sig = (string) $request->header('x-kora-signature', '');
            $raw = $request->getContent();
            $expected = hash_hmac('sha256', $raw, $secret);
            if ($sig === '' || ! hash_equals($expected, $sig)) {
                abort(401, 'Invalid signature');
            }
        }

        $payload = $request->all();
        Log::info('korapay.webhook', $payload);

        $data = $payload['data'] ?? $payload;
        $reference = is_array($data)
            ? ($data['reference'] ?? $data['payment_reference'] ?? $data['transaction_reference'] ?? null)
            : null;
        $status = strtolower((string) (is_array($data) ? ($data['status'] ?? '') : ''));

        if ($reference && in_array($status, ['success', 'successful', 'paid'], true)) {
            $order = Order::query()
                ->where('status', 'pending')
                ->where('payment_ref', $reference)
                ->first();

            if ($order) {
                $this->fulfillment->fulfill($order, $reference, 'korapay', $payload);
            }
        }

        return response('OK', 200);
    }
}

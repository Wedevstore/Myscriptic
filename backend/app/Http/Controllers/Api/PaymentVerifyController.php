<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Transaction;
use App\Services\Checkout\OrderFulfillmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentVerifyController extends Controller
{
    public function __construct(protected OrderFulfillmentService $fulfillment) {}

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string'],
            'gateway' => ['required', 'string'],
        ]);

        $txn = Transaction::query()->where('reference_id', $data['reference'])->first();
        if ($txn) {
            return response()->json([
                'verified' => $txn->status === 'success',
                'order_id' => (string) $txn->order_id,
                'status' => $txn->status,
            ]);
        }

        // Optional: gateway API verification hook (Paystack verify endpoint, etc.)
        $pending = Order::query()
            ->where('payment_gateway', $data['gateway'])
            ->where('status', 'pending')
            ->where('payment_ref', $data['reference'])
            ->first();

        if ($pending) {
            $this->fulfillment->fulfill($pending, $data['reference'], $data['gateway'], ['manual_verify' => true]);

            return response()->json(['verified' => true, 'order_id' => (string) $pending->id, 'status' => 'paid']);
        }

        return response()->json(['verified' => false, 'order_id' => '', 'status' => 'unknown']);
    }
}

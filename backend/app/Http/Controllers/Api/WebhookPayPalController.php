<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * PayPal webhooks require verifying the transmission against PayPal's API using
 * PAYPAL_WEBHOOK_ID and signed headers. Until configured, we log only.
 */
class WebhookPayPalController extends Controller
{
    public function __invoke(Request $request)
    {
        $webhookId = config('myscriptic.paypal_webhook_id');
        Log::info('paypal.webhook', [
            'has_webhook_id' => (bool) $webhookId,
            'event_type' => $request->input('event_type'),
        ]);

        // TODO: verify with PayPal's verify-webhook-signature API when webhook_id is set,
        // then resolve custom_id / invoice_id to Order and call OrderFulfillmentService.

        return response('OK', 200);
    }
}

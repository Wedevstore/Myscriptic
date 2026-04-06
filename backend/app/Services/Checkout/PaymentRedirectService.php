<?php

namespace App\Services\Checkout;

use App\Models\Order;
use Illuminate\Support\Facades\URL;

class PaymentRedirectService
{
    /**
     * Real gateways: replace with Paystack/Flutterwave initialize response URL.
     * Dev: signed completion URL on this app that fulfills the order then redirects to the SPA.
     */
    public function buildPaymentUrl(Order $order, ?string $returnUrl = null): string
    {
        if (config('myscriptic.allow_mock_payment_completion')) {
            $params = ['order' => $order->id];
            if ($returnUrl !== null && $returnUrl !== '') {
                $params['return_url'] = $returnUrl;
            }

            return URL::temporarySignedRoute(
                'payments.mock-pay',
                now()->addMinutes(30),
                $params
            );
        }

        // Placeholder when mock is disabled — integrate gateway initialization here.
        $frontend = rtrim(config('myscriptic.frontend_url'), '/');

        return $frontend.'/checkout?order_pending='.urlencode((string) $order->id);
    }
}

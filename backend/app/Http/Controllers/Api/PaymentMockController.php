<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\OrderFulfillmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class PaymentMockController extends Controller
{
    public function __construct(protected OrderFulfillmentService $fulfillment) {}

    /**
     * Dev-only: landing page with explicit Complete / Cancel (avoids instant accidental success).
     */
    public function interstitial(Request $request, Order $order)
    {
        if (! config('myscriptic.allow_mock_payment_completion')) {
            abort(404);
        }

        $returnUrl = $request->query('return_url');
        $expires = now()->addMinutes(30);

        $completeParams = ['order' => $order->id];
        if ($returnUrl !== null && $returnUrl !== '') {
            $completeParams['return_url'] = $returnUrl;
        }

        $completeUrl = URL::temporarySignedRoute('payments.mock-complete', $expires, $completeParams);
        $cancelUrl = URL::temporarySignedRoute('payments.mock-cancel', $expires, ['order' => $order->id]);

        $gw = e((string) ($order->payment_gateway ?? 'paystack'));
        $oid = e((string) $order->id);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mock payment — MyScriptic</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
    a { display: inline-block; margin: 0.5rem 0.5rem 0.5rem 0; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .ok { background: #16a34a; color: #fff; }
    .cancel { background: #e5e7eb; color: #111; }
    .muted { color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Mock checkout</h1>
  <p class="muted">Development only. Order #{$oid} · Gateway {$gw}</p>
  <p>Choose an outcome. Real gateways redirect automatically; this page simulates return from the provider.</p>
  <p>
    <a class="ok" href="{$completeUrl}">Complete payment</a>
    <a class="cancel" href="{$cancelUrl}">Cancel</a>
  </p>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Signed cancel — does not fulfill; sends user to SPA failure page.
     */
    public function cancel(Request $request, Order $order)
    {
        if (! config('myscriptic.allow_mock_payment_completion')) {
            abort(404);
        }

        $front = rtrim((string) config('myscriptic.frontend_url'), '/');
        $gw = $order->payment_gateway ?? 'paystack';
        $target = $front.'/order-failure?order='.urlencode((string) $order->id)
            .'&gateway='.urlencode((string) $gw)
            .'&reason='.urlencode('user_cancelled');

        return redirect()->away($target);
    }

    public function complete(Request $request, Order $order)
    {
        if (! config('myscriptic.allow_mock_payment_completion')) {
            abort(404);
        }

        $ref = 'MOCK_'.Str::upper(Str::random(12));
        $this->fulfillment->fulfill($order, $ref, $order->payment_gateway, [
            'mock_complete' => true,
            'ip' => $request->ip(),
        ]);

        $return = $request->query('return_url');
        $base = $return
            ? (string) $return
            : rtrim(config('myscriptic.frontend_url'), '/').'/order-success';
        $sep = str_contains($base, '?') ? '&' : '?';
        $target = $base.$sep.'order='.urlencode((string) $order->id);

        return redirect()->away($target);
    }
}

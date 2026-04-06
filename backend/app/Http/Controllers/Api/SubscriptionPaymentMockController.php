<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionOrder;
use App\Services\Subscription\SubscriptionFulfillmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class SubscriptionPaymentMockController extends Controller
{
    public function __construct(protected SubscriptionFulfillmentService $fulfillment) {}

    public function interstitial(Request $request, SubscriptionOrder $subscriptionOrder)
    {
        if (! config('myscriptic.allow_mock_payment_completion')) {
            abort(404);
        }

        $returnUrl = $request->query('return_url');
        $expires = now()->addMinutes(30);

        $completeParams = ['subscriptionOrder' => $subscriptionOrder->id];
        if ($returnUrl !== null && $returnUrl !== '') {
            $completeParams['return_url'] = $returnUrl;
        }

        $completeUrl = URL::temporarySignedRoute('payments.subscription-mock-complete', $expires, $completeParams);
        $cancelUrl = URL::temporarySignedRoute('payments.subscription-mock-cancel', $expires, ['subscriptionOrder' => $subscriptionOrder->id]);

        $oid = e((string) $subscriptionOrder->id);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mock subscription payment — MyScriptic</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
    a { display: inline-block; margin: 0.5rem 0.5rem 0.5rem 0; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .ok { background: #16a34a; color: #fff; }
    .cancel { background: #e5e7eb; color: #111; }
    .muted { color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Mock subscription checkout</h1>
  <p class="muted">Development only. Subscription order #{$oid}</p>
  <p>Simulate payment success or cancellation.</p>
  <p>
    <a class="ok" href="{$completeUrl}">Complete payment</a>
    <a class="cancel" href="{$cancelUrl}">Cancel</a>
  </p>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function cancel(Request $request, SubscriptionOrder $subscriptionOrder)
    {
        if (! config('myscriptic.allow_mock_payment_completion')) {
            abort(404);
        }

        $front = rtrim((string) config('myscriptic.frontend_url'), '/');

        return redirect()->away($front.'/subscription?subscription_cancelled=1');
    }

    public function complete(Request $request, SubscriptionOrder $subscriptionOrder)
    {
        if (! config('myscriptic.allow_mock_payment_completion')) {
            abort(404);
        }

        $ref = 'MOCK_SUB_'.Str::upper(Str::random(10));
        $this->fulfillment->fulfill($subscriptionOrder, $ref, [
            'mock' => true,
            'ip' => $request->ip(),
        ]);

        $return = $request->query('return_url');
        $base = $return
            ? (string) $return
            : rtrim(config('myscriptic.frontend_url'), '/').'/subscription';
        $sep = str_contains($base, '?') ? '&' : '?';
        $target = $base.$sep.'subscription_success=1';

        return redirect()->away($target);
    }
}

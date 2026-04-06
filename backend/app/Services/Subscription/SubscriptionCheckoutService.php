<?php

namespace App\Services\Subscription;

use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

class SubscriptionCheckoutService
{
    /**
     * @return array{order: SubscriptionOrder, payment_url: string, order_id: string}
     */
    public function createCheckout(User $user, array $payload): array
    {
        $plan = SubscriptionPlan::query()->active()->findOrFail($payload['plan_id']);

        return DB::transaction(function () use ($user, $plan, $payload) {
            $order = SubscriptionOrder::query()->create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'amount' => $plan->price,
                'currency' => $plan->currency,
                'payment_gateway' => $payload['payment_gateway'],
                'payment_ref' => 'SUB_'.strtoupper(Str::random(16)),
                'status' => 'pending',
                'meta' => [
                    'return_url' => $payload['return_url'] ?? null,
                ],
            ]);

            $paymentUrl = $this->buildPaymentUrl($order, $payload['return_url'] ?? null);

            return [
                'order' => $order,
                'payment_url' => $paymentUrl,
                'order_id' => (string) $order->id,
            ];
        });
    }

    protected function buildPaymentUrl(SubscriptionOrder $order, ?string $returnUrl): string
    {
        if (config('myscriptic.allow_mock_payment_completion')) {
            $params = ['subscriptionOrder' => $order->id];
            if ($returnUrl !== null && $returnUrl !== '') {
                $params['return_url'] = $returnUrl;
            }

            return URL::temporarySignedRoute(
                'payments.subscription-mock-pay',
                now()->addMinutes(30),
                $params
            );
        }

        $frontend = rtrim(config('myscriptic.frontend_url'), '/');

        return $frontend.'/subscription?subscription_order_pending='.urlencode((string) $order->id);
    }
}

<?php

namespace App\Services\Subscription;

use App\Events\SubscriptionActivated;
use App\Models\Subscription;
use App\Models\SubscriptionOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SubscriptionFulfillmentService
{
    public function fulfill(SubscriptionOrder $order, string $referenceId, array $raw = []): Subscription
    {
        $shouldNotify = false;

        $subscription = DB::transaction(function () use ($order, $referenceId, $raw, &$shouldNotify) {
            /** @var SubscriptionOrder $locked */
            $locked = SubscriptionOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'paid') {
                return Subscription::query()
                    ->where('subscription_order_id', $locked->id)
                    ->firstOrFail();
            }

            $locked->update([
                'status' => 'paid',
                'payment_ref' => $referenceId,
                'paid_at' => now(),
                'meta' => array_merge($locked->meta ?? [], ['fulfillment' => $raw]),
            ]);

            $plan = $locked->plan;
            $user = $locked->user;

            Subscription::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'canceled',
                    'canceled_at' => now(),
                ]);

            $starts = now();
            $ends = $starts->copy()->addDays($plan->duration_days);

            $subscription = Subscription::query()->create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'subscription_order_id' => $locked->id,
                'starts_at' => $starts,
                'ends_at' => $ends,
                'status' => 'active',
            ]);

            User::query()->whereKey($user->id)->update([
                'subscription_plan' => $plan->name,
                'subscription_expires_at' => $ends,
            ]);

            $shouldNotify = true;

            return $subscription;
        });

        if ($shouldNotify) {
            event(new SubscriptionActivated($subscription));
        }

        return $subscription;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Console\Command;

class SubscriptionsExpireCommand extends Command
{
    protected $signature = 'subscriptions:expire';

    protected $description = 'Mark past-due subscriptions as expired and sync user denormalized subscription fields.';

    public function handle(): int
    {
        $userIds = Subscription::query()
            ->where('status', 'active')
            ->where('ends_at', '<', now())
            ->pluck('user_id')
            ->unique()
            ->all();

        Subscription::query()
            ->where('status', 'active')
            ->where('ends_at', '<', now())
            ->update(['status' => 'expired']);

        foreach ($userIds as $uid) {
            $user = User::query()->find($uid);
            if (! $user) {
                continue;
            }
            $active = $user->activeSubscription();
            if ($active) {
                $user->update([
                    'subscription_plan' => $active->plan->name,
                    'subscription_expires_at' => $active->ends_at,
                ]);
            } else {
                $user->update([
                    'subscription_plan' => null,
                    'subscription_expires_at' => null,
                ]);
            }
        }

        $this->info('Expired subscriptions updated: '.count($userIds).' users affected.');

        return self::SUCCESS;
    }
}

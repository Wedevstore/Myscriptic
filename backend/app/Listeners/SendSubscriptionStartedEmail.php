<?php

namespace App\Listeners;

use App\Events\SubscriptionActivated;
use App\Notifications\SubscriptionStartedNotification;

class SendSubscriptionStartedEmail
{
    public function handle(SubscriptionActivated $event): void
    {
        $event->subscription->loadMissing('user');
        $user = $event->subscription->user;
        if ($user) {
            $user->notify(new SubscriptionStartedNotification($event->subscription));
        }
    }
}

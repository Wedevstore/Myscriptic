<?php

namespace App\Listeners;

use App\Events\OrderPaid;
use App\Notifications\OrderPurchasedNotification;

class SendOrderPurchasedEmail
{
    public function handle(OrderPaid $event): void
    {
        $event->order->loadMissing('user');
        $user = $event->order->user;
        if ($user) {
            $user->notify(new OrderPurchasedNotification($event->order));
        }
    }
}

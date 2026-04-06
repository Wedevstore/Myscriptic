<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionStartedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Subscription $subscription) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->subscription->loadMissing('plan');

        $planName = $this->subscription->plan?->name ?? 'Subscription';

        return (new MailMessage)
            ->subject(__('Subscription active — :plan', ['plan' => $planName]))
            ->greeting(__('Hi :name,', ['name' => $notifiable->name]))
            ->line(__('Your subscription is now active. Enjoy unlimited reading on eligible titles until :date.', [
                'date' => $this->subscription->ends_at->toFormattedDateString(),
            ]))
            ->action(__('Start reading'), rtrim((string) config('myscriptic.frontend_url', url('/')), '/').'/subscription');
    }
}

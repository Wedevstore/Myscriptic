<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeUserNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Welcome to :app', ['app' => config('app.name')]))
            ->greeting(__('Hi :name,', ['name' => $notifiable->name]))
            ->line(__('Thanks for creating a MyScriptic account. Browse the store, start reading, or explore subscription plans anytime.'))
            ->action(__('Open MyScriptic'), config('myscriptic.frontend_url', url('/')));
    }
}

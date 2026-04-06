<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPurchasedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing('items');

        return (new MailMessage)
            ->subject(__('Purchase confirmed — order :num', ['num' => $this->order->order_number]))
            ->greeting(__('Hi :name,', ['name' => $notifiable->name]))
            ->line(__('Thank you for your purchase. Your order is paid and books are available in your library.'))
            ->line(__('Order total: :amount :currency', [
                'amount' => number_format((float) $this->order->total_amount, 2),
                'currency' => $this->order->currency,
            ]))
            ->action(__('View library'), rtrim((string) config('myscriptic.frontend_url', url('/')), '/').'/library');
    }
}

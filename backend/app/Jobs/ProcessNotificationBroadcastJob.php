<?php

namespace App\Jobs;

use App\Models\FcmDevice;
use App\Models\NotificationBroadcast;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessNotificationBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $broadcastId) {}

    public function handle(): void
    {
        $broadcast = NotificationBroadcast::query()->find($this->broadcastId);
        if (! $broadcast || $broadcast->status !== 'queued') {
            return;
        }

        $broadcast->update(['status' => 'processing']);

        $query = User::query()->whereNull('blocked_at');
        if ($broadcast->audience === 'subscribers') {
            $query->whereExists(function ($q) {
                $q->selectRaw('1')
                    ->from('subscriptions')
                    ->whereColumn('subscriptions.user_id', 'users.id')
                    ->where('subscriptions.status', 'active')
                    ->where('subscriptions.ends_at', '>=', now());
            });
        }

        $userIds = $query->pluck('id')->all();
        $broadcast->update(['recipient_count' => count($userIds)]);

        $title = $broadcast->title;
        $body = $broadcast->body ?? '';
        $type = (string) ($broadcast->data['type'] ?? 'promo');
        $extra = is_array($broadcast->data) ? $broadcast->data : [];

        foreach (array_chunk($userIds, 500) as $chunk) {
            $rows = [];
            $now = now();
            foreach ($chunk as $uid) {
                $rows[] = [
                    'user_id' => $uid,
                    'type' => $type,
                    'title' => $title,
                    'body' => $body,
                    'data' => json_encode(array_merge($extra, ['broadcast_id' => $broadcast->id])),
                    'read_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            if ($rows !== []) {
                UserNotification::query()->insert($rows);
            }
        }

        $key = config('myscriptic.fcm_server_key');
        if ($key) {
            foreach (array_chunk($userIds, 50) as $chunk) {
                $tokens = FcmDevice::query()
                    ->whereIn('user_id', $chunk)
                    ->pluck('token')
                    ->unique()
                    ->values()
                    ->all();
                foreach ($tokens as $token) {
                    try {
                        Http::timeout(15)->withHeaders([
                            'Authorization' => 'key='.$key,
                            'Content-Type' => 'application/json',
                        ])->post('https://fcm.googleapis.com/fcm/send', [
                            'to' => $token,
                            'notification' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                            'data' => array_merge(
                                array_map('strval', array_filter($extra, fn ($v) => is_scalar($v))),
                                ['click_action' => 'FLUTTER_NOTIFICATION_CLICK']
                            ),
                        ]);
                    } catch (\Throwable $e) {
                        Log::warning('FCM send failed', ['error' => $e->getMessage()]);
                    }
                }
            }
        }

        $broadcast->update(['status' => 'done']);
    }
}

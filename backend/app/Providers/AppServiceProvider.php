<?php

namespace App\Providers;

use App\Events\OrderPaid;
use App\Events\SubscriptionActivated;
use App\Listeners\SendOrderPurchasedEmail;
use App\Listeners\SendSubscriptionStartedEmail;
use App\Models\Book;
use App\Observers\BookObserver;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $base = rtrim((string) config('myscriptic.frontend_url'), '/');
            $email = $notifiable->getEmailForPasswordReset();
            $next = $email ? Cache::pull('pw_reset_next:'.mb_strtolower($email)) : null;

            $url = $base.'/auth/reset-password?token='.urlencode($token)
                .'&email='.urlencode($email);

            if (is_string($next) && str_starts_with($next, '/') && ! str_starts_with($next, '//')) {
                $url .= '&next='.rawurlencode(mb_substr($next, 0, 512));
            }

            return $url;
        });

        Book::observe(BookObserver::class);

        Event::listen(OrderPaid::class, SendOrderPurchasedEmail::class);
        Event::listen(SubscriptionActivated::class, SendSubscriptionStartedEmail::class);

        Event::listen(JobFailed::class, function (JobFailed $event): void {
            Log::channel('structured')->error('queue.job_failed', [
                'job' => $event->job->resolveName(),
                'connection' => $event->connectionName,
                'exception' => $event->exception->getMessage(),
            ]);
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(12)->by($request->ip());
        });

        RateLimiter::for('payments', function (Request $request) {
            return Limit::perMinute(40)->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip()));
        });

        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(180)->by($request->ip());
        });

        RateLimiter::for('search', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('contact', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}


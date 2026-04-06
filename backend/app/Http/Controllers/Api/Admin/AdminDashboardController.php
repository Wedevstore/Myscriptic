<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthorApplication;
use App\Models\Book;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\SubscriptionOrder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminDashboardController extends Controller
{
    public function metrics(): JsonResponse
    {
        $monthStart = now()->startOfMonth();

        $orderRevenueMonth = (float) Order::query()
            ->where('status', 'paid')
            ->where('paid_at', '>=', $monthStart)
            ->sum('total_amount');

        $subRevenueMonth = (float) SubscriptionOrder::query()
            ->where('status', 'paid')
            ->where('paid_at', '>=', $monthStart)
            ->sum('amount');

        $orderRevenueLife = (float) Order::query()->where('status', 'paid')->sum('total_amount');
        $subRevenueLife = (float) SubscriptionOrder::query()->where('status', 'paid')->sum('amount');

        return response()->json([
            'users_total' => User::query()->count(),
            'subscriptions_active' => Subscription::query()
                ->where('status', 'active')
                ->where('ends_at', '>=', now())
                ->count(),
            'revenue_month_usd' => round($orderRevenueMonth + $subRevenueMonth, 2),
            'revenue_lifetime_usd' => round($orderRevenueLife + $subRevenueLife, 2),
            'books_total' => Book::query()->count(),
            'authors_total' => User::query()->where('role', 'author')->count(),
            'pending_author_applications' => AuthorApplication::query()->where('status', 'pending')->count(),
            'pending_book_approvals' => Book::query()->where('approval_status', 'pending')->count(),
        ]);
    }

    public function charts(Request $request): JsonResponse
    {
        $days = min(90, max(7, $request->integer('days', 30)));
        $cacheKey = 'admin:dashboard:charts:'.$days;
        $ttl = (int) config('myscriptic.analytics_cache_ttl', 120);

        $payload = Cache::remember($cacheKey, max(1, $ttl), function () use ($days) {
            $start = now()->subDays($days)->startOfDay();

            $orderDaily = Order::query()
                ->selectRaw('DATE(paid_at) as d, SUM(total_amount) as total')
                ->where('status', 'paid')
                ->whereNotNull('paid_at')
                ->where('paid_at', '>=', $start)
                ->groupBy('d')
                ->pluck('total', 'd');

            $subDaily = SubscriptionOrder::query()
                ->selectRaw('DATE(paid_at) as d, SUM(amount) as total')
                ->where('status', 'paid')
                ->whereNotNull('paid_at')
                ->where('paid_at', '>=', $start)
                ->groupBy('d')
                ->pluck('total', 'd');

            $revenue = [];
            for ($i = 0; $i < $days; $i++) {
                $d = $start->copy()->addDays($i)->toDateString();
                $revenue[] = [
                    'date' => $d,
                    'amount' => round((float) ($orderDaily[$d] ?? 0) + (float) ($subDaily[$d] ?? 0), 2),
                ];
            }

            $subGrowth = [];
            for ($i = 0; $i < $days; $i++) {
                $day = $start->copy()->addDays($i);
                $c = Subscription::query()
                    ->where('status', 'active')
                    ->where('ends_at', '>=', $day)
                    ->where('starts_at', '<=', $day->copy()->endOfDay())
                    ->count();
                $subGrowth[] = ['date' => $day->toDateString(), 'active' => $c];
            }

            $engagement = User::query()
                ->join('user_book_engagements', 'users.id', '=', 'user_book_engagements.user_id')
                ->selectRaw('DATE(user_book_engagements.last_sync_at) as d, COUNT(*) as events')
                ->where('user_book_engagements.last_sync_at', '>=', $start)
                ->groupBy('d')
                ->orderBy('d')
                ->get();

            $engMap = $engagement->pluck('events', 'd');
            $engTrend = [];
            for ($i = 0; $i < $days; $i++) {
                $d = $start->copy()->addDays($i)->toDateString();
                $engTrend[] = ['date' => $d, 'engagements' => (int) ($engMap[$d] ?? 0)];
            }

            return [
                'revenue_by_day' => $revenue,
                'subscriptions_active_by_day' => $subGrowth,
                'engagement_by_day' => $engTrend,
            ];
        });

        return response()->json($payload);
    }
}

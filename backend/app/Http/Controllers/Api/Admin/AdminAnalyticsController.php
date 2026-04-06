<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthorSaleEarning;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\SubscriptionOrder;
use App\Models\User;
use App\Models\UserBookEngagement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function revenue(Request $request): JsonResponse
    {
        $granularity = $request->string('granularity', 'daily')->toString();
        $ttl = (int) config('myscriptic.analytics_cache_ttl', 120);
        $key = 'admin:analytics:revenue:'.$granularity;

        $data = Cache::remember($key, max(1, $ttl), function () use ($granularity) {
            $driver = DB::connection()->getDriverName();
            $monthExpr = match ($driver) {
                'sqlite' => "strftime('%Y-%m', paid_at)",
                'pgsql' => "to_char(paid_at, 'YYYY-MM')",
                default => "DATE_FORMAT(paid_at, '%Y-%m')",
            };
            $dayExpr = match ($driver) {
                'sqlite' => 'date(paid_at)',
                'pgsql' => "DATE_TRUNC('day', paid_at)::date",
                default => 'DATE(paid_at)',
            };
            $periodExpr = $granularity === 'monthly' ? $monthExpr : $dayExpr;

            $orderQ = Order::query()
                ->selectRaw("{$periodExpr} as period, SUM(total_amount) as total")
                ->where('status', 'paid')
                ->whereNotNull('paid_at');
            $subQ = SubscriptionOrder::query()
                ->selectRaw("{$periodExpr} as period, SUM(amount) as total")
                ->where('status', 'paid')
                ->whereNotNull('paid_at');

            if ($granularity !== 'monthly') {
                $orderQ->where('paid_at', '>=', now()->subDays(90));
                $subQ->where('paid_at', '>=', now()->subDays(90));
            }

            $orderRows = $orderQ->groupBy(DB::raw($periodExpr))->orderBy('period')->get();
            $subRows = $subQ->groupBy(DB::raw($periodExpr))->orderBy('period')->get();

            $merged = [];
            foreach ($orderRows as $r) {
                $merged[$r->period] = (float) $r->total;
            }
            foreach ($subRows as $r) {
                $merged[$r->period] = ($merged[$r->period] ?? 0) + (float) $r->total;
            }
            ksort($merged);

            return collect($merged)->map(fn ($v, $k) => ['period' => $k, 'amount' => round($v, 2)])->values()->all();
        });

        return response()->json(['data' => $data]);
    }

    public function topBooksBySales(): JsonResponse
    {
        $ttl = (int) config('myscriptic.analytics_cache_ttl', 120);
        $data = Cache::remember('admin:analytics:top_books_sales', max(1, $ttl), function () {
            return OrderItem::query()
                ->select('book_id', DB::raw('SUM(quantity) as units'), DB::raw('SUM(unit_price * quantity) as gross'))
                ->whereNotNull('book_id')
                ->groupBy('book_id')
                ->orderByDesc('units')
                ->limit(20)
                ->with('book:id,title,cover_url,author_id')
                ->get()
                ->map(fn ($row) => [
                    'book_id' => (string) $row->book_id,
                    'title' => $row->book?->title,
                    'cover_url' => $row->book?->cover_url,
                    'units_sold' => (int) $row->units,
                    'gross_usd' => round((float) $row->gross, 2),
                ]);
        });

        return response()->json(['data' => $data]);
    }

    public function topBooksByEngagement(): JsonResponse
    {
        $ttl = (int) config('myscriptic.analytics_cache_ttl', 120);
        $data = Cache::remember('admin:analytics:top_books_engagement', max(1, $ttl), function () {
            return UserBookEngagement::query()
                ->select('book_id', DB::raw('SUM(reading_time_seconds) as seconds'), DB::raw('COUNT(DISTINCT user_id) as readers'))
                ->groupBy('book_id')
                ->orderByDesc('seconds')
                ->limit(20)
                ->with('book:id,title,cover_url')
                ->get()
                ->map(fn ($row) => [
                    'book_id' => (string) $row->book_id,
                    'title' => $row->book?->title,
                    'cover_url' => $row->book?->cover_url,
                    'reading_time_seconds' => (int) $row->seconds,
                    'unique_readers' => (int) $row->readers,
                ]);
        });

        return response()->json(['data' => $data]);
    }

    public function topAuthors(): JsonResponse
    {
        $ttl = (int) config('myscriptic.analytics_cache_ttl', 120);
        $data = Cache::remember('admin:analytics:top_authors', max(1, $ttl), function () {
            return AuthorSaleEarning::query()
                ->select('author_id', DB::raw('SUM(net_amount) as earnings'))
                ->groupBy('author_id')
                ->orderByDesc('earnings')
                ->limit(30)
                ->with('author:id,name,email')
                ->get()
                ->map(fn ($row) => [
                    'author_id' => (string) $row->author_id,
                    'name' => $row->author?->name,
                    'email' => $row->author?->email,
                    'total_earnings_usd' => round((float) $row->earnings, 2),
                ]);
        });

        return response()->json(['data' => $data]);
    }

    public function cohortRetention(Request $request): JsonResponse
    {
        $days = min(90, max(1, $request->integer('return_after_days', 7)));
        $monthsBack = min(12, max(3, $request->integer('months', 6)));

        $cohorts = [];
        for ($m = 0; $m < $monthsBack; $m++) {
            $start = now()->subMonths($m + 1)->startOfMonth();
            $end = now()->subMonths($m)->startOfMonth();

            $signed = User::query()->whereBetween('created_at', [$start, $end])->get(['id', 'created_at', 'last_login_at']);
            $total = $signed->count();
            $returned = $signed->filter(function (User $u) use ($days) {
                if ($u->last_login_at === null) {
                    return false;
                }

                return $u->last_login_at->greaterThanOrEqualTo($u->created_at->copy()->addDays($days));
            })->count();

            $cohorts[] = [
                'month' => $start->format('Y-m'),
                'signed_up' => $total,
                'returned_after_days' => $days,
                'returned_count' => $returned,
                'retention_rate' => $total > 0 ? round($returned / $total, 4) : 0,
            ];
        }

        return response()->json(['data' => $cohorts]);
    }
}

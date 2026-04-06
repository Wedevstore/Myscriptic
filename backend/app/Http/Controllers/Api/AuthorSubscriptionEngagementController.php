<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorPayout;
use App\Models\Book;
use App\Models\RevenueCycle;
use App\Models\UserBookEngagement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthorSubscriptionEngagementController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'author' && $user->role !== 'admin') {
            abort(403);
        }

        $bookIds = Book::query()->where('author_id', $user->id)->pluck('id');

        $agg = UserBookEngagement::query()
            ->whereIn('book_id', $bookIds)
            ->selectRaw('COUNT(*) as readers, SUM(completion_percentage) as total_completion, SUM(reading_time_seconds) as total_seconds')
            ->first();

        $payoutsYtd = AuthorPayout::query()
            ->where('author_id', $user->id)
            ->whereIn('status', ['pending', 'paid', 'hold'])
            ->whereHas('revenueCycle', fn ($q) => $q->whereYear('cycle_start', now()->year))
            ->sum('gross_earnings');

        return response()->json([
            'total_readers' => (int) ($agg->readers ?? 0),
            'total_completion_points' => (float) ($agg->total_completion ?? 0),
            'total_reading_hours' => round(((int) ($agg->total_seconds ?? 0)) / 3600, 2),
            'ytd_subscription_payouts_usd' => (float) $payoutsYtd,
            'formula' => 'Subscription pool share = (your engagement weight / all authors engagement weight) × author pool after admin commission.',
        ]);
    }

    public function payouts(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'author' && $user->role !== 'admin') {
            abort(403);
        }

        $rows = AuthorPayout::query()
            ->where('author_id', $user->id)
            ->with('revenueCycle:id,period_label,cycle_start,cycle_end,gross_subscription_revenue,admin_commission_pct,admin_earnings,author_pool,total_engagement_weight,status')
            ->orderByDesc('id')
            ->limit(48)
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function cycleTransparency(Request $request, RevenueCycle $revenueCycle): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'author' && $user->role !== 'admin') {
            abort(403);
        }

        $myBooks = Book::query()->where('author_id', $user->id)->pluck('id');

        $snapCount = DB::table('revenue_cycle_engagements')
            ->where('revenue_cycle_id', $revenueCycle->id)
            ->whereIn('book_id', $myBooks)
            ->count();

        $myWeight = (float) DB::table('revenue_cycle_engagements')
            ->where('revenue_cycle_id', $revenueCycle->id)
            ->whereIn('book_id', $myBooks)
            ->sum('completion_percentage');

        $payout = AuthorPayout::query()
            ->where('author_id', $user->id)
            ->where('revenue_cycle_id', $revenueCycle->id)
            ->first();

        return response()->json([
            'cycle' => [
                'period_label' => $revenueCycle->period_label,
                'gross_revenue' => (float) $revenueCycle->gross_subscription_revenue,
                'admin_commission_pct' => (float) $revenueCycle->admin_commission_pct,
                'admin_earnings' => (float) $revenueCycle->admin_earnings,
                'author_pool' => (float) $revenueCycle->author_pool,
                'total_engagement_weight' => (float) $revenueCycle->total_engagement_weight,
                'status' => $revenueCycle->status,
            ],
            'your_snapshot_rows' => $snapCount,
            'your_engagement_weight' => $myWeight,
            'your_payout' => $payout ? [
                'share_percentage' => (float) $payout->share_percentage,
                'gross_earnings' => (float) $payout->gross_earnings,
                'status' => $payout->status,
            ] : null,
        ]);
    }
}

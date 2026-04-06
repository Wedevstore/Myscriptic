<?php

namespace App\Services\Revenue;

use App\Models\AuditLog;
use App\Models\AuthorPayout;
use App\Models\PlatformSetting;
use App\Models\RevenueCycle;
use App\Models\RevenueCycleEngagement;
use App\Models\Subscription;
use App\Models\SubscriptionOrder;
use App\Models\UserBookEngagement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RevenueCycleFinalizationService
{
    public function finalizeMonth(Carbon $month, bool $lock = false): RevenueCycle
    {
        $cycleStart = $month->copy()->startOfMonth()->startOfDay();
        $cycleEnd = $month->copy()->endOfMonth()->endOfDay();
        $label = $month->format('Y-m');

        return DB::transaction(function () use ($cycleStart, $cycleEnd, $label, $lock) {
            $existing = RevenueCycle::query()->where('period_label', $label)->lockForUpdate()->first();
            if ($existing?->status === 'locked') {
                throw new \RuntimeException("Cycle {$label} is locked and cannot be changed.");
            }

            if ($lock) {
                if ($existing?->status !== 'finalized') {
                    throw new \RuntimeException("Cycle {$label} must be finalized before locking.");
                }
                $this->lockCycle($existing);

                return $existing->fresh();
            }

            if ($existing && $existing->status === 'finalized') {
                throw new \RuntimeException("Cycle {$label} is already finalized.");
            }

            $gross = (float) SubscriptionOrder::query()
                ->where('status', 'paid')
                ->whereBetween('paid_at', [$cycleStart, $cycleEnd])
                ->sum('amount');

            $commissionPct = (float) (PlatformSetting::get('subscription_pool_commission_pct')
                ?? (string) config('myscriptic.subscription_pool_commission_pct', 30));
            $adminEarnings = round($gross * $commissionPct / 100, 2);
            $authorPool = round(max(0, $gross - $adminEarnings), 2);

            $cycle = $existing ?? new RevenueCycle(['period_label' => $label]);
            $cycle->fill([
                'cycle_start' => $cycleStart->toDateString(),
                'cycle_end' => $cycleEnd->toDateString(),
                'gross_subscription_revenue' => $gross,
                'admin_commission_pct' => $commissionPct,
                'admin_earnings' => $adminEarnings,
                'author_pool' => $authorPool,
                'status' => 'open',
            ]);
            $cycle->save();

            RevenueCycleEngagement::query()->where('revenue_cycle_id', $cycle->id)->delete();
            AuthorPayout::query()->where('revenue_cycle_id', $cycle->id)->delete();

            $totalWeight = 0.0;

            UserBookEngagement::query()
                ->with(['book' => fn ($q) => $q->select('id', 'author_id', 'access_type', 'approval_status')])
                ->chunkById(500, function ($rows) use ($cycle, $cycleStart, $cycleEnd, &$totalWeight) {
                    foreach ($rows as $eng) {
                        $book = $eng->book;
                        if (! $book || $book->access_type !== 'SUBSCRIPTION' || $book->approval_status !== 'approved') {
                            continue;
                        }
                        if (! $this->userHadSubscriptionInCycle((int) $eng->user_id, $cycleStart, $cycleEnd)) {
                            continue;
                        }

                        $weight = min(100.0, (float) $eng->completion_percentage);
                        if ($weight <= 0) {
                            continue;
                        }

                        RevenueCycleEngagement::query()->create([
                            'revenue_cycle_id' => $cycle->id,
                            'user_id' => $eng->user_id,
                            'book_id' => $eng->book_id,
                            'author_id' => $book->author_id,
                            'completion_percentage' => $weight,
                            'reading_time_seconds' => $eng->reading_time_seconds,
                        ]);

                        $totalWeight += $weight;
                    }
                });

            $cycle->update(['total_engagement_weight' => round($totalWeight, 4)]);

            if ($totalWeight > 0 && $authorPool > 0) {
                $byAuthor = RevenueCycleEngagement::query()
                    ->where('revenue_cycle_id', $cycle->id)
                    ->selectRaw('author_id, SUM(completion_percentage) as w')
                    ->groupBy('author_id')
                    ->get();

                foreach ($byAuthor as $row) {
                    $w = (float) $row->w;
                    $sharePct = round(($w / $totalWeight) * 100, 6);
                    $earnings = round(($w / $totalWeight) * $authorPool, 2);

                    AuthorPayout::query()->create([
                        'author_id' => $row->author_id,
                        'revenue_cycle_id' => $cycle->id,
                        'engagement_weight' => $w,
                        'share_percentage' => $sharePct,
                        'gross_earnings' => $earnings,
                        'status' => 'pending',
                        'meta' => ['formula' => '(author_weight / total_weight) * author_pool'],
                    ]);
                }
            }

            $cycle->update([
                'status' => 'finalized',
                'finalized_at' => now(),
                'meta' => [
                    'snapshot_rows' => RevenueCycleEngagement::query()->where('revenue_cycle_id', $cycle->id)->count(),
                    'total_weight' => $totalWeight,
                ],
            ]);

            AuditLog::record(null, 'revenue_cycle.finalized', RevenueCycle::class, (string) $cycle->id, [
                'period_label' => $label,
                'gross' => $gross,
                'author_pool' => $authorPool,
                'commission_pct' => $commissionPct,
            ]);

            return $cycle->fresh();
        });
    }

    protected function userHadSubscriptionInCycle(int $userId, Carbon $start, Carbon $end): bool
    {
        return Subscription::query()
            ->where('user_id', $userId)
            ->where('starts_at', '<=', $end)
            ->where('ends_at', '>=', $start)
            ->exists();
    }

    public function lockCycle(RevenueCycle $cycle): void
    {
        if ($cycle->status !== 'finalized') {
            throw new \RuntimeException('Only finalized cycles can be locked.');
        }
        $cycle->update(['status' => 'locked']);
        AuditLog::record(null, 'revenue_cycle.locked', RevenueCycle::class, (string) $cycle->id, []);
    }
}

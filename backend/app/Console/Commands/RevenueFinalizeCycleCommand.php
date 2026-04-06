<?php

namespace App\Console\Commands;

use App\Services\Revenue\RevenueCycleFinalizationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class RevenueFinalizeCycleCommand extends Command
{
    protected $signature = 'revenue:finalize-cycle
                            {--year= : Calendar year (default: previous month)}
                            {--month= : Calendar month 1-12 (default: previous month)}
                            {--lock : Lock an already-finalized cycle instead of computing}';

    protected $description = 'Finalize subscription revenue pool and author payouts for a calendar month.';

    public function handle(RevenueCycleFinalizationService $service): int
    {
        $year = (int) ($this->option('year') ?: now()->subMonth()->year);
        $month = (int) ($this->option('month') ?: now()->subMonth()->month);
        $monthStart = Carbon::create($year, $month, 1)->startOfMonth();

        try {
            $cycle = $service->finalizeMonth($monthStart, (bool) $this->option('lock'));
            $this->info("Cycle {$cycle->period_label} status={$cycle->status} author_pool={$cycle->author_pool}");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}

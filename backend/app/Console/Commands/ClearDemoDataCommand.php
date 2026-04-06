<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Cms\HomepagePayloadService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearDemoDataCommand extends Command
{
    protected $signature = 'myscriptic:clear-demo {--force : Skip confirmation}';

    protected $description = 'Remove users marked as demo (is_demo). Cascades books, orders, cart, library, etc.';

    public function handle(): int
    {
        $count = User::query()->where('is_demo', true)->count();
        if ($count === 0) {
            $this->info('No demo users to remove.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm("Delete {$count} demo user(s) and all related rows?")) {
            $this->warn('Aborted.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($count): void {
            User::query()->where('is_demo', true)->delete();
        });

        HomepagePayloadService::forgetCache();

        $this->info("Removed {$count} demo user(s). Homepage cache cleared.");

        return self::SUCCESS;
    }
}

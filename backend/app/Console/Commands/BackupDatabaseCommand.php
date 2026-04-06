<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'myscriptic:backup-database {--path= : Custom output directory}';

    protected $description = 'Create a timestamped copy of the SQLite database (or document mysqldump for MySQL).';

    public function handle(): int
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        if ($driver === 'sqlite') {
            $src = database_path('database.sqlite');
            if (! is_file($src)) {
                $this->error('SQLite database file not found at '.$src);

                return self::FAILURE;
            }

            $dir = $this->option('path') ?: storage_path('app/backups');
            File::ensureDirectoryExists($dir);

            $dest = $dir.'/database-'.now()->format('Y-m-d-His').'.sqlite';
            File::copy($src, $dest);
            $this->info('Backup written to '.$dest);

            return self::SUCCESS;
        }

        $this->warn('For MySQL/PostgreSQL, use mysqldump/pg_dump in cron (see DEPLOYMENT.md). Driver: '.$driver);

        return self::SUCCESS;
    }
}

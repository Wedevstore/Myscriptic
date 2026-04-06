<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('subscriptions:expire')->dailyAt('00:15');
Schedule::command('revenue:finalize-cycle')->monthlyOn(1, '04:00');
Schedule::command('myscriptic:backup-database')->dailyAt('02:30');

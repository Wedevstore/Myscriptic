<?php

namespace App\Services\Engagement;

use App\Models\Book;
use App\Models\User;
use App\Models\UserBookEngagement;
use App\Services\Access\BookAccessService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EngagementTrackingService
{
    public function __construct(protected BookAccessService $access) {}

    /**
     * @param  array{pages_read: int, total_pages?: int|null, seconds_read: int}  $data
     */
    public function sync(User $user, Book $book, array $data): UserBookEngagement
    {
        if (! $this->access->canAccess($user, $book)) {
            abort(403, 'No access to this book.');
        }

        $bookId = $book->id;
        $cacheKey = "engagement:sync:{$user->id}:{$bookId}";
        $minInterval = (int) config('myscriptic.engagement_min_sync_interval_seconds', 2);
        if ($minInterval > 0 && Cache::has($cacheKey)) {
            throw ValidationException::withMessages(['sync' => ['Please wait before sending another update.']]);
        }
        Cache::put($cacheKey, true, $minInterval);

        $pagesRead = max(0, (int) $data['pages_read']);
        $totalPages = isset($data['total_pages']) && $data['total_pages'] !== null
            ? max(1, (int) $data['total_pages'])
            : null;
        /** Seconds since last sync (increment), capped server-side */
        $secondsIncrement = max(0, (int) ($data['seconds_read'] ?? 0));

        return DB::transaction(function () use ($user, $book, $pagesRead, $totalPages, $secondsIncrement) {
            /** @var UserBookEngagement $row */
            $row = UserBookEngagement::query()->firstOrCreate(
                ['user_id' => $user->id, 'book_id' => $book->id],
                [
                    'pages_read' => 0,
                    'total_pages' => $totalPages,
                    'completion_percentage' => 0,
                    'reading_time_seconds' => 0,
                ]
            );

            $oldPages = (int) $row->pages_read;
            $oldTime = (int) $row->reading_time_seconds;

            if ($pagesRead < $oldPages) {
                $pagesRead = $oldPages;
            }

            $maxPagesPerMin = (int) config('myscriptic.engagement_max_pages_per_minute', 5);
            $deltaPages = $pagesRead - $oldPages;
            if ($deltaPages > 0 && $row->last_sync_at) {
                $elapsed = max(1, $row->last_sync_at->diffInSeconds(now()));
                $maxAllowed = max(1, (int) ceil($elapsed / 60 * $maxPagesPerMin));
                if ($deltaPages > $maxAllowed) {
                    $pagesRead = $oldPages + $maxAllowed;
                }
            }

            $effectiveTotal = $totalPages ?? $row->total_pages ?? max(1, $pagesRead);
            if ($effectiveTotal < 1) {
                $effectiveTotal = 1;
            }

            $completion = min(100, round(($pagesRead / $effectiveTotal) * 100, 2));
            $oldCompletion = (float) $row->completion_percentage;
            if ($completion < $oldCompletion) {
                $completion = $oldCompletion;
            }

            $minSession = (int) config('myscriptic.engagement_min_session_seconds', 30);
            $timeDelta = $secondsIncrement;
            if ($timeDelta > 0 && $timeDelta < $minSession && $deltaPages <= 0) {
                $timeDelta = 0;
            }
            $maxTimeDelta = 3600;
            if ($timeDelta > $maxTimeDelta) {
                $timeDelta = $maxTimeDelta;
            }

            $newReadingTime = $oldTime + $timeDelta;

            $row->update([
                'pages_read' => $pagesRead,
                'total_pages' => $totalPages ?? $row->total_pages ?? $effectiveTotal,
                'completion_percentage' => $completion,
                'reading_time_seconds' => $newReadingTime,
                'last_sync_at' => now(),
            ]);

            return $row->fresh();
        });
    }
}

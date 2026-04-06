<?php

namespace App\Observers;

use App\Models\Book;
use App\Services\Cache\BookListCacheService;
use App\Services\Cms\HomepagePayloadService;

class BookObserver
{
    public function saved(Book $book): void
    {
        BookListCacheService::bust();
        HomepagePayloadService::forgetCache();
    }

    public function deleted(Book $book): void
    {
        BookListCacheService::bust();
        HomepagePayloadService::forgetCache();
    }
}

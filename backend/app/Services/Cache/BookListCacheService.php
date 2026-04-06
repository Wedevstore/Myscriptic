<?php

namespace App\Services\Cache;

use Closure;
use Illuminate\Support\Facades\Cache;

class BookListCacheService
{
    private const GEN_KEY = 'myscriptic:books_cache_generation';

    public static function generation(): int
    {
        return (int) Cache::get(self::GEN_KEY, 0);
    }

    public static function bust(): void
    {
        $v = (int) Cache::get(self::GEN_KEY, 0);
        Cache::forever(self::GEN_KEY, $v + 1);
    }

    /**
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function remember(string $namespace, array $parts, int $ttlSeconds, Closure $callback): mixed
    {
        $key = $namespace.':'.self::generation().':'.hash('xxh128', json_encode($parts));

        return Cache::remember($key, max(1, $ttlSeconds), $callback);
    }
}

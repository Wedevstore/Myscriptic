<?php

namespace App\Support;

class AssetCdn
{
    /**
     * Rewrite absolute URLs to use the public asset CDN origin when configured.
     */
    public static function transformUrl(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return $url;
        }

        $cdn = rtrim((string) config('myscriptic.asset_cdn_url', ''), '/');
        if ($cdn === '') {
            return $url;
        }

        $sources = array_filter(array_map('trim', explode(',', (string) config('myscriptic.asset_cdn_source_hosts', ''))));
        if ($sources === []) {
            return $url;
        }

        foreach ($sources as $host) {
            if ($host !== '' && str_contains($url, $host)) {
                $parts = parse_url($url);
                if (! is_array($parts) || empty($parts['path'])) {
                    return $url;
                }
                $query = isset($parts['query']) ? '?'.$parts['query'] : '';

                return $cdn.$parts['path'].$query;
            }
        }

        return $url;
    }
}

<?php

namespace App\Services\Cms;

class CmsContentSanitizer
{
    private const ALLOWED_TAGS = '<p><br><br/><strong><b><em><i><u><ul><ol><li><a><h1><h2><h3><h4><blockquote><code><pre>';

    public static function sanitize(string $html): string
    {
        $html = strip_tags($html, self::ALLOWED_TAGS);
        $html = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html) ?? $html;
        $html = preg_replace('/\sstyle\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html) ?? $html;

        return self::sanitizeAnchors($html);
    }

    private static function sanitizeAnchors(string $html): string
    {
        return (string) preg_replace_callback(
            '/<a\s+([^>]*)>/i',
            function (array $m) {
                $attrs = $m[1];
                if (! preg_match('/href\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))/i', $attrs, $hm)) {
                    return '<a>';
                }
                $href = $hm[2] !== '' ? $hm[2] : ($hm[3] !== '' ? $hm[3] : $hm[4]);
                $href = html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                if (! self::isAllowedHref($href)) {
                    return '<span>';
                }

                return '<a href="'.htmlspecialchars($href, ENT_QUOTES, 'UTF-8').'" rel="noopener noreferrer">';
            },
            $html
        );
    }

    private static function isAllowedHref(string $href): bool
    {
        $h = strtolower(trim($href));
        if ($h === '' || str_starts_with($h, 'javascript:') || str_starts_with($h, 'data:')) {
            return false;
        }
        if (str_starts_with($h, 'http://') || str_starts_with($h, 'https://') || str_starts_with($h, '/') || str_starts_with($h, '#') || str_starts_with($h, 'mailto:')) {
            return true;
        }

        return false;
    }
}

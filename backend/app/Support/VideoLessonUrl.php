<?php

namespace App\Support;

class VideoLessonUrl
{
    /** Accept YouTube / Vimeo page or embed URLs only (no arbitrary hosts). */
    public static function isValid(string $url): bool
    {
        $url = trim($url);
        if ($url === '') {
            return false;
        }

        return (bool) preg_match(
            '/^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?|embed\/|shorts\/)|youtu\.be\/|m\.youtube\.com\/|vimeo\.com\/(\d+|video\/)|player\.vimeo\.com\/video\/)/i',
            $url
        );
    }
}

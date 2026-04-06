<?php

namespace App\Services\Search;

use App\Models\Book;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class BookSearchService
{
    public function search(string $query, int $perPage = 15): LengthAwarePaginator
    {
        $q = trim($query);
        if ($q === '') {
            return Book::query()->whereRaw('0 = 1')->paginate($perPage);
        }

        $driver = DB::connection()->getDriverName();
        $base = Book::query()
            ->with('author:id,name')
            ->publicVisible()
            ->orderByDesc('is_trending')
            ->orderByDesc('created_at');

        if ($driver === 'mysql' && $this->mysqlFulltextAvailable()) {
            $escaped = preg_replace('/[^\p{L}\p{N}\s]/u', '', $q) ?? $q;
            $terms = array_filter(preg_split('/\s+/', $escaped) ?: []);
            $bool = $terms === [] ? '*'.$escaped.'*' : implode(' ', array_map(fn ($t) => '+'.$t.'*', $terms));

            $base->where(function ($w) use ($bool, $q) {
                $w->whereRaw('MATCH(books.title, books.description) AGAINST (? IN BOOLEAN MODE)', [$bool])
                    ->orWhereHas('author', fn ($a) => $a->where('name', 'like', '%'.$q.'%'));
            });
        } else {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $base->where(function ($w) use ($like) {
                $w->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('author', fn ($a) => $a->where('name', 'like', $like));
            });
        }

        return $base->paginate($perPage);
    }

    private function mysqlFulltextAvailable(): bool
    {
        try {
            $row = DB::selectOne("SHOW INDEX FROM books WHERE Key_name = 'books_fulltext_idx'");

            return $row !== null;
        } catch (\Throwable) {
            return false;
        }
    }
}

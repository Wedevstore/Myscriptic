<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthorApplication;
use App\Models\AuthorSaleEarning;
use App\Models\Book;
use App\Models\User;
use App\Models\UserBookEngagement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAuthorStatsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = User::query()->where('role', 'author')->orderBy('name');

        if ($request->filled('search')) {
            $s = '%'.$request->string('search').'%';
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', $s)->orWhere('email', 'like', $s);
            });
        }

        $p = $q->paginate($request->integer('per_page', 25));

        $authorIds = collect($p->items())->pluck('id')->all();
        $booksCounts = Book::query()->selectRaw('author_id, COUNT(*) as c')->whereIn('author_id', $authorIds)->groupBy('author_id')->pluck('c', 'author_id');
        $earnings = AuthorSaleEarning::query()->selectRaw('author_id, SUM(net_amount) as t')->whereIn('author_id', $authorIds)->groupBy('author_id')->pluck('t', 'author_id');
        $reads = UserBookEngagement::query()
            ->join('books', 'books.id', '=', 'user_book_engagements.book_id')
            ->whereIn('books.author_id', $authorIds)
            ->selectRaw('books.author_id as author_id, SUM(user_book_engagements.reading_time_seconds) as s')
            ->groupBy('books.author_id')
            ->pluck('s', 'author_id');

        $data = collect($p->items())->map(function (User $u) use ($booksCounts, $earnings, $reads) {
            return [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'books_count' => (int) ($booksCounts[$u->id] ?? 0),
                'total_earnings_usd' => round((float) ($earnings[$u->id] ?? 0), 2),
                'total_read_seconds' => (int) ($reads[$u->id] ?? 0),
                'created_at' => $u->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }

    public function pendingApplications(): JsonResponse
    {
        $apps = AuthorApplication::query()
            ->where('status', 'pending')
            ->with('user:id,name,email')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => $apps->map(fn ($a) => [
                'id' => (string) $a->id,
                'user' => [
                    'id' => (string) $a->user_id,
                    'name' => $a->user?->name,
                    'email' => $a->user?->email,
                ],
                'bio' => $a->bio,
                'payout_method' => $a->payout_method,
                'created_at' => $a->created_at->toIso8601String(),
            ]),
        ]);
    }
}

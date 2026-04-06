<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Services\Cache\BookListCacheService;
use App\Support\AssetCdn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $page = $request->integer('page', 1);
        $parts = [
            'category' => $request->string('category')->toString(),
            'access_type' => $request->string('access_type')->toString(),
            'author_id' => $request->filled('author_id') ? $request->integer('author_id') : null,
            'per' => $perPage,
            'page' => $page,
        ];
        $ttl = (int) config('myscriptic.book_list_cache_ttl', 120);

        $payload = BookListCacheService::remember('api:books:index', $parts, $ttl, function () use ($request, $perPage) {
            $query = Book::query()
                ->with('author:id,name')
                ->publicVisible()
                ->orderByDesc('created_at');

            if ($request->filled('category')) {
                $query->where('category', $request->string('category'));
            }
            if ($request->filled('access_type')) {
                $query->where('access_type', $request->string('access_type'));
            }
            if ($request->filled('author_id')) {
                $query->where('author_id', $request->integer('author_id'));
            }

            $paginator = $query->paginate($perPage);

            return [
                'data' => $paginator->getCollection()->map(fn (Book $b) => $this->bookPayload($b))->values()->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ];
        });

        return response()->json($payload);
    }

    public function show(Request $request, Book $book): JsonResponse
    {
        if ($book->approval_status !== 'approved') {
            $user = $request->user();
            if (! $user || ($user->role !== 'admin' && $book->author_id !== $user->id)) {
                abort(404);
            }
        }

        $book->load('author:id,name');

        return response()->json(['data' => $this->bookPayload($book)]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['author', 'admin'], true)) {
            abort(403, 'Only authors can upload books.');
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:120'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:64'],
            'cover_url' => ['nullable', 'string', 'max:2048'],
            'file_key' => ['nullable', 'string', 'max:512'],
            'audio_key' => ['nullable', 'string', 'max:512'],
            'access_type' => ['required', Rule::in(['FREE', 'PAID', 'SUBSCRIPTION'])],
            'format' => ['required', Rule::in(['ebook', 'audiobook', 'magazine'])],
            'price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:8'],
        ]);

        $book = Book::query()->create([
            ...$data,
            'author_id' => $user->id,
            'approval_status' => 'pending',
            'currency' => $data['currency'] ?? 'USD',
        ]);

        $book->load('author:id,name');

        return response()->json(['data' => $this->bookPayload($book)], 201);
    }

    /** Paginated list of the authenticated author's books (all approval statuses). */
    public function mine(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['author', 'admin'], true)) {
            abort(403, 'Only authors can list their books.');
        }

        $perPage = $request->integer('per_page', 48);
        $paginator = Book::query()
            ->with('author:id,name')
            ->where('author_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(min(96, max(1, $perPage)));

        $collection = $paginator->getCollection();
        $bookIds = $collection->pluck('id')->all();

        $engagementByBook = collect();
        if ($bookIds !== []) {
            $engagementByBook = collect(
                DB::table('user_book_engagements')
                    ->whereIn('book_id', $bookIds)
                    ->groupBy('book_id')
                    ->selectRaw(
                        'book_id, COUNT(*) as reader_count, COALESCE(SUM(pages_read), 0) as pages_read_sum, AVG(completion_percentage) as avg_completion'
                    )
                    ->get()
            )->keyBy('book_id');
        }

        return response()->json([
            'data' => $collection
                ->map(function (Book $b) use ($engagementByBook) {
                    $payload = $this->bookPayload($b);
                    $row = $engagementByBook->get($b->id);
                    $avg = $row && $row->avg_completion !== null
                        ? round((float) $row->avg_completion, 2)
                        : 0.0;

                    $payload['engagement'] = [
                        'readerCount' => $row ? (int) $row->reader_count : 0,
                        'pagesRead' => $row ? (int) $row->pages_read_sum : 0,
                        'avgCompletionPct' => $avg,
                    ];

                    return $payload;
                })
                ->values()
                ->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function destroy(Request $request, Book $book): JsonResponse
    {
        $user = $request->user();
        if ($book->author_id !== $user->id && $user->role !== 'admin') {
            abort(403);
        }

        $book->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function bookPayload(Book $book): array
    {
        $authorName = $book->relationLoaded('author')
            ? ($book->author?->name ?? 'Unknown')
            : ($book->author()->value('name') ?? 'Unknown');

        return [
            'id' => (string) $book->id,
            'title' => $book->title,
            'author' => $authorName,
            'authorId' => (string) $book->author_id,
            'description' => $book->description,
            'category' => $book->category,
            'tags' => $book->tags ?? [],
            'coverUrl' => AssetCdn::transformUrl($book->cover_url),
            'accessType' => $book->access_type,
            'format' => $book->format,
            'price' => $book->price !== null ? (float) $book->price : null,
            'currency' => $book->currency,
            'approvalStatus' => $book->approval_status,
            'isTrending' => $book->is_trending,
            'isNew' => $book->is_new,
            'rating' => $book->rating_avg !== null ? (float) $book->rating_avg : null,
            'reviewCount' => $book->review_count,
            'createdAt' => $book->created_at->toIso8601String(),
        ];
    }
}

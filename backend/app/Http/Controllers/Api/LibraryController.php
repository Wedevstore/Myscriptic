<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\LibraryEntry;
use App\Models\User;
use App\Services\Access\BookAccessService;
use App\Support\AssetCdn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class LibraryController extends Controller
{
    public function __construct(protected BookAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $entries = LibraryEntry::query()
            ->with(['book:id,title,cover_url,format,access_type,author_id,category', 'book.author:id,name'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('granted_at')
            ->get();

        return response()->json([
            'data' => $entries->map(fn (LibraryEntry $e) => [
                'book_id' => (string) $e->book_id,
                'source' => $e->source,
                'order_id' => $e->order_id ? (string) $e->order_id : null,
                'granted_at' => $e->granted_at->toIso8601String(),
                'book' => $e->book ? [
                    'title' => $e->book->title,
                    'cover_url' => AssetCdn::transformUrl($e->book->cover_url),
                    'format' => $e->book->format,
                    'access_type' => $e->book->access_type,
                    'category' => $e->book->category,
                    'author' => $e->book->author?->name,
                ] : null,
            ]),
        ]);
    }

    public function access(Request $request, int $bookId): JsonResponse
    {
        $book = Book::query()->find($bookId);
        if (! $book) {
            return response()->json(['has_access' => false, 'source' => null, 'expires_at' => null], 404);
        }

        $source = $this->access->accessSource($request->user(), $book);
        $sub = $request->user()->activeSubscription();

        return response()->json([
            'has_access' => $source !== null,
            'source' => $source,
            'expires_at' => $sub && $book->access_type === 'SUBSCRIPTION' ? $sub->ends_at->toIso8601String() : null,
        ]);
    }

    public function signedUrl(Request $request, int $bookId): JsonResponse
    {
        $book = Book::query()->findOrFail($bookId);
        if (! $this->access->canAccess($request->user(), $book)) {
            abort(403, 'No access to this book.');
        }

        $expires = now()->addMinutes(15);

        return response()->json([
            'url' => URL::temporarySignedRoute(
                'library.signed-asset',
                $expires,
                ['book' => $bookId, 'uid' => $request->user()->id]
            ),
            'expires_at' => $expires->toIso8601String(),
        ]);
    }

    public function downloadAsset(Request $request, int $book, int $uid)
    {
        if (! $request->hasValidSignature()) {
            abort(403);
        }

        $user = User::query()->findOrFail($uid);
        $b = Book::query()->find($book);
        if (! $b || ! $this->access->canAccess($user, $b)) {
            abort(403);
        }

        if ($b->file_key) {
            // TODO: redirect to S3 presigned URL
        }

        return redirect()->away($b->cover_url ?? 'https://example.invalid/no-file');
    }
}

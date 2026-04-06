<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\CartItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = CartItem::query()
            ->with(['book' => function ($q) {
                $q->select('id', 'title', 'cover_url', 'format', 'price', 'discount_price', 'currency', 'access_type', 'approval_status', 'is_available', 'author_id')
                    ->with('author:id,name');
            }])
            ->where('user_id', $request->user()->id)
            ->get();

        $data = $rows->map(function (CartItem $row) {
            $b = $row->book;
            if (! $b) {
                return null;
            }

            return [
                'id' => (string) $row->id,
                'book_id' => (string) $b->id,
                'title' => $b->title,
                'author' => $b->author?->name ?? '',
                'cover_url' => $b->cover_url,
                'price' => $b->effectivePrice() ?? 0,
                'currency' => $b->currency ?? 'USD',
                'format' => $b->format,
                'quantity' => $row->quantity,
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:99'],
        ]);

        $book = Book::query()->findOrFail($data['book_id']);
        if ($book->access_type !== 'PAID' || $book->approval_status !== 'approved' || ! $book->is_available) {
            abort(422, 'This book cannot be added to the cart.');
        }

        $qty = (int) ($data['quantity'] ?? 1);
        $item = CartItem::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'book_id' => $book->id],
            ['quantity' => $qty]
        );

        return response()->json([
            'data' => [
                'id' => (string) $item->id,
                'book_id' => (string) $book->id,
                'quantity' => $item->quantity,
            ],
        ], 201);
    }

    public function update(Request $request, int $bookId): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $item = CartItem::query()
            ->where('user_id', $request->user()->id)
            ->where('book_id', $bookId)
            ->firstOrFail();

        $item->update(['quantity' => $data['quantity']]);

        return response()->json([
            'data' => [
                'id' => (string) $item->id,
                'book_id' => (string) $item->book_id,
                'quantity' => $item->quantity,
            ],
        ]);
    }

    public function destroy(Request $request, int $bookId): JsonResponse
    {
        CartItem::query()
            ->where('user_id', $request->user()->id)
            ->where('book_id', $bookId)
            ->delete();

        return response()->json(null, 204);
    }

    public function clear(Request $request): JsonResponse
    {
        CartItem::query()->where('user_id', $request->user()->id)->delete();

        return response()->json(null, 204);
    }
}

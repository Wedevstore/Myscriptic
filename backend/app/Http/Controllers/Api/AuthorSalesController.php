<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorSaleEarning;
use App\Models\Book;
use App\Models\OrderItem;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthorSalesController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $authorId = $request->user()->id;
        if (! in_array($request->user()->role, ['author', 'admin'], true)) {
            abort(403);
        }

        $net = (float) AuthorSaleEarning::query()->where('author_id', $authorId)->sum('net_amount');
        $gross = (float) AuthorSaleEarning::query()->where('author_id', $authorId)->sum('gross_amount');
        $orders = AuthorSaleEarning::query()->where('author_id', $authorId)->pluck('order_id')->unique()->count();

        return response()->json([
            'net_total' => $net,
            'gross_total' => $gross,
            'orders_count' => $orders,
        ]);
    }

    public function books(Request $request): JsonResponse
    {
        $authorId = $request->user()->id;
        if (! in_array($request->user()->role, ['author', 'admin'], true)) {
            abort(403);
        }

        $books = Book::query()->where('author_id', $authorId)->get();
        $data = $books->map(function (Book $b) {
            $net = (float) AuthorSaleEarning::query()->where('book_id', $b->id)->sum('net_amount');

            return [
                'book_id' => (string) $b->id,
                'title' => $b->title,
                'net_earnings' => $net,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $authorId = $request->user()->id;
        if (! in_array($request->user()->role, ['author', 'admin'], true)) {
            abort(403);
        }

        $bookIds = Book::query()->where('author_id', $authorId)->pluck('id');
        $orderIds = OrderItem::query()->whereIn('book_id', $bookIds)->distinct()->pluck('order_id');

        $txns = Transaction::query()
            ->whereIn('order_id', $orderIds)
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $txns->map(fn (Transaction $t) => [
                'id' => (string) $t->id,
                'order_id' => (string) $t->order_id,
                'gateway' => $t->gateway,
                'amount' => (float) $t->amount,
                'currency' => $t->currency,
                'status' => $t->status,
                'reference_id' => $t->reference_id,
                'created_at' => $t->created_at->toIso8601String(),
            ]),
        ]);
    }
}

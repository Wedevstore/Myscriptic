<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Order::query()
            ->with(['items', 'user:id,name,email', 'coupon:id,code'])
            ->orderByDesc('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        $perPage = min(100, max(1, $request->integer('per_page', 30)));
        $p = $q->paginate($perPage);

        return response()->json([
            'data' => collect($p->items())->map(fn (Order $o) => [
                'id' => (string) $o->id,
                'order_number' => $o->order_number,
                'user_id' => (string) $o->user_id,
                'user' => $o->user?->only(['id', 'name', 'email']),
                'status' => $o->status,
                'subtotal' => (float) $o->subtotal,
                'discount' => (float) $o->discount,
                'tax' => (float) $o->tax,
                'total' => (float) $o->total_amount,
                'currency' => $o->currency,
                'local_total' => $o->local_total !== null ? (float) $o->local_total : null,
                'payment_gateway' => $o->payment_gateway,
                'payment_ref' => $o->payment_ref,
                'coupon_code' => $o->coupon?->code,
                'created_at' => $o->created_at->toIso8601String(),
                'paid_at' => $o->paid_at?->toIso8601String(),
                'items' => $o->items->map(fn ($i) => [
                    'book_id' => (string) $i->book_id,
                    'title' => $i->title,
                    'author' => $i->author_name,
                    'cover_url' => $i->cover_url,
                    'format' => $i->format,
                    'unit_price' => (float) $i->unit_price,
                    'quantity' => (int) $i->quantity,
                ])->values(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RefundAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Refund::query()
            ->with([
                'order:id,user_id,order_number,currency,payment_gateway,total_amount',
                'order.user:id,name,email',
                'order.items',
                'admin:id,name',
            ])
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $rows->map(fn (Refund $r) => [
                'id' => (string) $r->id,
                'order_id' => (string) $r->order_id,
                'order_number' => $r->order?->order_number,
                'type' => $r->type,
                'amount' => $r->amount !== null ? (float) $r->amount : null,
                'currency' => $r->order?->currency ?? 'USD',
                'gateway' => $r->order?->payment_gateway,
                'reason' => $r->reason,
                'status' => $r->status,
                'created_at' => $r->created_at->toIso8601String(),
                'admin_name' => $r->admin?->name,
                'customer_name' => $r->order?->user?->name,
                'user_id' => $r->order?->user_id !== null ? (string) $r->order->user_id : null,
                'items' => $r->order?->items->map(fn ($i) => [
                    'title' => $i->title,
                    'price' => round((float) $i->unit_price * max(1, (int) $i->quantity), 2),
                    'format' => $i->format,
                ])->values(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'type' => ['required', 'string', 'in:full,partial'],
            'amount' => ['required_if:type,partial', 'nullable', 'numeric', 'min:0.01'],
        ]);

        $order = Order::query()->findOrFail($data['order_id']);
        if ($order->status !== 'paid') {
            return response()->json(['message' => 'Order is not paid.'], 422);
        }

        $refund = DB::transaction(function () use ($request, $order, $data) {
            $r = Refund::query()->create([
                'order_id' => $order->id,
                'admin_id' => $request->user()->id,
                'type' => $data['type'],
                'amount' => $data['type'] === 'partial' ? $data['amount'] : $order->total_amount,
                'status' => 'completed',
            ]);

            $order->update([
                'status' => 'refunded',
                'refunded_at' => now(),
            ]);

            return $r;
        });

        return response()->json(['success' => true, 'refund_id' => (string) $refund->id]);
    }
}

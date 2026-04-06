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
        $q = Order::query()->with(['items', 'user:id,name,email'])->orderByDesc('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        $p = $q->paginate(30);

        return response()->json([
            'data' => collect($p->items())->map(fn (Order $o) => [
                'id' => (string) $o->id,
                'order_number' => $o->order_number,
                'user' => $o->user?->only(['id', 'name', 'email']),
                'status' => $o->status,
                'total' => (float) $o->total_amount,
                'currency' => $o->currency,
                'created_at' => $o->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }
}

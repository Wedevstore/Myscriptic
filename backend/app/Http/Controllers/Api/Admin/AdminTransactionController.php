<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Transaction::query()->with('user:id,name,email')->orderByDesc('id');

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('gateway')) {
            $q->where('gateway', $request->string('gateway'));
        }

        $p = $q->paginate($request->integer('per_page', 40));

        return response()->json([
            'data' => collect($p->items())->map(fn (Transaction $t) => [
                'id' => (string) $t->id,
                'user_id' => (string) $t->user_id,
                'user_email' => $t->user?->email,
                'order_id' => (string) $t->order_id,
                'gateway' => $t->gateway,
                'amount' => (float) $t->amount,
                'currency' => $t->currency,
                'status' => $t->status,
                'reference_id' => $t->reference_id,
                'created_at' => $t->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(['user', 'order']);

        return response()->json(['data' => $transaction]);
    }
}

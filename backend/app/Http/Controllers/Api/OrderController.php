<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\CartItem;
use App\Models\Order;
use App\Services\Checkout\OrderCreationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function __construct(
        protected OrderCreationService $orders,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $list = Order::query()
            ->where('user_id', $request->user()->id)
            ->with('items')
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json([
            'data' => collect($list->items())->map(fn (Order $o) => $this->orderShape($o))->values(),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['sometimes', 'array'],
            'items.*.book_id' => ['required_with:items', 'integer', 'exists:books,id'],
            'items.*.quantity' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'coupon_code' => ['nullable', 'string', 'max:64'],
            'payment_gateway' => ['required', 'string', 'in:paystack,flutterwave,paypal,korapay'],
            'currency' => ['required', 'string', 'in:USD,NGN,GHS,KES'],
            'return_url' => ['nullable', 'string', 'url'],
        ]);

        $user = $request->user();
        if (! empty($data['items'])) {
            CartItem::query()->where('user_id', $user->id)->delete();
            foreach ($data['items'] as $line) {
                $book = Book::query()->find($line['book_id']);
                if (! $book || $book->access_type !== 'PAID' || $book->approval_status !== 'approved' || ! $book->is_available) {
                    throw ValidationException::withMessages(['items' => ['Invalid book in cart payload.']]);
                }
                CartItem::query()->create([
                    'user_id' => $user->id,
                    'book_id' => $book->id,
                    'quantity' => max(1, (int) ($line['quantity'] ?? 1)),
                ]);
            }
        }

        $result = $this->orders->createFromCart($user, [
            'payment_gateway' => $data['payment_gateway'],
            'currency' => $data['currency'],
            'coupon_code' => $data['coupon_code'] ?? null,
            'return_url' => $data['return_url'] ?? null,
        ]);

        $order = $result['order'];

        return response()->json([
            'order_id' => $result['order_id'],
            'payment_url' => $result['payment_url'],
            'order_number' => $result['order_number'],
            'data' => $this->orderShape($order),
        ], 201);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $order->load('items');

        return response()->json(['data' => $this->orderShape($order)]);
    }

    public function verify(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);

        return response()->json([
            'verified' => $order->status === 'paid',
            'order' => $this->orderShape($order->load('items')),
        ]);
    }

    public function invoice(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);
        $order->load(['items', 'user']);

        $pdf = Pdf::loadView('invoices.order', ['order' => $order]);

        return $pdf->download('invoice-'.$order->order_number.'.pdf');
    }

    protected function authorizeOrder(Request $request, Order $order): void
    {
        $u = $request->user();
        if ($order->user_id !== $u->id && $u->role !== 'admin') {
            abort(403);
        }
    }

    private function orderShape(Order $order): array
    {
        $base = [
            'id' => (string) $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'subtotal' => (float) $order->subtotal,
            'discount' => (float) $order->discount,
            'tax' => (float) $order->tax,
            'total' => (float) $order->total_amount,
            'currency' => $order->currency,
            'local_total' => $order->local_total !== null ? (float) $order->local_total : null,
            'payment_gateway' => $order->payment_gateway,
            'payment_ref' => $order->payment_ref,
            'created_at' => $order->created_at->toIso8601String(),
            'paid_at' => $order->paid_at?->toIso8601String(),
        ];

        if ($order->relationLoaded('items')) {
            $base['items'] = $order->items->map(fn ($i) => [
                'book_id' => (string) $i->book_id,
                'title' => $i->title,
                'author' => $i->author_name,
                'cover_url' => $i->cover_url,
                'format' => $i->format,
                'unit_price' => (float) $i->unit_price,
                'quantity' => (int) $i->quantity,
            ])->values();
        }

        return $base;
    }
}

<?php

namespace App\Services\Checkout;

use App\Models\Book;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderCreationService
{
    public function __construct(
        protected PricingService $pricing,
        protected PaymentRedirectService $redirects,
    ) {}

    /**
     * @param  array{payment_gateway: string, currency: string, coupon_code?: string|null, return_url?: string|null}  $payload
     */
    public function createFromCart(User $user, array $payload): array
    {
        $cart = CartItem::query()->with('book.author')->where('user_id', $user->id)->get();
        if ($cart->isEmpty()) {
            throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
        }

        $lines = [];
        $subtotal = 0.0;

        foreach ($cart as $row) {
            $book = $row->book;
            if (! $book || $book->approval_status !== 'approved' || ! $book->is_available) {
                throw ValidationException::withMessages(['cart' => ["Book #{$row->book_id} is not available."]]);
            }
            if ($book->access_type !== 'PAID') {
                throw ValidationException::withMessages(['cart' => ['Only paid books can be purchased in checkout.']]);
            }
            $unit = $book->effectivePrice();
            if ($unit === null) {
                throw ValidationException::withMessages(['cart' => ["Book #{$book->id} has no price."]]);
            }
            $qty = max(1, (int) $row->quantity);
            $lineTotal = round($unit * $qty, 2);
            $subtotal += $lineTotal;
            $author = $book->author;
            $lines[] = [
                'book' => $book,
                'quantity' => $qty,
                'unit_price' => $unit,
                'line_total' => $lineTotal,
                'author_name' => $author?->name ?? 'Unknown',
            ];
        }

        $couponCheck = $this->pricing->validateCoupon($payload['coupon_code'] ?? null, $subtotal);
        if (! $couponCheck['valid']) {
            throw ValidationException::withMessages(['coupon_code' => [$couponCheck['error'] ?? 'Invalid coupon']]);
        }

        $discount = (float) $couponCheck['discount'];
        $taxConfig = $this->pricing->activeTax();
        $tax = $this->pricing->taxAmount($subtotal - $discount, $taxConfig);
        $total = round($subtotal - $discount + $tax, 2);
        $currency = strtoupper($payload['currency']);
        $localTotal = $this->pricing->localTotal($total, $currency);

        return DB::transaction(function () use ($user, $payload, $lines, $subtotal, $discount, $tax, $total, $currency, $localTotal, $couponCheck) {
            $orderNumber = $this->nextOrderNumber();

            $order = Order::query()->create([
                'user_id' => $user->id,
                'order_number' => $orderNumber,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total_amount' => $total,
                'currency' => $currency,
                'local_total' => $localTotal,
                'coupon_id' => $couponCheck['coupon']?->id,
                'payment_gateway' => $payload['payment_gateway'],
                'payment_ref' => 'MS_'.strtoupper(Str::random(16)),
                'status' => 'pending',
                'meta' => [
                    'tax_name' => $this->pricing->activeTax()?->name,
                ],
            ]);

            foreach ($lines as $line) {
                /** @var Book $book */
                $book = $line['book'];
                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'book_id' => $book->id,
                    'title' => $book->title,
                    'author_name' => $line['author_name'],
                    'cover_url' => $book->cover_url,
                    'format' => $book->format,
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                ]);
            }

            CartItem::query()->where('user_id', $user->id)->delete();

            $paymentUrl = $this->redirects->buildPaymentUrl($order, $payload['return_url'] ?? null);

            return [
                'order' => $order->load('items'),
                'order_id' => (string) $order->id,
                'order_number' => $order->order_number,
                'payment_url' => $paymentUrl,
            ];
        });
    }

    protected function nextOrderNumber(): string
    {
        $prefix = 'MS-'.now()->format('Ymd').'-';
        $last = Order::query()->where('order_number', 'like', $prefix.'%')->orderByDesc('id')->value('order_number');
        $seq = 1;
        if ($last && preg_match('/-(\d+)$/', $last, $m)) {
            $seq = (int) $m[1] + 1;
        }

        return $prefix.str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
    }
}

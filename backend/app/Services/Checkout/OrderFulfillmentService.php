<?php

namespace App\Services\Checkout;

use App\Events\OrderPaid;
use App\Models\AuthorSaleEarning;
use App\Models\Coupon;
use App\Models\LibraryEntry;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class OrderFulfillmentService
{
    public function fulfill(Order $order, string $referenceId, string $gateway, array $rawResponse = []): Order
    {
        return DB::transaction(function () use ($order, $referenceId, $gateway, $rawResponse) {
            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'paid') {
                return $locked;
            }

            $locked->update([
                'status' => 'paid',
                'payment_ref' => $referenceId,
                'paid_at' => now(),
            ]);

            Transaction::query()->create([
                'user_id' => $locked->user_id,
                'order_id' => $locked->id,
                'gateway' => $gateway,
                'amount' => $locked->total_amount,
                'currency' => $locked->currency,
                'status' => 'success',
                'reference_id' => $referenceId,
                'raw_response' => $rawResponse ?: ['source' => 'fulfillment'],
            ]);

            $commissionPct = (float) config('myscriptic.direct_sales_commission_pct', 20) / 100;

            $locked->load('items.book');
            foreach ($locked->items as $item) {
                $this->grantLibrary($locked, $item);
                $this->recordAuthorEarning($locked, $item, $commissionPct);
            }

            if ($locked->coupon_id) {
                Coupon::query()->whereKey($locked->coupon_id)->increment('used_count');
            }

            event(new OrderPaid($locked));

            return $locked->fresh(['items']);
        });
    }

    protected function grantLibrary(Order $order, OrderItem $item): void
    {
        LibraryEntry::query()->updateOrCreate(
            [
                'user_id' => $order->user_id,
                'book_id' => $item->book_id,
            ],
            [
                'source' => 'purchase',
                'order_id' => $order->id,
                'granted_at' => now(),
            ]
        );
    }

    protected function recordAuthorEarning(Order $order, OrderItem $item, float $commissionPct): void
    {
        $book = $item->book;
        if (! $book) {
            return;
        }
        $gross = round((float) $item->unit_price * (int) $item->quantity, 2);
        $commission = round($gross * $commissionPct, 2);
        $net = round($gross - $commission, 2);

        AuthorSaleEarning::query()->updateOrCreate(
            ['order_item_id' => $item->id],
            [
                'author_id' => $book->author_id,
                'book_id' => $book->id,
                'order_id' => $order->id,
                'gross_amount' => $gross,
                'commission_amount' => $commission,
                'net_amount' => $net,
            ]
        );
    }
}

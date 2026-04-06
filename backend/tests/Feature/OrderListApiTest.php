<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderListApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_orders_list_requires_authentication(): void
    {
        $this->getJson('/api/orders')->assertUnauthorized();
    }

    public function test_user_lists_orders_with_line_items(): void
    {
        $buyer = User::factory()->create(['role' => 'user']);
        $author = User::factory()->create(['role' => 'author']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Paid Gem',
            'access_type' => 'PAID',
            'format' => 'ebook',
            'approval_status' => 'approved',
            'price' => 9.99,
        ]);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'MS-20260101-042',
            'subtotal' => 9.99,
            'discount' => 0,
            'tax' => 0,
            'total_amount' => 9.99,
            'currency' => 'USD',
            'local_total' => 9.99,
            'payment_gateway' => 'paystack',
            'payment_ref' => 'ref_test',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'book_id' => $book->id,
            'title' => $book->title,
            'author_name' => $author->name,
            'cover_url' => null,
            'format' => 'ebook',
            'unit_price' => 9.99,
            'quantity' => 1,
        ]);

        Sanctum::actingAs($buyer);

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', 'MS-20260101-042')
            ->assertJsonPath('data.0.items.0.title', 'Paid Gem')
            ->assertJsonPath('data.0.items.0.unit_price', 9.99);
    }
}

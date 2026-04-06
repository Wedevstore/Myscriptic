<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderInvoiceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_requires_authentication(): void
    {
        $buyer = User::factory()->create(['role' => 'user']);
        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'MS-INV-000',
            'subtotal' => 1,
            'discount' => 0,
            'tax' => 0,
            'total_amount' => 1,
            'currency' => 'USD',
            'local_total' => 1,
            'payment_gateway' => 'paystack',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->getJson("/api/orders/{$order->id}/invoice")->assertUnauthorized();
    }

    public function test_owner_receives_pdf_invoice(): void
    {
        $buyer = User::factory()->create(['role' => 'user']);
        $author = User::factory()->create(['role' => 'author']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Invoice Book',
            'access_type' => 'PAID',
            'format' => 'ebook',
            'approval_status' => 'approved',
            'price' => 4.5,
        ]);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'MS-INV-001',
            'subtotal' => 4.5,
            'discount' => 0,
            'tax' => 0,
            'total_amount' => 4.5,
            'currency' => 'USD',
            'local_total' => 4.5,
            'payment_gateway' => 'paystack',
            'payment_ref' => 'ref_inv',
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
            'unit_price' => 4.5,
            'quantity' => 1,
        ]);

        Sanctum::actingAs($buyer);

        $response = $this->get("/api/orders/{$order->id}/invoice");

        $response->assertOk();
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('content-type') ?? ''));
    }

    public function test_other_user_cannot_download_invoice(): void
    {
        $buyer = User::factory()->create(['role' => 'user']);
        $other = User::factory()->create(['role' => 'user']);
        $author = User::factory()->create(['role' => 'author']);

        $book = Book::query()->create([
            'author_id' => $author->id,
            'title' => 'Secret',
            'access_type' => 'PAID',
            'format' => 'ebook',
            'approval_status' => 'approved',
        ]);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'MS-INV-002',
            'subtotal' => 1,
            'discount' => 0,
            'tax' => 0,
            'total_amount' => 1,
            'currency' => 'USD',
            'local_total' => 1,
            'payment_gateway' => 'paystack',
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
            'unit_price' => 1,
            'quantity' => 1,
        ]);

        Sanctum::actingAs($other);

        $this->get("/api/orders/{$order->id}/invoice")->assertForbidden();
    }
}

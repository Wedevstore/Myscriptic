<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class PaymentMockFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('myscriptic.allow_mock_payment_completion', true);
        Config::set('myscriptic.frontend_url', 'http://spa.test');
    }

    public function test_mock_pay_interstitial_renders_when_mock_enabled(): void
    {
        $user  = User::factory()->create();
        $order = Order::query()->create([
            'user_id'        => $user->id,
            'order_number'   => 'T-ORD-'.uniqid(),
            'subtotal'       => 10,
            'discount'       => 0,
            'tax'            => 0,
            'total_amount'   => 10,
            'currency'       => 'USD',
            'payment_gateway'=> 'paystack',
            'status'         => 'pending',
        ]);

        $url = URL::temporarySignedRoute(
            'payments.mock-pay',
            now()->addMinutes(30),
            ['order' => $order->id]
        );

        $this->get($url)
            ->assertOk()
            ->assertSee('Mock checkout', false)
            ->assertSee('Complete payment', false)
            ->assertSee('Cancel', false);
    }

    public function test_mock_cancel_redirects_to_frontend_failure_with_reason(): void
    {
        $user  = User::factory()->create();
        $order = Order::query()->create([
            'user_id'        => $user->id,
            'order_number'   => 'T-ORD-'.uniqid(),
            'subtotal'       => 10,
            'discount'       => 0,
            'tax'            => 0,
            'total_amount'   => 10,
            'currency'       => 'USD',
            'payment_gateway'=> 'flutterwave',
            'status'         => 'pending',
        ]);

        $url = URL::temporarySignedRoute(
            'payments.mock-cancel',
            now()->addMinutes(30),
            ['order' => $order->id]
        );

        $this->get($url)
            ->assertRedirect('http://spa.test/order-failure?order='.$order->id.'&gateway=flutterwave&reason=user_cancelled');
    }

    public function test_mock_routes_return_404_when_mock_disabled(): void
    {
        Config::set('myscriptic.allow_mock_payment_completion', false);

        $user  = User::factory()->create();
        $order = Order::query()->create([
            'user_id'        => $user->id,
            'order_number'   => 'T-ORD-'.uniqid(),
            'subtotal'       => 10,
            'discount'       => 0,
            'tax'            => 0,
            'total_amount'   => 10,
            'currency'       => 'USD',
            'payment_gateway'=> 'paystack',
            'status'         => 'pending',
        ]);

        $payUrl = URL::temporarySignedRoute(
            'payments.mock-pay',
            now()->addMinutes(30),
            ['order' => $order->id]
        );

        $this->get($payUrl)->assertNotFound();
    }

    public function test_subscription_mock_cancel_redirects_to_subscription_page(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::query()->create([
            'name'               => 'Test Plan',
            'slug'               => 'test-plan-'.uniqid(),
            'price'              => 9.99,
            'currency'           => 'USD',
            'duration_days'      => 30,
            'unlimited_reading'  => true,
            'status'             => 'active',
            'sort_order'         => 0,
        ]);

        $subOrder = SubscriptionOrder::query()->create([
            'user_id'          => $user->id,
            'plan_id'          => $plan->id,
            'amount'           => 9.99,
            'currency'         => 'USD',
            'payment_gateway'  => 'paystack',
            'payment_ref'      => 'SUB_T',
            'status'           => 'pending',
        ]);

        $url = URL::temporarySignedRoute(
            'payments.subscription-mock-cancel',
            now()->addMinutes(30),
            ['subscriptionOrder' => $subOrder->id]
        );

        $this->get($url)
            ->assertRedirect('http://spa.test/subscription?subscription_cancelled=1');
    }
}

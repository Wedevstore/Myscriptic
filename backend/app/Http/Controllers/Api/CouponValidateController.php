<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Checkout\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponValidateController extends Controller
{
    public function __construct(protected PricingService $pricing) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $res = $this->pricing->validateCoupon($data['code'], (float) $data['subtotal']);
        if (! $res['valid']) {
            return response()->json([
                'valid' => false,
                'discount' => 0,
                'coupon' => null,
                'message' => $res['error'] ?? 'Invalid',
            ]);
        }

        /** @var \App\Models\Coupon|null $c */
        $c = $res['coupon'];

        return response()->json([
            'valid' => true,
            'discount' => $res['discount'],
            'coupon' => $c ? [
                'id' => (string) $c->id,
                'code' => $c->code,
                'discount_type' => $c->discount_type,
                'discount_value' => (float) $c->discount_value,
            ] : null,
        ]);
    }
}

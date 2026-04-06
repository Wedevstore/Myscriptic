<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Coupon::query()->orderByDesc('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', 'unique:coupons,code'],
            'discount_type' => ['required', 'string', 'in:pct,fixed'],
            'discount_value' => ['required', 'numeric', 'min:0'],
            'expires_at' => ['nullable', 'date'],
            'max_uses' => ['integer', 'min:1'],
            'min_order_amount' => ['numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $c = Coupon::query()->create([
            ...$data,
            'code' => strtoupper($data['code']),
            'max_uses' => $data['max_uses'] ?? 1000,
            'min_order_amount' => $data['min_order_amount'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $c], 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'discount_type' => ['sometimes', 'string', 'in:pct,fixed'],
            'discount_value' => ['sometimes', 'numeric', 'min:0'],
            'expires_at' => ['nullable', 'date'],
            'max_uses' => ['sometimes', 'integer', 'min:1'],
            'min_order_amount' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $coupon->update($data);

        return response()->json(['data' => $coupon->fresh()]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return response()->json(null, 204);
    }
}

<?php

namespace App\Services\Checkout;

use App\Models\Coupon;
use App\Models\TaxConfig;

class PricingService
{
    public function activeTax(): ?TaxConfig
    {
        return TaxConfig::query()->where('is_enabled', true)->orderBy('id')->first();
    }

    public function validateCoupon(?string $code, float $subtotal): array
    {
        if (! $code) {
            return ['valid' => true, 'coupon' => null, 'discount' => 0.0];
        }

        $coupon = Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper($code)])->first();
        if (! $coupon || ! $coupon->is_active) {
            return ['valid' => false, 'error' => 'Invalid coupon code.', 'discount' => 0.0];
        }
        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            return ['valid' => false, 'error' => 'This coupon has expired.', 'discount' => 0.0];
        }
        if ($coupon->used_count >= $coupon->max_uses) {
            return ['valid' => false, 'error' => 'This coupon has reached its usage limit.', 'discount' => 0.0];
        }
        if ($subtotal < (float) $coupon->min_order_amount) {
            return ['valid' => false, 'error' => 'Minimum order amount not met for this coupon.', 'discount' => 0.0];
        }

        $discount = $this->couponDiscount($coupon, $subtotal);

        return ['valid' => true, 'coupon' => $coupon, 'discount' => $discount];
    }

    public function couponDiscount(Coupon $coupon, float $subtotal): float
    {
        if ($coupon->discount_type === 'pct') {
            return round($subtotal * ((float) $coupon->discount_value / 100), 2);
        }

        return round(min((float) $coupon->discount_value, $subtotal), 2);
    }

    public function taxAmount(float $subtotalAfterDiscount, ?TaxConfig $tax): float
    {
        if (! $tax) {
            return 0.0;
        }

        return round(max(0, $subtotalAfterDiscount) * (float) $tax->rate, 2);
    }

    public function localTotal(float $totalUsd, string $currency): float
    {
        $rates = config('myscriptic.currency_rates', []);
        $rate = (float) ($rates[$currency] ?? 1);

        return round($totalUsd * $rate, 2);
    }
}

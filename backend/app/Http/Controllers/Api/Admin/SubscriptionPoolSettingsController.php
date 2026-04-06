<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionPoolSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $pct = (float) (PlatformSetting::get('subscription_pool_commission_pct')
            ?? (string) config('myscriptic.subscription_pool_commission_pct', 30));

        return response()->json([
            'subscription_pool_commission_pct' => $pct,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subscription_pool_commission_pct' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $old = PlatformSetting::get('subscription_pool_commission_pct');
        PlatformSetting::set('subscription_pool_commission_pct', (string) $data['subscription_pool_commission_pct']);

        AuditLog::record($request->user()->id, 'settings.subscription_commission_updated', 'platform_setting', 'subscription_pool_commission_pct', [
            'from' => $old,
            'to' => $data['subscription_pool_commission_pct'],
        ]);

        return response()->json(['success' => true]);
    }
}

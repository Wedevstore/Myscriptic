<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;

class SiteConfigController extends Controller
{
    /**
     * Public, cacheable client configuration (no secrets).
     */
    public function __invoke(): JsonResponse
    {
        $adsEnabled = filter_var(PlatformSetting::get('ads_enabled', config('myscriptic.ads_enabled') ? '1' : '0'), FILTER_VALIDATE_BOOLEAN)
            || config('myscriptic.ads_enabled');

        return response()->json([
            'ads' => [
                'enabled' => $adsEnabled,
                'network' => PlatformSetting::get('ads_network', 'adsense'),
                'client_id' => PlatformSetting::get('ads_client_id', env('ADS_CLIENT_ID', '')),
                'slot_banner' => PlatformSetting::get('ads_slot_banner', env('ADS_SLOT_BANNER', '')),
                'slot_feed' => PlatformSetting::get('ads_slot_feed', env('ADS_SLOT_FEED', '')),
                'slot_rewarded' => PlatformSetting::get('ads_slot_rewarded', env('ADS_SLOT_REWARDED', '')),
            ],
            'cdn' => [
                'asset_base' => rtrim((string) config('myscriptic.asset_cdn_url', ''), '/') ?: null,
            ],
            'feature_flags' => $this->featureFlags(),
        ]);
    }

    /**
     * @return array<string, bool>
     */
    private function featureFlags(): array
    {
        $raw = PlatformSetting::get('feature_flags_json', '{}');
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? array_map(fn ($v) => (bool) $v, $decoded) : [];
    }
}

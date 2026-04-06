<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSiteFeaturesController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'ads_enabled' => PlatformSetting::get('ads_enabled', '0'),
                'ads_network' => PlatformSetting::get('ads_network', 'adsense'),
                'ads_client_id' => PlatformSetting::get('ads_client_id', ''),
                'ads_slot_banner' => PlatformSetting::get('ads_slot_banner', ''),
                'ads_slot_feed' => PlatformSetting::get('ads_slot_feed', ''),
                'ads_slot_rewarded' => PlatformSetting::get('ads_slot_rewarded', ''),
                'feature_flags_json' => PlatformSetting::get('feature_flags_json', '{}'),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ads_enabled' => ['sometimes', 'boolean'],
            'ads_network' => ['sometimes', 'string', 'max:32'],
            'ads_client_id' => ['nullable', 'string', 'max:255'],
            'ads_slot_banner' => ['nullable', 'string', 'max:255'],
            'ads_slot_feed' => ['nullable', 'string', 'max:255'],
            'ads_slot_rewarded' => ['nullable', 'string', 'max:255'],
            'feature_flags_json' => ['nullable', 'string', 'max:4000'],
        ]);

        if (array_key_exists('ads_enabled', $data)) {
            PlatformSetting::set('ads_enabled', $data['ads_enabled'] ? '1' : '0');
        }
        if (array_key_exists('ads_network', $data)) {
            PlatformSetting::set('ads_network', $data['ads_network']);
        }
        if (array_key_exists('ads_client_id', $data)) {
            PlatformSetting::set('ads_client_id', (string) ($data['ads_client_id'] ?? ''));
        }
        if (array_key_exists('ads_slot_banner', $data)) {
            PlatformSetting::set('ads_slot_banner', (string) ($data['ads_slot_banner'] ?? ''));
        }
        if (array_key_exists('ads_slot_feed', $data)) {
            PlatformSetting::set('ads_slot_feed', (string) ($data['ads_slot_feed'] ?? ''));
        }
        if (array_key_exists('ads_slot_rewarded', $data)) {
            PlatformSetting::set('ads_slot_rewarded', (string) ($data['ads_slot_rewarded'] ?? ''));
        }
        if (array_key_exists('feature_flags_json', $data) && $data['feature_flags_json'] !== null) {
            json_decode($data['feature_flags_json'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                abort(422, 'feature_flags_json must be valid JSON.');
            }
            PlatformSetting::set('feature_flags_json', $data['feature_flags_json']);
        }

        PlatformActivityLogger::fromRequest($request, 'site_features.updated');

        return $this->show();
    }
}

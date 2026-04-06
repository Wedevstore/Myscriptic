<?php

return [
    'frontend_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),
    'allow_mock_payment_completion' => filter_var(env('ALLOW_MOCK_PAYMENTS', true), FILTER_VALIDATE_BOOLEAN),

    'direct_sales_commission_pct' => (float) env('DIRECT_SALES_COMMISSION_PCT', 20),
    'subscription_pool_commission_pct' => (float) env('SUBSCRIPTION_POOL_COMMISSION_PCT', 30),

    'engagement_min_sync_interval_seconds' => (int) env('ENGAGEMENT_MIN_SYNC_INTERVAL_SECONDS', 2),
    'engagement_max_pages_per_minute' => (int) env('ENGAGEMENT_MAX_PAGES_PER_MINUTE', 5),
    'engagement_min_session_seconds' => (int) env('ENGAGEMENT_MIN_SESSION_SECONDS', 30),

    'currency_rates' => [
        'NGN' => (float) env('RATE_NGN', 1600),
        'GHS' => (float) env('RATE_GHS', 15.2),
        'KES' => (float) env('RATE_KES', 130),
    ],

    'paystack_secret' => env('PAYSTACK_SECRET_KEY'),
    'flutterwave_secret' => env('FLUTTERWAVE_SECRET_HASH'),
    'korapay_secret' => env('KORAPAY_SECRET_KEY'),
    'paypal_webhook_id' => env('PAYPAL_WEBHOOK_ID'),

    'homepage_cache_ttl' => (int) env('HOMEPAGE_CACHE_TTL', 300),
    'analytics_cache_ttl' => (int) env('ANALYTICS_CACHE_TTL', 120),
    'fcm_server_key' => env('FCM_SERVER_KEY'),

    'book_list_cache_ttl' => (int) env('BOOK_LIST_CACHE_TTL', 120),
    'store_list_cache_ttl' => (int) env('STORE_LIST_CACHE_TTL', 120),
    'categories_cache_ttl' => (int) env('CATEGORIES_CACHE_TTL', 600),
    'search_cache_ttl' => (int) env('SEARCH_CACHE_TTL', 30),

    'asset_cdn_url' => env('ASSET_CDN_URL', ''),
    'asset_cdn_source_hosts' => env('ASSET_CDN_SOURCE_HOSTS', ''),

    'ads_enabled' => filter_var(env('ADS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
];

<?php

use App\Http\Controllers\Api\Admin\AdminAnalyticsController;
use App\Http\Controllers\Api\Admin\AdminAuthorStatsController;
use App\Http\Controllers\Api\Admin\AdminBookModerationController;
use App\Http\Controllers\Api\Admin\AdminCmsPageController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminHomepageController;
use App\Http\Controllers\Api\Admin\AdminNotificationBroadcastController;
use App\Http\Controllers\Api\Admin\AdminPlatformActivityController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AuditLogAdminController;
use App\Http\Controllers\Api\Admin\AuthorPayoutAdminController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\RevenueCycleAdminController;
use App\Http\Controllers\Api\Admin\SubscriptionPlanAdminController;
use App\Http\Controllers\Api\Admin\SubscriptionPoolSettingsController;
use App\Http\Controllers\Api\Admin\AdminTransactionController;
use App\Http\Controllers\Api\Admin\AuthorApplicationAdminController;
use App\Http\Controllers\Api\Admin\CouponAdminController;
use App\Http\Controllers\Api\Admin\RefundAdminController;
use App\Http\Controllers\Api\Admin\TaxAdminController;
use App\Http\Controllers\Api\CmsPublicController;
use App\Http\Controllers\Api\FcmDeviceController;
use App\Http\Controllers\Api\UserNotificationController;
use App\Http\Controllers\Api\AuthorApplicationController;
use App\Http\Controllers\Api\AuthorCourseController;
use App\Http\Controllers\Api\AuthorSalesController;
use App\Http\Controllers\Api\AuthorSubscriptionEngagementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuthorFollowController;
use App\Http\Controllers\Api\AuthorPublicController;
use App\Http\Controllers\Api\BookCategoryController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\BookSearchController;
use App\Http\Controllers\Api\Admin\AdminAuthorCourseController;
use App\Http\Controllers\Api\Admin\AdminContactSubmissionController;
use App\Http\Controllers\Api\Admin\AdminSiteFeaturesController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\SiteConfigController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\ContactSubmissionController;
use App\Http\Controllers\Api\CoursePublicController;
use App\Http\Controllers\Api\CouponValidateController;
use App\Http\Controllers\Api\LibraryController;
use App\Http\Controllers\Api\ReadingEngagementController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentInitializeController;
use App\Http\Controllers\Api\PaymentMockController;
use App\Http\Controllers\Api\PaymentVerifyController;
use App\Http\Controllers\Api\StoreBookController;
use App\Http\Controllers\Api\SubscriptionCatalogController;
use App\Http\Controllers\Api\SubscriptionCheckoutController;
use App\Http\Controllers\Api\SubscriptionPaymentMockController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\SubscriptionStatusController;
use App\Http\Controllers\Api\TrendingAuthorsController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\WebhookFlutterwaveController;
use App\Http\Controllers\Api\WebhookKorapayController;
use App\Http\Controllers\Api\WebhookPayPalController;
use App\Http\Controllers\Api\WebhookPaystackController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [PasswordController::class, 'forgot']);
        Route::post('/reset-password', [PasswordController::class, 'reset']);
    });
    Route::post('/logout', [AuthController::class, 'logout'])
        ->middleware(['auth:sanctum', 'throttle:auth'])
        ->name('api.auth.logout');
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum', 'not.blocked', 'throttle:auth']);
    Route::patch('/me', [AuthController::class, 'updateMe'])->middleware(['auth:sanctum', 'not.blocked', 'throttle:auth']);
});

Route::get('/cms/homepage', [CmsPublicController::class, 'homepage']);
Route::get('/cms/pages/{slug}', [CmsPublicController::class, 'page']);

Route::get('/site-config', SiteConfigController::class);

Route::post('/contact', [ContactSubmissionController::class, 'store'])->middleware('throttle:contact');

Route::get('/books/search', BookSearchController::class)->middleware('throttle:search');
Route::get('/books/categories', [BookCategoryController::class, 'index']);
Route::get('/books', [BookController::class, 'index']);
Route::get('/books/{book}', [BookController::class, 'show']);

Route::get('/store/books', [StoreBookController::class, 'index']);
Route::get('/store/featured', [StoreBookController::class, 'featured']);

Route::get('/subscription/plans', [SubscriptionPlanController::class, 'index']);

Route::get('/authors/trending', [TrendingAuthorsController::class, 'index'])->middleware('throttle:search');
Route::get('/authors/{author}', [AuthorPublicController::class, 'show'])
    ->whereNumber('author')
    ->middleware('throttle:search');

Route::get('/courses', [CoursePublicController::class, 'index'])->middleware('throttle:search');
Route::get('/courses/{slug}', [CoursePublicController::class, 'show'])
    ->middleware(['throttle:search', 'auth.optional']);

Route::post('/coupons/validate', CouponValidateController::class);

Route::middleware('throttle:webhooks')->group(function () {
    Route::post('/webhooks/paystack', WebhookPaystackController::class);
    Route::post('/webhooks/flutterwave', WebhookFlutterwaveController::class);
    Route::post('/webhooks/korapay', WebhookKorapayController::class);
    Route::post('/webhooks/paypal', WebhookPayPalController::class);
});

Route::get('/payments/mock-pay/{order}', [PaymentMockController::class, 'interstitial'])
    ->name('payments.mock-pay')
    ->middleware('signed');
Route::get('/payments/mock-complete/{order}', [PaymentMockController::class, 'complete'])
    ->name('payments.mock-complete')
    ->middleware('signed');
Route::get('/payments/mock-cancel/{order}', [PaymentMockController::class, 'cancel'])
    ->name('payments.mock-cancel')
    ->middleware('signed');

Route::get('/payments/subscription-mock-pay/{subscriptionOrder}', [SubscriptionPaymentMockController::class, 'interstitial'])
    ->name('payments.subscription-mock-pay')
    ->middleware('signed');
Route::get('/payments/subscription-mock-complete/{subscriptionOrder}', [SubscriptionPaymentMockController::class, 'complete'])
    ->name('payments.subscription-mock-complete')
    ->middleware('signed');
Route::get('/payments/subscription-mock-cancel/{subscriptionOrder}', [SubscriptionPaymentMockController::class, 'cancel'])
    ->name('payments.subscription-mock-cancel')
    ->middleware('signed');

Route::get('/library/{book}/asset/{uid}', [LibraryController::class, 'downloadAsset'])
    ->name('library.signed-asset')
    ->middleware('signed');

Route::middleware(['auth:sanctum', 'not.blocked'])->group(function () {
    Route::post('/books', [BookController::class, 'store']);
    Route::patch('/books/{book}', [BookController::class, 'update']);
    Route::get('/author/my-books', [BookController::class, 'mine']);
    Route::delete('/books/{book}', [BookController::class, 'destroy']);
    Route::post('/upload/signed-url', [UploadController::class, 'signedUrl']);

    Route::get('/me/followed-authors', [AuthorFollowController::class, 'index']);
    Route::post('/authors/{author}/follow', [AuthorFollowController::class, 'store'])
        ->whereNumber('author')
        ->middleware('throttle:auth');
    Route::delete('/authors/{author}/follow', [AuthorFollowController::class, 'destroy'])
        ->whereNumber('author')
        ->middleware('throttle:auth');

    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::patch('/cart/{bookId}', [CartController::class, 'update'])->whereNumber('bookId');
    Route::delete('/cart', [CartController::class, 'clear']);
    Route::delete('/cart/{bookId}', [CartController::class, 'destroy'])->whereNumber('bookId');

    Route::get('/library', [LibraryController::class, 'index']);
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{bookId}', [WishlistController::class, 'destroy'])->whereNumber('bookId');

    Route::get('/library/{bookId}/access', [LibraryController::class, 'access'])->whereNumber('bookId');
    Route::post('/library/{bookId}/signed-url', [LibraryController::class, 'signedUrl'])->whereNumber('bookId');

    Route::middleware('throttle:payments')->group(function () {
        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/payments/initialize', PaymentInitializeController::class);
        Route::post('/payments/verify', [PaymentVerifyController::class, 'verify']);
        Route::post('/subscription/checkout', [SubscriptionCheckoutController::class, 'store']);
    });

    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::get('/orders/{order}/verify', [OrderController::class, 'verify']);
    Route::get('/orders/{order}/invoice', [OrderController::class, 'invoice']);
    Route::get('/subscription/status', [SubscriptionStatusController::class, 'show']);
    Route::post('/subscription/cancel', [SubscriptionStatusController::class, 'cancel']);
    Route::get('/subscription/catalog', [SubscriptionCatalogController::class, 'index']);

    Route::get('/reading-analytics', [ReadingEngagementController::class, 'analytics']);
    Route::post('/reading-progress', [ReadingEngagementController::class, 'sync']);
    Route::get('/reading-progress/{bookId}', [ReadingEngagementController::class, 'show'])->whereNumber('bookId');

    Route::post('/author/apply', [AuthorApplicationController::class, 'apply']);
    Route::get('/author/sales/summary', [AuthorSalesController::class, 'summary']);
    Route::get('/author/sales/books', [AuthorSalesController::class, 'books']);
    Route::get('/author/sales/transactions', [AuthorSalesController::class, 'transactions']);

    Route::get('/author/courses', [AuthorCourseController::class, 'index']);
    Route::post('/author/courses', [AuthorCourseController::class, 'store']);
    Route::put('/author/courses/{authorCourse}', [AuthorCourseController::class, 'update']);
    Route::delete('/author/courses/{authorCourse}', [AuthorCourseController::class, 'destroy']);

    Route::get('/author/subscription-pool/summary', [AuthorSubscriptionEngagementController::class, 'summary']);
    Route::get('/author/subscription-pool/payouts', [AuthorSubscriptionEngagementController::class, 'payouts']);
    Route::get('/author/subscription-pool/cycles/{revenueCycle}', [AuthorSubscriptionEngagementController::class, 'cycleTransparency']);

    Route::get('/notifications', [UserNotificationController::class, 'index']);
    Route::patch('/notifications/{userNotification}/read', [UserNotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [UserNotificationController::class, 'markAllRead']);

    Route::post('/devices/fcm', [FcmDeviceController::class, 'register']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/site-features', [AdminSiteFeaturesController::class, 'show']);
        Route::put('/site-features', [AdminSiteFeaturesController::class, 'update']);

        Route::get('/dashboard', [AdminDashboardController::class, 'metrics']);
        Route::get('/dashboard/metrics', [AdminDashboardController::class, 'metrics']);
        Route::get('/dashboard/charts', [AdminDashboardController::class, 'charts']);

        Route::get('/analytics/revenue', [AdminAnalyticsController::class, 'revenue']);
        Route::get('/analytics/top-books/sales', [AdminAnalyticsController::class, 'topBooksBySales']);
        Route::get('/analytics/top-books/engagement', [AdminAnalyticsController::class, 'topBooksByEngagement']);
        Route::get('/analytics/top-authors', [AdminAnalyticsController::class, 'topAuthors']);
        Route::get('/analytics/cohort-retention', [AdminAnalyticsController::class, 'cohortRetention']);

        Route::get('/author-courses', [AdminAuthorCourseController::class, 'index']);

        Route::get('/homepage/sections', [AdminHomepageController::class, 'sectionsIndex']);
        Route::post('/homepage/sections', [AdminHomepageController::class, 'storeSection']);
        Route::post('/homepage/sections/reorder', [AdminHomepageController::class, 'reorderSections']);
        Route::put('/homepage/sections/{homepageSection}', [AdminHomepageController::class, 'updateSection']);
        Route::delete('/homepage/sections/{homepageSection}', [AdminHomepageController::class, 'destroySection']);
        Route::post('/homepage/sections/{homepageSection}/items', [AdminHomepageController::class, 'storeItem']);
        Route::put('/homepage/items/{homepageItem}', [AdminHomepageController::class, 'updateItem']);
        Route::delete('/homepage/items/{homepageItem}', [AdminHomepageController::class, 'destroyItem']);
        Route::post('/homepage/sections/{homepageSection}/items/reorder', [AdminHomepageController::class, 'reorderItems']);

        Route::get('/cms-pages', [AdminCmsPageController::class, 'index']);
        Route::post('/cms-pages', [AdminCmsPageController::class, 'store']);
        Route::put('/cms-pages/{cmsPage}', [AdminCmsPageController::class, 'update']);
        Route::delete('/cms-pages/{cmsPage}', [AdminCmsPageController::class, 'destroy']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::patch('/users/{user}/block', [AdminUserController::class, 'updateBlock']);

        Route::get('/authors/stats', [AdminAuthorStatsController::class, 'index']);
        Route::get('/authors/pending-applications', [AdminAuthorStatsController::class, 'pendingApplications']);

        Route::get('/books/pending', [AdminBookModerationController::class, 'pending']);
        Route::post('/books/{book}/approve', [AdminBookModerationController::class, 'approve']);
        Route::post('/books/{book}/reject', [AdminBookModerationController::class, 'reject']);

        Route::get('/platform-activities', [AdminPlatformActivityController::class, 'index']);

        Route::get('/contact-submissions', [AdminContactSubmissionController::class, 'index']);

        Route::get('/notification-broadcasts', [AdminNotificationBroadcastController::class, 'index']);
        Route::post('/notification-broadcasts', [AdminNotificationBroadcastController::class, 'store']);

        Route::get('/author-applications', [AuthorApplicationAdminController::class, 'index']);
        Route::post('/author-applications/{authorApplication}/approve', [AuthorApplicationAdminController::class, 'approve']);
        Route::post('/author-applications/{authorApplication}/reject', [AuthorApplicationAdminController::class, 'reject']);

        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::get('/transactions', [AdminTransactionController::class, 'index']);
        Route::get('/transactions/{transaction}', [AdminTransactionController::class, 'show']);

        Route::get('/refunds', [RefundAdminController::class, 'index']);
        Route::post('/refunds', [RefundAdminController::class, 'store']);

        Route::get('/coupons', [CouponAdminController::class, 'index']);
        Route::post('/coupons', [CouponAdminController::class, 'store']);
        Route::put('/coupons/{coupon}', [CouponAdminController::class, 'update']);
        Route::delete('/coupons/{coupon}', [CouponAdminController::class, 'destroy']);

        Route::get('/tax', [TaxAdminController::class, 'index']);
        Route::put('/tax/{tax}', [TaxAdminController::class, 'update']);

        Route::get('/subscription-plans', [SubscriptionPlanAdminController::class, 'index']);
        Route::post('/subscription-plans', [SubscriptionPlanAdminController::class, 'store']);
        Route::put('/subscription-plans/{subscriptionPlan}', [SubscriptionPlanAdminController::class, 'update']);
        Route::delete('/subscription-plans/{subscriptionPlan}', [SubscriptionPlanAdminController::class, 'destroy']);

        Route::get('/subscription-pool/settings', [SubscriptionPoolSettingsController::class, 'show']);
        Route::put('/subscription-pool/settings', [SubscriptionPoolSettingsController::class, 'update']);

        Route::get('/revenue-cycles', [RevenueCycleAdminController::class, 'index']);
        Route::get('/revenue-cycles/{revenueCycle}', [RevenueCycleAdminController::class, 'show']);

        Route::get('/author-payouts', [AuthorPayoutAdminController::class, 'index']);
        Route::get('/author-payouts/export', [AuthorPayoutAdminController::class, 'export']);
        Route::post('/author-payouts/{authorPayout}/approve', [AuthorPayoutAdminController::class, 'approve']);
        Route::post('/author-payouts/{authorPayout}/hold', [AuthorPayoutAdminController::class, 'hold']);

        Route::get('/audit-logs', [AuditLogAdminController::class, 'index']);
    });
});

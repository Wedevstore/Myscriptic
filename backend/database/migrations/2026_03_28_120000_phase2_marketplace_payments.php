<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->boolean('is_available')->default(true)->after('review_count');
            $table->decimal('discount_price', 10, 2)->nullable()->after('price');
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('author_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('bio');
            $table->string('payout_method', 64);
            $table->json('payout_details')->nullable();
            $table->string('status', 32)->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();

            $table->unique(['user_id', 'book_id']);
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('discount_type', 16); // pct | fixed
            $table->decimal('discount_value', 10, 2);
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('max_uses')->default(1000);
            $table->unsignedInteger('used_count')->default(0);
            $table->decimal('min_order_amount', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('tax_configs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('rate', 5, 4);
            $table->boolean('is_enabled')->default(false);
            $table->string('country_code', 8)->nullable();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('order_number')->unique();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->string('currency', 8)->default('USD');
            $table->decimal('local_total', 12, 2)->nullable();
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete();
            $table->string('payment_gateway', 32);
            $table->string('payment_ref')->nullable();
            $table->string('status', 32)->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('author_name');
            $table->string('cover_url', 2048)->nullable();
            $table->string('format', 32);
            $table->decimal('unit_price', 12, 2);
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('gateway', 32);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 8);
            $table->string('status', 32);
            $table->string('reference_id')->unique();
            $table->json('raw_response')->nullable();
            $table->timestamps();
        });

        Schema::create('author_sale_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->decimal('gross_amount', 12, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('net_amount', 12, 2);
            $table->timestamps();

            $table->unique('order_item_id');
        });

        Schema::create('library_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->string('source', 32);
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('granted_at');
            $table->timestamps();

            $table->unique(['user_id', 'book_id']);
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 16);
            $table->decimal('amount', 12, 2)->nullable();
            $table->text('reason')->nullable();
            $table->string('status', 32)->default('completed');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('library_entries');
        Schema::dropIfExists('author_sale_earnings');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('tax_configs');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('author_applications');
        Schema::dropIfExists('platform_settings');

        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn(['is_available', 'discount_price']);
        });
    }
};

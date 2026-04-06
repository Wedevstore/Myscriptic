<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price', 10, 2);
            $table->string('currency', 8)->default('USD');
            $table->unsignedInteger('duration_days');
            $table->boolean('unlimited_reading')->default(true);
            $table->string('status', 16)->default('active'); // active | inactive
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('subscription_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 8)->default('USD');
            $table->string('payment_gateway', 32);
            $table->string('payment_ref')->nullable();
            $table->string('status', 32)->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans')->cascadeOnDelete();
            $table->foreignId('subscription_order_id')->nullable()->constrained('subscription_orders')->nullOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status', 32)->default('active'); // active | expired | canceled
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['ends_at', 'status']);
        });

        Schema::create('user_book_engagements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('pages_read')->default(0);
            $table->unsignedInteger('total_pages')->nullable();
            $table->decimal('completion_percentage', 6, 2)->default(0);
            $table->unsignedBigInteger('reading_time_seconds')->default(0);
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'book_id']);
            $table->index('book_id');
        });

        Schema::create('revenue_cycles', function (Blueprint $table) {
            $table->id();
            $table->string('period_label', 32)->unique();
            $table->date('cycle_start');
            $table->date('cycle_end');
            $table->decimal('gross_subscription_revenue', 14, 2)->default(0);
            $table->decimal('admin_commission_pct', 6, 2);
            $table->decimal('admin_earnings', 14, 2)->default(0);
            $table->decimal('author_pool', 14, 2)->default(0);
            $table->decimal('total_engagement_weight', 18, 4)->default(0);
            $table->string('status', 16)->default('open'); // open | finalized | locked
            $table->timestamp('finalized_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('revenue_cycle_engagements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('revenue_cycle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('completion_percentage', 6, 2);
            $table->unsignedBigInteger('reading_time_seconds')->default(0);
            $table->timestamps();

            $table->index(['revenue_cycle_id', 'author_id']);
            $table->unique(['revenue_cycle_id', 'user_id', 'book_id']);
        });

        Schema::create('author_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('revenue_cycle_id')->constrained()->cascadeOnDelete();
            $table->decimal('engagement_weight', 18, 4);
            $table->decimal('share_percentage', 10, 6);
            $table->decimal('gross_earnings', 14, 2);
            $table->string('status', 16)->default('pending'); // pending | paid | hold
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['author_id', 'revenue_cycle_id']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 128);
            $table->string('entity_type', 128)->nullable();
            $table->string('entity_id', 64)->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('author_payouts');
        Schema::dropIfExists('revenue_cycle_engagements');
        Schema::dropIfExists('revenue_cycles');
        Schema::dropIfExists('user_book_engagements');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('subscription_orders');
        Schema::dropIfExists('subscription_plans');
    }
};

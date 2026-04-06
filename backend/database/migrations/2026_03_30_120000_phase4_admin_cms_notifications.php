<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->timestamp('blocked_at')->nullable();
        });

        Schema::create('homepage_sections', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('section_type', 64); // hero_carousel, book_list, category_strip, flash_sale, subscription_cta, custom_html
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('homepage_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('homepage_section_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('item_type', 32); // banner, book, category_link, html_block
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('image_url', 2048)->nullable();
            $table->string('cta_label')->nullable();
            $table->string('link_type', 32)->nullable(); // book, category, external, subscription, store
            $table->string('link_value', 512)->nullable();
            $table->foreignId('book_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('cms_pages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('content');
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });

        Schema::create('platform_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('subject_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 128);
            $table->string('entity_type', 128)->nullable();
            $table->string('entity_id', 64)->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at']);
            $table->index('created_at');
        });

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64)->default('info');
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });

        Schema::create('fcm_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token', 512);
            $table->string('platform', 32)->default('web');
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'token']);
        });

        Schema::create('notification_broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            $table->string('audience', 32)->default('all'); // all, subscribers
            $table->unsignedInteger('recipient_count')->default(0);
            $table->string('status', 32)->default('queued'); // queued, processing, done, failed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_broadcasts');
        Schema::dropIfExists('fcm_devices');
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('platform_activities');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('homepage_items');
        Schema::dropIfExists('homepage_sections');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['last_login_at', 'last_login_ip', 'blocked_at']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category', 120)->nullable();
            $table->json('tags')->nullable();
            $table->string('cover_url', 2048)->nullable();
            /** S3 object keys (private bucket); URLs issued via signed URLs */
            $table->string('file_key', 512)->nullable();
            $table->string('audio_key', 512)->nullable();
            $table->string('access_type', 32); // FREE, PAID, SUBSCRIPTION
            $table->string('format', 32)->default('ebook'); // ebook, audiobook, magazine
            $table->decimal('price', 10, 2)->nullable();
            $table->string('currency', 8)->default('USD');
            $table->string('approval_status', 32)->default('pending'); // pending, approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_trending')->default(false);
            $table->boolean('is_new')->default(false);
            $table->decimal('rating_avg', 3, 2)->nullable();
            $table->unsignedInteger('review_count')->default(0);
            $table->timestamps();

            $table->index(['approval_status', 'access_type']);
            $table->index(['category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};

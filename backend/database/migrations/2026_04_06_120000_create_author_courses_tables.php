<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('author_courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('thumbnail_url', 2048)->nullable();
            $table->boolean('published')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'published']);
        });

        Schema::create('author_course_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_course_id')->constrained('author_courses')->cascadeOnDelete();
            $table->string('title');
            $table->string('video_url', 2048);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['author_course_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('author_course_lessons');
        Schema::dropIfExists('author_courses');
    }
};

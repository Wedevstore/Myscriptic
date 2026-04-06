<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('email', 255);
            $table->string('topic', 120);
            $table->text('message');
            /** Optional: numeric user id or mock id (e.g. auth_001) from the SPA */
            $table->string('author_ref', 64)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_submissions');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('author_courses', function (Blueprint $table) {
            $table->string('access_type', 32)->default('SUBSCRIPTION')->after('published');
            $table->decimal('price', 10, 2)->nullable()->after('access_type');
            $table->string('currency', 8)->default('USD')->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('author_courses', function (Blueprint $table) {
            $table->dropColumn(['access_type', 'price', 'currency']);
        });
    }
};

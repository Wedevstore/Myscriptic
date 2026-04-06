<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->index(['access_type', 'category'], 'books_access_type_category_index');
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE books ADD FULLTEXT books_fulltext_idx (title, description)');
            } catch (\Throwable) {
                // ignore if engine does not support FULLTEXT
            }
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE books DROP INDEX books_fulltext_idx');
            } catch (\Throwable) {
                //
            }
        }

        Schema::table('books', function (Blueprint $table) {
            $table->dropIndex('books_access_type_category_index');
        });
    }
};

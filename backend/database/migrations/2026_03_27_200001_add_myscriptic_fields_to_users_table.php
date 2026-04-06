<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 32)->default('user')->after('password');
            $table->string('avatar')->nullable()->after('role');
            $table->string('subscription_plan')->nullable()->after('avatar');
            $table->timestamp('subscription_expires_at')->nullable()->after('subscription_plan');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'avatar',
                'subscription_plan',
                'subscription_expires_at',
            ]);
        });
    }
};

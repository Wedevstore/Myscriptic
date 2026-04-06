<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'role',
    'avatar',
    'subscription_plan',
    'subscription_expires_at',
    'last_login_at',
    'last_login_ip',
    'blocked_at',
    'is_demo',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'subscription_expires_at' => 'datetime',
            'last_login_at' => 'datetime',
            'blocked_at' => 'datetime',
            'is_demo' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function bookEngagements(): HasMany
    {
        return $this->hasMany(UserBookEngagement::class);
    }

    public function authoredBooks(): HasMany
    {
        return $this->hasMany(Book::class, 'author_id');
    }

    /** Users following this author (this user is the author). */
    public function receivedAuthorFollows(): HasMany
    {
        return $this->hasMany(AuthorFollow::class, 'author_id');
    }

    /** Follow rows where this user is the follower. */
    public function givenAuthorFollows(): HasMany
    {
        return $this->hasMany(AuthorFollow::class, 'follower_id');
    }

    public function userNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    public function fcmDevices(): HasMany
    {
        return $this->hasMany(FcmDevice::class);
    }

    public function wishlistItems(): HasMany
    {
        return $this->hasMany(WishlistItem::class);
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('ends_at', '>=', now())
            ->with('plan')
            ->orderByDesc('ends_at')
            ->first();
    }
}

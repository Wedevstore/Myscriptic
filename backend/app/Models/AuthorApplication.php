<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthorApplication extends Model
{
    protected $fillable = [
        'user_id', 'bio', 'payout_method', 'payout_details', 'status', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'payout_details' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

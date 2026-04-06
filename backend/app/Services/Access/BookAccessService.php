<?php

namespace App\Services\Access;

use App\Models\Book;
use App\Models\LibraryEntry;
use App\Models\User;

class BookAccessService
{
    /**
     * Whether the user may read or download this book (server-side source of truth).
     */
    public function canAccess(User $user, Book $book): bool
    {
        if ($book->approval_status !== 'approved') {
            return false;
        }

        return match ($book->access_type) {
            'FREE' => true,
            'PAID' => LibraryEntry::query()
                ->where('user_id', $user->id)
                ->where('book_id', $book->id)
                ->exists(),
            'SUBSCRIPTION' => $user->activeSubscription() !== null,
            default => false,
        };
    }

    public function accessSource(User $user, Book $book): ?string
    {
        if ($book->approval_status !== 'approved') {
            return null;
        }

        if ($book->access_type === 'FREE') {
            return 'free';
        }

        if ($book->access_type === 'PAID') {
            $entry = LibraryEntry::query()
                ->where('user_id', $user->id)
                ->where('book_id', $book->id)
                ->first();

            return $entry ? 'purchase' : null;
        }

        if ($book->access_type === 'SUBSCRIPTION') {
            return $user->activeSubscription() ? 'subscription' : null;
        }

        return null;
    }

    public function hasLibraryEntry(User $user, int $bookId): bool
    {
        return LibraryEntry::query()
            ->where('user_id', $user->id)
            ->where('book_id', $bookId)
            ->exists();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthorCourseLesson extends Model
{
    protected $fillable = [
        'author_course_id',
        'title',
        'video_url',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(AuthorCourse::class, 'author_course_id');
    }
}

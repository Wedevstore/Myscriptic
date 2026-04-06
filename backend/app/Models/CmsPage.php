<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsPage extends Model
{
    protected $fillable = ['title', 'slug', 'content', 'is_published'];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }
}

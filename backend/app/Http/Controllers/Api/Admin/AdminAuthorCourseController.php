<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthorCourse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuthorCourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per = min(100, max(1, $request->integer('per_page', 30)));
        $page = max(1, $request->integer('page', 1));

        $q = AuthorCourse::query()
            ->with(['author:id,name,email'])
            ->orderByDesc('updated_at');

        if ($request->filled('published')) {
            $q->where('published', $request->boolean('published'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $q->where(function ($qq) use ($term) {
                $qq->where('title', 'like', $term)
                    ->orWhere('slug', 'like', $term);
            });
        }

        $paginator = $q->paginate($per, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (AuthorCourse $c) => [
                'id' => (string) $c->id,
                'slug' => $c->slug,
                'title' => $c->title,
                'published' => (bool) $c->published,
                'access_type' => $c->access_type ?? 'SUBSCRIPTION',
                'price' => $c->price !== null ? round((float) $c->price, 2) : null,
                'currency' => $c->currency ?? 'USD',
                'author' => [
                    'id' => (string) $c->user_id,
                    'name' => $c->author?->name,
                    'email' => $c->author?->email,
                ],
                'lessons_count' => $c->lessons()->count(),
                'updated_at' => $c->updated_at?->toIso8601String(),
            ])->values()->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}

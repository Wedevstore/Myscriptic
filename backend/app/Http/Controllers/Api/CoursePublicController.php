<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorCourse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CoursePublicController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rawQ = trim((string) $request->query('q', ''));
        $q = $rawQ === '' ? '' : Str::limit($rawQ, 120, '');

        $courses = AuthorCourse::query()
            ->where('published', true)
            ->with('author:id,name')
            ->withCount('lessons')
            ->when($q !== '', function ($query) use ($q) {
                $term = '%'.$q.'%';
                $query->where(function ($w) use ($term) {
                    $w->where('title', 'like', $term)
                        ->orWhere('slug', 'like', $term)
                        ->orWhere('description', 'like', $term);
                });
            })
            ->orderByDesc('updated_at')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $courses->map(fn (AuthorCourse $c) => $this->cardPayload($c))->values()->all(),
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $course = AuthorCourse::query()
            ->where('slug', $slug)
            ->with(['author:id,name', 'lessons'])
            ->firstOrFail();

        $user = $request->user();
        $preview = $request->boolean('preview');
        $isOwner = $user && (int) $course->user_id === (int) $user->id;

        if (! $course->published && ! ($preview && $isOwner)) {
            abort(404);
        }

        return response()->json([
            'data' => $this->detailPayload($course, $isOwner),
        ]);
    }

    /** Summary rows for author public profile. */
    public static function coursesForAuthor(User $author): array
    {
        return $author->authorCourses()
            ->where('published', true)
            ->withCount('lessons')
            ->orderByDesc('updated_at')
            ->limit(24)
            ->get()
            ->map(fn (AuthorCourse $c) => [
                'slug' => $c->slug,
                'title' => $c->title,
                'lesson_count' => (int) $c->lessons_count,
                'thumbnail_url' => $c->thumbnail_url,
                'access_type' => $c->access_type ?? 'SUBSCRIPTION',
                'price' => $c->price !== null ? round((float) $c->price, 2) : null,
                'currency' => $c->currency ?? 'USD',
            ])
            ->values()
            ->all();
    }

    private function cardPayload(AuthorCourse $c): array
    {
        $c->loadMissing('author:id,name');
        $n = (int) ($c->lessons_count ?? 0);

        return [
            'id' => (string) $c->id,
            'author_id' => (string) $c->user_id,
            'author_name' => $c->author?->name ?? '',
            'title' => $c->title,
            'slug' => $c->slug,
            'description' => $c->description ?? '',
            'thumbnail_url' => $c->thumbnail_url,
            'published' => (bool) $c->published,
            'access_type' => $c->access_type ?? 'SUBSCRIPTION',
            'price' => $c->price !== null ? round((float) $c->price, 2) : null,
            'currency' => $c->currency ?? 'USD',
            'lesson_count' => $n,
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }

    private function detailPayload(AuthorCourse $c, bool $isOwner): array
    {
        $c->loadMissing(['author:id,name', 'lessons']);

        $access = $c->access_type ?? 'SUBSCRIPTION';
        $redactLessonVideos = $access === 'PAID' && ! $isOwner;

        return [
            'id' => (string) $c->id,
            'author_id' => (string) $c->user_id,
            'author_name' => $c->author?->name ?? '',
            'title' => $c->title,
            'slug' => $c->slug,
            'description' => $c->description ?? '',
            'thumbnail_url' => $c->thumbnail_url,
            'published' => (bool) $c->published,
            'access_type' => $access,
            'price' => $c->price !== null ? round((float) $c->price, 2) : null,
            'currency' => $c->currency ?? 'USD',
            'lessons' => $c->lessons->map(fn ($l) => [
                'id' => (string) $l->id,
                'title' => $l->title,
                'video_url' => $redactLessonVideos ? '' : (string) ($l->video_url ?? ''),
                'sort_order' => (int) $l->sort_order,
            ])->values()->all(),
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorCourse;
use App\Support\VideoLessonUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
class AuthorCourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['author', 'admin'], true)) {
            abort(403, 'Only authors can manage courses.');
        }

        $courses = AuthorCourse::query()
            ->where('user_id', $user->id)
            ->with('lessons')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'data' => $courses->map(fn (AuthorCourse $c) => $this->detailPayload($c))->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['author', 'admin'], true)) {
            abort(403, 'Only authors can create courses.');
        }

        $validated = $this->validatePayload($request);
        $access = $this->resolveAccessType($validated, null);
        $this->assertPaidPrice($access, $validated, null);

        $slugBase = $validated['slug'] ?? $validated['title'];
        $slug = $this->uniqueSlug($slugBase, null);

        $course = DB::transaction(function () use ($user, $validated, $slug, $access) {
            $course = AuthorCourse::query()->create([
                'user_id' => $user->id,
                'title' => $validated['title'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'thumbnail_url' => $validated['thumbnail_url'] ?? null,
                'published' => (bool) ($validated['published'] ?? false),
                'access_type' => $access,
                'price' => $access === 'PAID' ? $validated['price'] : null,
                'currency' => $access === 'PAID' ? ($validated['currency'] ?? 'USD') : 'USD',
            ]);

            foreach ($validated['lessons'] as $i => $row) {
                $course->lessons()->create([
                    'title' => $row['title'],
                    'video_url' => $row['video_url'],
                    'sort_order' => $i,
                ]);
            }

            return $course;
        });

        $course->load('lessons');

        return response()->json(['data' => $this->detailPayload($course)], 201);
    }

    public function update(Request $request, AuthorCourse $authorCourse): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['author', 'admin'], true)) {
            abort(403);
        }
        if ((int) $authorCourse->user_id !== (int) $user->id) {
            abort(403);
        }

        $validated = $this->validatePayload($request, isUpdate: true);
        $access = $this->resolveAccessType($validated, $authorCourse);
        $this->assertPaidPrice($access, $validated, $authorCourse);

        DB::transaction(function () use ($authorCourse, $validated, $access) {
            $slug = $authorCourse->slug;
            if (! empty($validated['slug'])) {
                $slug = $this->uniqueSlug($validated['slug'], $authorCourse->id);
            } elseif (array_key_exists('title', $validated)) {
                $slug = $this->uniqueSlug($validated['title'], $authorCourse->id);
            }

            $authorCourse->update([
                'title' => $validated['title'] ?? $authorCourse->title,
                'slug' => $slug,
                'description' => array_key_exists('description', $validated)
                    ? $validated['description']
                    : $authorCourse->description,
                'thumbnail_url' => array_key_exists('thumbnail_url', $validated)
                    ? $validated['thumbnail_url']
                    : $authorCourse->thumbnail_url,
                'published' => array_key_exists('published', $validated)
                    ? (bool) $validated['published']
                    : $authorCourse->published,
                'access_type' => $access,
                'price' => $access === 'PAID' ? ($validated['price'] ?? $authorCourse->price) : null,
                'currency' => $access === 'PAID'
                    ? ($validated['currency'] ?? $authorCourse->currency ?? 'USD')
                    : 'USD',
            ]);

            if (isset($validated['lessons'])) {
                $authorCourse->lessons()->delete();
                foreach ($validated['lessons'] as $i => $row) {
                    $authorCourse->lessons()->create([
                        'title' => $row['title'],
                        'video_url' => $row['video_url'],
                        'sort_order' => $i,
                    ]);
                }
            }
        });

        $authorCourse->refresh()->load('lessons');

        return response()->json(['data' => $this->detailPayload($authorCourse)]);
    }

    public function destroy(Request $request, AuthorCourse $authorCourse): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['author', 'admin'], true)) {
            abort(403);
        }
        if ((int) $authorCourse->user_id !== (int) $user->id) {
            abort(403);
        }
        $authorCourse->delete();

        return response()->json(null, 204);
    }

    private function validatePayload(Request $request, bool $isUpdate = false): array
    {
        $lessonRules = [
            'lessons' => [$isUpdate ? 'sometimes' : 'required', 'array', 'min:1'],
            'lessons.*.title' => ['required_with:lessons', 'string', 'max:255'],
            'lessons.*.video_url' => ['required_with:lessons', 'string', 'max:2048'],
        ];

        $base = $request->validate(array_merge([
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'thumbnail_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'published' => ['sometimes', 'boolean'],
            'access_type' => ['sometimes', 'string', Rule::in(['FREE', 'PAID', 'SUBSCRIPTION'])],
            'price' => ['sometimes', 'nullable', 'numeric', 'min:0.99'],
            'currency' => ['sometimes', 'nullable', 'string', 'max:8'],
        ], $lessonRules));

        if (isset($base['lessons'])) {
            foreach ($base['lessons'] as $i => $row) {
                if (! VideoLessonUrl::isValid($row['video_url'] ?? '')) {
                    abort(response()->json([
                        'message' => 'Lesson '.($i + 1).' must use a YouTube or Vimeo video URL.',
                    ], 422));
                }
            }
        }

        return $base;
    }

    /** @param  array<string, mixed>  $validated */
    private function resolveAccessType(array $validated, ?AuthorCourse $existing): string
    {
        $raw = $validated['access_type'] ?? $existing?->access_type ?? 'SUBSCRIPTION';

        return in_array($raw, ['FREE', 'PAID', 'SUBSCRIPTION'], true) ? $raw : 'SUBSCRIPTION';
    }

    /**
     * @param  array<string, mixed>  $validated
     *
     * @throws ValidationException
     */
    private function assertPaidPrice(string $access, array $validated, ?AuthorCourse $existing): void
    {
        if ($access !== 'PAID') {
            return;
        }
        $price = $validated['price'] ?? $existing?->price;
        if ($price === null || (float) $price < 0.99) {
            throw ValidationException::withMessages([
                'price' => ['Set a valid price (minimum 0.99) for one-time purchase courses.'],
            ]);
        }
    }

    private function uniqueSlug(string $base, ?int $exceptId): string
    {
        $slug = Str::slug($base) ?: 'course';
        $exists = fn (string $s) => AuthorCourse::query()
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->where('slug', $s)
            ->exists();
        if (! $exists($slug)) {
            return $slug;
        }
        $n = 2;
        while ($exists($slug.'-'.$n)) {
            $n++;
        }

        return $slug.'-'.$n;
    }

    private function detailPayload(AuthorCourse $c): array
    {
        $c->loadMissing(['author:id,name', 'lessons']);

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
            'lessons' => $c->lessons->map(fn ($l) => [
                'id' => (string) $l->id,
                'title' => $l->title,
                'video_url' => $l->video_url,
                'sort_order' => (int) $l->sort_order,
            ])->values()->all(),
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }
}

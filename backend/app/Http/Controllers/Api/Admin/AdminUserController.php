<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Platform\PlatformActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = User::query()->orderByDesc('id');

        if ($request->filled('search')) {
            $s = '%'.$request->string('search').'%';
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', $s)->orWhere('email', 'like', $s);
            });
        }
        if ($request->boolean('blocked_only')) {
            $q->whereNotNull('blocked_at');
        }

        $p = $q->paginate($request->integer('per_page', 30));

        return response()->json([
            'data' => collect($p->items())->map(fn (User $u) => $this->listPayload($u)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'total' => $p->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $subs = Subscription::query()
            ->where('user_id', $user->id)
            ->with('plan:id,name,slug')
            ->orderByDesc('ends_at')
            ->limit(10)
            ->get();

        $orders = Order::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(15)
            ->get(['id', 'order_number', 'total_amount', 'currency', 'status', 'paid_at', 'created_at']);

        return response()->json([
            'data' => [
                'user' => $this->listPayload($user),
                'subscriptions' => $subs->map(fn ($s) => [
                    'id' => (string) $s->id,
                    'status' => $s->status,
                    'plan' => $s->plan?->name,
                    'starts_at' => $s->starts_at->toIso8601String(),
                    'ends_at' => $s->ends_at->toIso8601String(),
                ]),
                'orders' => $orders->map(fn ($o) => [
                    'id' => (string) $o->id,
                    'order_number' => $o->order_number,
                    'total_amount' => (float) $o->total_amount,
                    'currency' => $o->currency,
                    'status' => $o->status,
                    'paid_at' => $o->paid_at?->toIso8601String(),
                    'created_at' => $o->created_at->toIso8601String(),
                ]),
            ],
        ]);
    }

    public function updateBlock(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'blocked' => ['required', 'boolean'],
        ]);

        if ($user->role === 'admin') {
            abort(422, 'Cannot block an admin account.');
        }

        $user->update([
            'blocked_at' => $data['blocked'] ? now() : null,
        ]);

        PlatformActivityLogger::fromRequest(
            $request,
            $data['blocked'] ? 'user.blocked' : 'user.unblocked',
            User::class,
            (string) $user->id,
            ['email' => $user->email],
            $user,
        );

        return response()->json(['data' => $this->listPayload($user->fresh())]);
    }

    /**
     * @return array<string, mixed>
     */
    private function listPayload(User $u): array
    {
        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'blocked_at' => $u->blocked_at?->toIso8601String(),
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'last_login_ip' => $u->last_login_ip,
            'created_at' => $u->created_at->toIso8601String(),
        ];
    }
}

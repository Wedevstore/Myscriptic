<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('api.auth.logout')) {
            return $next($request);
        }

        $user = $request->user();
        if ($user && $user->blocked_at !== null) {
            return response()->json(['message' => 'Account suspended.'], 403);
        }

        return $next($request);
    }
}

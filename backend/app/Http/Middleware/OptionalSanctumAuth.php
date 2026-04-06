<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * When a Bearer token is present, attach the tokenable user to the sanctum guard
 * without requiring authentication (for optional preview flows).
 */
class OptionalSanctumAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if ($token && ! $request->user()) {
            $pat = PersonalAccessToken::findToken($token);
            if ($pat && $pat->tokenable) {
                $request->setUserResolver(fn () => $pat->tokenable);
            }
        }

        return $next($request);
    }
}

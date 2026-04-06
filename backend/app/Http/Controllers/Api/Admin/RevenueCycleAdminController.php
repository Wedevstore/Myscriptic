<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\RevenueCycle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RevenueCycleAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = RevenueCycle::query()->orderByDesc('cycle_start')->limit(60)->get();

        return response()->json(['data' => $rows]);
    }

    public function show(RevenueCycle $revenueCycle): JsonResponse
    {
        $revenueCycle->loadCount(['snapshots', 'payouts']);

        return response()->json(['data' => $revenueCycle]);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = AuditLog::query()->with('actor:id,name')->orderByDesc('id');

        if ($request->filled('action')) {
            $q->where('action', 'like', '%'.$request->string('action').'%');
        }

        $rows = $q->limit(200)->get();

        return response()->json(['data' => $rows]);
    }
}

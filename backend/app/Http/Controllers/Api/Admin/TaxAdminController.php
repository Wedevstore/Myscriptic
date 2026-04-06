<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TaxConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => TaxConfig::query()->orderBy('id')->get()]);
    }

    public function update(Request $request, TaxConfig $tax): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'rate' => ['sometimes', 'numeric', 'min:0', 'max:1'],
            'is_enabled' => ['sometimes', 'boolean'],
            'country_code' => ['nullable', 'string', 'max:8'],
        ]);

        $tax->update($data);

        return response()->json(['data' => $tax->fresh()]);
    }
}

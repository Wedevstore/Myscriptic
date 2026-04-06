<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthorPayout;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuthorPayoutAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = AuthorPayout::query()->with(['author:id,name,email', 'revenueCycle']);

        if ($request->filled('cycle_id')) {
            $q->where('revenue_cycle_id', $request->integer('cycle_id'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        $rows = $q->orderByDesc('id')->limit(500)->get();

        return response()->json(['data' => $rows]);
    }

    public function approve(Request $request, AuthorPayout $authorPayout): JsonResponse
    {
        $authorPayout->load('revenueCycle');
        if (! in_array($authorPayout->revenueCycle->status, ['finalized', 'locked'], true)) {
            return response()->json(['message' => 'Cycle must be finalized first.'], 422);
        }

        $authorPayout->update(['status' => 'paid']);
        AuditLog::record($request->user()->id, 'payout.approved', AuthorPayout::class, (string) $authorPayout->id, []);

        return response()->json(['success' => true]);
    }

    public function hold(Request $request, AuthorPayout $authorPayout): JsonResponse
    {
        $authorPayout->update(['status' => 'hold']);
        AuditLog::record($request->user()->id, 'payout.hold', AuthorPayout::class, (string) $authorPayout->id, []);

        return response()->json(['success' => true]);
    }

    public function export(Request $request): StreamedResponse
    {
        $q = AuthorPayout::query()->with(['author:id,name,email', 'revenueCycle']);
        if ($request->filled('cycle_id')) {
            $q->where('revenue_cycle_id', $request->integer('cycle_id'));
        }
        $rows = $q->orderBy('author_id')->get();

        $filename = 'author-payouts-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['author_id', 'author_name', 'email', 'cycle', 'engagement_weight', 'share_pct', 'gross_earnings', 'status']);
            foreach ($rows as $r) {
                fputcsv($out, [
                    $r->author_id,
                    $r->author?->name,
                    $r->author?->email,
                    $r->revenueCycle?->period_label,
                    $r->engagement_weight,
                    $r->share_percentage,
                    $r->gross_earnings,
                    $r->status,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}

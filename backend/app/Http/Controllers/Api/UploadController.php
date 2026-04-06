<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Phase 1: returns a placeholder response. Wire AWS SDK presigned PUT in Phase 1.5+.
 */
class UploadController extends Controller
{
    public function signedUrl(Request $request): JsonResponse
    {
        $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'mime_type' => ['required', 'string', 'max:128'],
        ]);

        $key = 'uploads/'.now()->format('Y/m').'/'.Str::uuid().'_'.$request->string('filename');

        if (config('filesystems.disks.s3.key')) {
            // Future: return Storage::disk('s3')->temporaryUploadUrl($key, now()->addMinutes(15));
        }

        return response()->json([
            'url' => 'https://example.invalid/placeholder-upload',
            'key' => $key,
            'note' => 'Configure AWS_* in .env and replace with S3 presigned URL.',
        ]);
    }
}

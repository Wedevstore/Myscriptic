#!/usr/bin/env node
/**
 * Check that a presigned S3 GET URL returns CORS headers for app origins.
 * Copy the URL from DevTools (Network → the S3/CloudFront request) or log it temporarily.
 *
 * Usage:
 *   npm run check:s3-cors -- 'https://....amazonaws.com/...?X-Amz-...'
 *   S3_SIGNED_URL='https://...' npm run check:s3-cors
 *
 * Optional: ORIGINS='http://localhost:3000,https://www.myscriptic.com' (comma-separated)
 */

const url = process.argv[2]?.trim() || process.env.S3_SIGNED_URL?.trim()
const origins = (process.env.ORIGINS ||
  "http://localhost:3000,https://www.myscriptic.com,https://myscriptic.com,https://myscriptic.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

if (!url?.startsWith("http")) {
  console.error("Missing URL. Examples:")
  console.error('  npm run check:s3-cors -- "https://bucket.s3.region.amazonaws.com/key?X-Amz-..."')
  console.error("  S3_SIGNED_URL='https://...' npm run check:s3-cors")
  process.exit(1)
}

function corsOk(acao, origin) {
  if (!acao) return false
  if (acao === "*") return true
  return acao === origin
}

async function probe(origin) {
  const headers = { Origin: origin, Range: "bytes=0-0" }
  let res = await fetch(url, { method: "GET", headers, redirect: "follow" })
  if (res.status === 403 || res.status === 400) {
    res = await fetch(url, { method: "GET", headers: { Origin: origin }, redirect: "follow" })
  }
  const acao = res.headers.get("access-control-allow-origin")
  const aceh = res.headers.get("access-control-expose-headers")
  const acrm = res.headers.get("access-control-allow-methods")
  return { origin, status: res.status, acao, aceh, acrm }
}

let exit = 0
for (const origin of origins) {
  try {
    const r = await probe(origin)
    const ok = r.status >= 200 && r.status < 300 && corsOk(r.acao, r.origin)
    console.log(`\nOrigin: ${r.origin}`)
    console.log(`  HTTP ${r.status}`)
    console.log(`  access-control-allow-origin: ${r.acao ?? "(missing — browser blocks cross-origin read)"}`)
    if (r.acrm) console.log(`  access-control-allow-methods: ${r.acrm}`)
    if (r.aceh) console.log(`  access-control-expose-headers: ${r.aceh}`)
    if (!ok) {
      if (!corsOk(r.acao, r.origin)) {
        console.log("  Result: FAIL (ACAO must match this origin or be *)")
        exit = 1
      } else if (r.status < 200 || r.status >= 300) {
        console.log("  Result: FAIL (unexpected status — URL may be expired or invalid)")
        exit = 1
      }
    } else {
      console.log("  Result: OK for browser fetch() with this Origin")
    }
  } catch (e) {
    console.error(`\nOrigin ${origin}: ${e instanceof Error ? e.message : e}`)
    exit = 1
  }
}

process.exit(exit)

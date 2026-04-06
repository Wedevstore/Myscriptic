# MyScriptic — production deployment (Phase 5)

This guide covers deploying the **Laravel API** and **Next.js** frontend for real traffic: performance, Redis, queues, email, Sentry, CDN, backups, and ads.

## Architecture

- **API**: Laravel 11+ on Ubuntu, PHP-FPM, Nginx, Redis (cache + optional queue), MySQL or Postgres.
- **Frontend**: Next.js on [Vercel](https://vercel.com) or the same VPS behind Nginx.
- **Assets**: S3 (or compatible) with **CloudFront** (or another CDN) in front; set `ASSET_CDN_URL` so API responses rewrite public image URLs.

## Environment variables

### Backend (Laravel on the API server)

The Laravel app is **not** in this repository; it lives on the VPS (e.g. CyberPanel site root for **`api.myscriptic.com`**). Edit **`.env`** there and set at minimum:

| Area | Variables |
|------|-----------|
| Core | `APP_KEY`, `APP_URL`, `APP_ENV=production`, `APP_DEBUG=false` |
| DB | `DB_*` (use managed MySQL/Postgres in production) |
| CORS | `CORS_ALLOWED_ORIGINS` — comma-separated origins (no spaces); include **apex, `www`, production Vercel host, and `http://localhost:3000`** as needed. Some reverse-proxy stacks require `CORS_ALLOWED_ORIGINS=*` with Bearer-only APIs; prefer explicit origins when your proxy passes them through. |
| CORS previews | `CORS_USE_VERCEL_PREVIEW_ORIGINS=true` (default) allows `https://*.vercel.app` via `config/cors.php` patterns; set `false` to rely only on `CORS_ALLOWED_ORIGINS`. |
| Frontend | `FRONTEND_URL` — must match the live site (**`https://www.myscriptic.com`** when that is canonical) and **Vercel `NEXT_PUBLIC_SITE_URL`**; use **`https://myscriptic.vercel.app`** for preview-only checkout. Mismatch causes wrong redirects after payment. |
| Cache | `CACHE_STORE=redis`, `REDIS_*` |
| Queue | `QUEUE_CONNECTION=redis` (or `database` with a worker) |
| Mail | `MAIL_MAILER`, `MAIL_HOST`, `MAIL_*`, `MAIL_FROM_*` (Mailgun, SES, Postmark, etc.) |
| S3 | `AWS_*`, `FILESYSTEM_DISK=s3` as needed |
| CDN | `ASSET_CDN_URL`, optional `ASSET_CDN_SOURCE_HOSTS` |
| Ads | `ADS_*` or use **Admin → Settings → Ads & feature flags** (`platform_settings`) |
| Logging | `LOG_STACK=single,structured` for JSON lines + Sentry |
| Sentry | `SENTRY_LARAVEL_DSN`, optional `SENTRY_TRACES_SAMPLE_RATE` |

Run `php artisan config:cache` and `php artisan route:cache` after changes.

### Frontend (Vercel / hosting)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Laravel API **origin** only (no path), e.g. `https://api.example.com`. The Next.js client calls `${origin}/api/...`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO (`metadataBase`, sitemap, robots) |

## Laravel on Ubuntu (VPS)

1. Install PHP 8.2+ (or **8.4** if required by your Laravel version), extensions (`curl`, `mbstring`, `xml`, `redis`, `pdo_mysql` or `pdo_pgsql`), Composer, Nginx/OpenLiteSpeed, Redis, Node (if building assets on server).
2. Deploy Laravel files to the server (rsync, CyberPanel site setup, or a private API repo) — **not** from this frontend-only GitHub repo.
3. From the Laravel app directory: `composer install --no-dev --optimize-autoloader`.
4. Point the web root to Laravel’s **`public/`** directory (Nginx `root` / `try_files` to `index.php`).
5. **PHP-FPM**: pool user should own `storage/` and `bootstrap/cache`.
6. **Scheduler**: add cron: `* * * * * cd /path/to/laravel && php artisan schedule:run >> /dev/null 2>&1`
7. **Queues**: run `php artisan queue:work redis --sleep=3 --tries=3` under **Supervisor** (or systemd). Required for queued notifications (welcome, purchase, subscription).
8. **Opcache** enabled in production `php.ini`.

### Example Nginx snippet

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;
    root /var/www/myscriptic/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Next.js

- **Vercel**: connect the repo root, set env vars, build command `npm run build`, output `.next`.
- **VPS**: `npm ci && npm run build && npm run start` (or PM2). Put Nginx in front with SSL; proxy to port 3000.

## Redis

- Use Redis for `CACHE_STORE` and ideally `QUEUE_CONNECTION` so list/search/homepage caches and jobs scale.
- Local/dev can keep `CACHE_STORE=database`; production should use Redis.

## Email

- Configure a real mailer; password reset and transactional notifications use Laravel notifications (queued).
- Ensure `FRONTEND_URL` matches the Next app so reset links open `/auth/reset-password?token=…&email=…`.

## Sentry

- Backend: set `SENTRY_LARAVEL_DSN` after `php artisan vendor:publish --tag=sentry-config`.
- Frontend (optional): add `@sentry/nextjs` and follow their Next.js wizard; set `NEXT_PUBLIC_SENTRY_DSN`.

## CDN and signed URLs

- Point CloudFront (or similar) at the S3 bucket; set `ASSET_CDN_URL` to the distribution origin URL so **covers and CMS images** are rewritten in API JSON.
- **Paid / library files** must stay private on S3; the app already issues **short-lived signed URLs** via library endpoints — do not make those buckets public.

## Backups

- **Database**: use managed backups or run `php artisan myscriptic:backup-database` (scheduled daily in `routes/console.php` for SQLite; for MySQL use `mysqldump` in production — see command output).
- **S3**: enable versioning and lifecycle rules; replicate critical buckets if needed.

## Ads

- Configure AdSense (or compatible) client ID and slots in **Admin → Settings → Ads & feature flags**, or via env defaults read in `SiteConfigController`.
- The storefront loads placements from `GET /api/site-config` (`AdBanner`, `AdInFeed`).

## Demo seed data (development)

- Run `php artisan migrate --seed` to load **core** accounts (`admin@myscriptic.com` / `admin123`, `author@myscriptic.com` / `author123`, `reader@myscriptic.com` / `reader123`), **36 core catalog books** plus **~28 demo-author titles** (picsum.photos covers), CMS homepage, coupons, tax rows, and **removable demo users** from `DemoDataSeeder`.
- **Demo-only logins** (password `demo12345`): `demo.author@demo.myscriptic.test`, `demo.reader@demo.myscriptic.test`, `demo.applicant@demo.myscriptic.test`. These users are flagged `is_demo` on the `users` table.
- **Clear demo users only** (keeps admin / Jane / John): `php artisan myscriptic:clear-demo` (use `--force` in CI).
- **Wipe everything** and reseed: `php artisan migrate:fresh --seed`.
- Frontend offline mocks use `lib/demo-images.ts` and `lib/mock-data.ts` with the same cover seeds where possible.

## Security checklist

- TLS everywhere; HSTS on Nginx.
- Rate limits: `auth`, `payments`, `webhooks`, `search` are registered in `AppServiceProvider`.
- Never commit real `.env` files; rotate API and payment keys on deploy.

## Post-deploy smoke test

1. `GET /api/site-config` returns JSON.
2. Register user → welcome email queued/sent (if mail + worker OK).
3. `GET /api/books/search?q=test` returns 200.
4. Open a book URL; view source or devtools for `title` / OG tags.
5. `https://your-site/sitemap.xml` and `/robots.txt`.

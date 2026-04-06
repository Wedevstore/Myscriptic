# Connect Next.js (Vercel) to Laravel (`api.myscriptic.com`) on CyberPanel

This repo’s SPA sets **`NEXT_PUBLIC_API_URL`** to the API **origin only** (e.g. `https://api.myscriptic.com`, no path). `lib/api.ts` calls **`${origin}/api/...`** so routes match Laravel’s `routes/api.php`. Values that already end with **`/api`** still work. **`Authorization: Bearer …`** is sent on requests. Feature flags live in **`lib/auth-mode.ts`**.

## 1. Laravel on CyberPanel (PostgreSQL)

### Local PostgreSQL (optional, matches production DB name)

From the **`backend/`** folder:

```bash
docker compose -f docker-compose.postgres.yml up -d
# or: docker-compose -f docker-compose.postgres.yml up -d
php artisan migrate
```

Default credentials match **`backend/.env.example`**: database `myscriptic`, user `myscriptic`, password `myscriptic`. Change `DB_PASSWORD` on the server to your CyberPanel-generated password.

### Database

1. In **CyberPanel**, create a **PostgreSQL** database and user (note host, port, name, user, password).
2. On the server, in Laravel’s **`.env`** (not committed):

   ```env
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=your_database
   DB_USERNAME=your_user
   DB_PASSWORD=your_password
   ```

   Use the host CyberPanel shows (sometimes `127.0.0.1`, sometimes a socket path—follow your panel’s docs).

3. From the Laravel app directory:

   ```bash
   php artisan migrate
   ```

   (Add `--seed` only if you use seeders.)

### App URL and HTTPS

```env
APP_URL=https://api.myscriptic.com
APP_ENV=production
APP_DEBUG=false
```

Ensure **HTTPS** works for `https://api.myscriptic.com` (CyberPanel / OpenLiteSpeed SSL).

### CORS (required for the browser)

Laravel reads **`CORS_ALLOWED_ORIGINS`** (comma-separated, no spaces after commas). **Apex, `www`, and each `*.vercel.app` host are different origins** — list each hostname users load the Next app from. Production-style example:

```env
CORS_ALLOWED_ORIGINS=https://myscriptic.com,https://www.myscriptic.com,https://myscriptic.vercel.app,http://localhost:3000
```

**Preview deployments:** `backend/config/cors.php` also applies a pattern for **`https://*.vercel.app`** when **`CORS_USE_VERCEL_PREVIEW_ORIGINS=true`** (default). Set **`CORS_USE_VERCEL_PREVIEW_ORIGINS=false`** if you want to allow only origins listed explicitly in `CORS_ALLOWED_ORIGINS`.

After changing `.env`, refresh config cache (e.g. as your deploy user):

```bash
php artisan config:clear
php artisan config:cache
```

**Check:** preflight with `Origin: https://www.myscriptic.com` (or your preview URL) should echo **that same origin** in **`Access-Control-Allow-Origin`** — not `*`. The app config strips a lone `*` from `CORS_ALLOWED_ORIGINS` so php-cors never uses allow-all mode; remove `CORS_ALLOWED_ORIGINS=*` from server `.env` if it was set, then `config:cache` again.

**Proxy:** If OpenLiteSpeed/Nginx adds its own `Access-Control-Allow-Origin`, remove or align it so only Laravel sets CORS (duplicate or `*` headers confuse browsers).

### Frontend URL (emails, redirects, Phase 2 helpers)

**`FRONTEND_URL`** must match the URL users and payment providers actually return to:

- **Production (canonical `www`):** `https://www.myscriptic.com` — aligned with **`NEXT_PUBLIC_SITE_URL`** on Vercel Production. Keep **`https://myscriptic.com`** in **`CORS_ALLOWED_ORIGINS`** if the apex still serves traffic or redirects.
- **Vercel-only** (previews / no custom domain): **`https://myscriptic.vercel.app`** for Preview env; run `config:clear` and `config:cache` after changes.

### Sanctum / API auth

The Next client stores a token and uses **Bearer** headers. Ensure Laravel issues tokens the way `auth-provider` / login flows expect (Sanctum personal access tokens or equivalent). If you switch to **cookie + CSRF** SPA mode, you must also change the frontend `fetch` calls (e.g. `credentials: 'include'`)—the current client is built for **Bearer** JSON APIs.

---

## 2. Vercel (GitHub deploy)

Keep **`NEXT_PUBLIC_API_URL=https://api.myscriptic.com`** (API **origin** only, **no** `/api`); `laravelApiBaseUrl()` in `lib/api.ts` appends `/api` for Laravel.

In **Vercel → Project → Settings → Environment Variables**, set at least:

| Name | Example |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.myscriptic.com` (origin only; `/api` is appended in code) |
| `NEXT_PUBLIC_SITE_URL` | **Production:** `https://www.myscriptic.com` · **Preview:** `https://myscriptic.vercel.app` · **Development:** `http://localhost:3000` |
| `NEXT_PUBLIC_USE_LARAVEL_AUTH` | `true` |
| `NEXT_PUBLIC_USE_LARAVEL_PHASE2` | `true` when marketplace APIs are ready |
| `NEXT_PUBLIC_USE_LARAVEL_PHASE3` | `true` for reader / subscriptions / progress sync |
| `NEXT_PUBLIC_USE_LARAVEL_COURSES` | `true` when course APIs are ready |

`NEXT_PUBLIC_*` variables are applied at **build** time. **Redeploy Production** (or push a commit) after changing them so the client bundle picks up values like **`NEXT_PUBLIC_SITE_URL`**. New Preview deployments pick up Preview env automatically; redeploy an open preview if you need new vars immediately.

Preview hostnames: with **`CORS_USE_VERCEL_PREVIEW_ORIGINS=true`**, `https://*.vercel.app` is covered by **`backend/config/cors.php`**. Turn it off if you need a strict explicit list only.

---

## 3. Local development

1. Copy **`.env.example`** → **`.env.local`** in the **repo root** (Next.js).
2. Point at your API:

   ```env
   NEXT_PUBLIC_API_URL=https://api.myscriptic.com
   ```

   Or `http://localhost:8000` if Laravel runs locally (still no `/api` in the env value).

3. Set the same `NEXT_PUBLIC_USE_LARAVEL_*` flags you use on Vercel.
4. Ensure **`CORS_ALLOWED_ORIGINS`** on Laravel includes **`http://localhost:3000`**.

---

## 4. Verify end-to-end

1. `curl -sI https://api.myscriptic.com/api/health` (or any public route you expose)—expect **200** and correct CORS headers if you send `Origin`.
2. Open the Vercel site → **login** → confirm no CORS errors in DevTools **Network**.
3. Hit a Phase 3 route (e.g. reader with numeric book id) only after **`NEXT_PUBLIC_USE_LARAVEL_PHASE3=true`** and routes exist on Laravel.

---

## 5. Git workflow (unchanged)

Push to **`main`** → GitHub Actions runs **CI** (`.github/workflows/ci.yml`) → Vercel builds from Git. Laravel on CyberPanel updates only when **you deploy** the PHP app (git pull, composer, migrate, restart PHP/OpenLiteSpeed if needed)—Vercel does not deploy Laravel.

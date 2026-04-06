# Connect Next.js (Vercel) to Laravel (`api.myscriptic.com`) on CyberPanel

This repo’s SPA uses **`NEXT_PUBLIC_API_URL`** (must end with **`/api`**) and sends **`Authorization: Bearer …`** to Laravel (`lib/api.ts`). Feature flags live in **`lib/auth-mode.ts`**.

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

Laravel reads **`CORS_ALLOWED_ORIGINS`** (comma-separated, no spaces after commas). Include **every** origin that loads the Next app:

```env
CORS_ALLOWED_ORIGINS=https://myscriptic.vercel.app,https://myscriptic.com,https://www.myscriptic.com
```

Config is in **`backend/config/cors.php`**. After changing `.env`, clear config cache if you use it:

```bash
php artisan config:clear
```

### Frontend URL (emails, redirects, Phase 2 helpers)

Align with your real site:

```env
FRONTEND_URL=https://myscriptic.vercel.app
```

(Or your custom domain when you cut over.)

### Sanctum / API auth

The Next client stores a token and uses **Bearer** headers. Ensure Laravel issues tokens the way `auth-provider` / login flows expect (Sanctum personal access tokens or equivalent). If you switch to **cookie + CSRF** SPA mode, you must also change the frontend `fetch` calls (e.g. `credentials: 'include'`)—the current client is built for **Bearer** JSON APIs.

---

## 2. Vercel (GitHub deploy)

In **Vercel → Project → Settings → Environment Variables**, set at least:

| Name | Example |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.myscriptic.com/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://myscriptic.vercel.app` (or custom domain) |
| `NEXT_PUBLIC_USE_LARAVEL_AUTH` | `true` |
| `NEXT_PUBLIC_USE_LARAVEL_PHASE2` | `true` when marketplace APIs are ready |
| `NEXT_PUBLIC_USE_LARAVEL_PHASE3` | `true` for reader / subscriptions / progress sync |
| `NEXT_PUBLIC_USE_LARAVEL_COURSES` | `true` when course APIs are ready |

`NEXT_PUBLIC_*` variables are applied at **build** time. **Redeploy** after changing them.

Preview deployments: add your **preview URL pattern** to Laravel **`CORS_ALLOWED_ORIGINS`** (e.g. `https://myscriptic-git-*-wedevstore.vercel.app` is awkward—often people use a regex via `allowed_origins_patterns` in `cors.php`, or test previews against a staging API with broader CORS).

---

## 3. Local development

1. Copy **`.env.example`** → **`.env.local`** in the **repo root** (Next.js).
2. Point at your API:

   ```env
   NEXT_PUBLIC_API_URL=https://api.myscriptic.com/api
   ```

   Or `http://localhost:8000/api` if Laravel runs locally.

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

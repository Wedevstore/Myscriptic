# Backend Requirements for api.myscriptic.com

> **This file is the single source of truth for all Laravel backend work.**
> Frontend developers: update this file whenever you add/change API calls.
> Backend developers: use this file to know exactly what to build.
>
> GitHub Issues labeled [`backend`](https://github.com/Wedevstore/Myscriptic/issues?q=label:backend) mirror sections below.

**Last synced:** 2026-04-12 (production hardening update)

---

## Table of Contents

1. [SQL Migrations](#1-sql-migrations)
2. [API Endpoints — Full Reference](#2-api-endpoints--full-reference)
3. [User Object Contract](#3-user-object-contract)
4. [S3 Configuration](#4-s3-configuration)
5. [Changelog](#5-changelog)

---

## 1. SQL Migrations

### 1.1 `book_chapters` table — [Issue #12](https://github.com/Wedevstore/Myscriptic/issues/12)

```sql
CREATE TABLE book_chapters (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT UNSIGNED NOT NULL,
    `index` INT UNSIGNED NOT NULL DEFAULT 0,
    title VARCHAR(500) NOT NULL DEFAULT '',
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_book_chapters_book_id (book_id),
    UNIQUE KEY uniq_book_chapter (book_id, `index`),
    CONSTRAINT fk_book_chapters_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.2 New columns on `books` table — [Issue #13](https://github.com/Wedevstore/Myscriptic/issues/13)

```sql
ALTER TABLE books
    ADD COLUMN chapter_count INT UNSIGNED NULL DEFAULT NULL,
    ADD COLUMN file_format VARCHAR(20) NULL DEFAULT NULL,
    ADD COLUMN file_size_bytes BIGINT UNSIGNED NULL DEFAULT NULL,
    ADD COLUMN cover_s3_key VARCHAR(500) NULL DEFAULT NULL,
    ADD COLUMN book_file_s3_key VARCHAR(500) NULL DEFAULT NULL,
    ADD COLUMN audio_file_s3_key VARCHAR(500) NULL DEFAULT NULL;
```

### 1.3 `reports` table — [Issue #15](https://github.com/Wedevstore/Myscriptic/issues/15)

```sql
CREATE TABLE reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    target_title VARCHAR(500) NULL DEFAULT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT NULL DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note TEXT NULL DEFAULT NULL,
    reviewed_by BIGINT UNSIGNED NULL DEFAULT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_reports_user (user_id),
    INDEX idx_reports_target (target_type, target_id),
    INDEX idx_reports_status (status),
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.4 Staff permissions on `users` — [Issue #16](https://github.com/Wedevstore/Myscriptic/issues/16)

```sql
ALTER TABLE users
    ADD COLUMN permissions JSON NULL DEFAULT NULL;
```

Permission keys: `dashboard_view`, `users_manage`, `books_manage`, `orders_manage`, `subscriptions_manage`, `revenue_view`, `analytics_view`, `reports_manage`, `staff_manage`, `settings_manage`, `cms_manage`, `notifications_manage`, `authors_manage`, `courses_manage`

### 1.6 Platform settings table (NEW)

```sql
CREATE TABLE platform_settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT NULL,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default settings:
INSERT INTO platform_settings (`key`, `value`) VALUES
  ('platformName', 'MyScriptic'),
  ('supportEmail', 'support@myscriptic.com'),
  ('authorRevenueShare', '70'),
  ('autoApproveAuthors', 'false'),
  ('maxBooksPerAuthor', '50'),
  ('trialDays', '7'),
  ('emailOnNewBook', 'true'),
  ('emailOnSubscription', 'true'),
  ('emailOnPayout', 'true'),
  ('maintenanceMode', 'false');
```

### 1.7 Blog posts table (NEW)

```sql
CREATE TABLE blog_posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    excerpt TEXT NULL,
    body LONGTEXT NOT NULL,
    author VARCHAR(200) NOT NULL DEFAULT 'MyScriptic Team',
    category VARCHAR(100) NOT NULL DEFAULT 'Company',
    cover_url VARCHAR(1000) NULL,
    published_at TIMESTAMP NULL,
    read_time VARCHAR(50) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_blog_posts_slug (slug),
    INDEX idx_blog_posts_category (category),
    INDEX idx_blog_posts_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.5 Author applications — [Issue #17](https://github.com/Wedevstore/Myscriptic/issues/17)

```sql
-- If table exists, add missing columns:
ALTER TABLE author_applications
    ADD COLUMN IF NOT EXISTS country VARCHAR(100) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS payout_currency VARCHAR(10) NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS agree_terms TINYINT(1) NOT NULL DEFAULT 0;

-- If table doesn't exist:
CREATE TABLE author_applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    bio TEXT NULL,
    country VARCHAR(100) NULL,
    payout_method VARCHAR(50) NULL,
    payout_details JSON NULL,
    payout_currency VARCHAR(10) NULL DEFAULT 'USD',
    agree_terms TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note TEXT NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_author_apps_user (user_id),
    INDEX idx_author_apps_status (status),
    CONSTRAINT fk_author_apps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. API Endpoints — Full Reference

All paths under `/api`. Auth = Laravel Sanctum Bearer token unless noted.

### Auth

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/auth/login` | No | `{ email, password }` | `{ token, user }` or `{ pending_token }` for 2FA |
| POST | `/auth/register` | No | `{ name, email, password, role }` | `{ token, user }` |
| POST | `/auth/forgot-password` | No | `{ email }` | `{ message }` |
| POST | `/auth/reset-password` | No | `{ token, email, password, password_confirmation }` | `{ message }` |
| POST | `/auth/logout` | Yes | — | void |
| GET | `/auth/me` | Yes | — | `{ user }` (see User Object below) |
| PATCH | `/auth/me` | Yes | `{ name }` | `{ user }` |
| DELETE | `/auth/me` | Yes | — | void |
| POST | `/auth/google` | No | `{ credential }` | `{ token, user }` |
| POST | `/auth/apple` | No | `{ identity_token }` | `{ token, user }` |
| PUT | `/auth/password` | Yes | `{ current_password, password, password_confirmation }` | `{ message }` |

### 2FA

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/auth/2fa/verify` | No | `{ pending_token, code }` | `{ token, user }` |
| POST | `/auth/2fa/setup` | Yes | `{}` | `{ secret, otpauth_uri, qr_svg? }` |
| POST | `/auth/2fa/confirm` | Yes | `{ code }` | `{ user }` |
| POST | `/auth/2fa/disable` | Yes | `{ code, password? }` | `{ user }` |

### Books

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/books` | No | query params | `{ data: Book[], meta }` |
| GET | `/books/search` | No | `?q=&per_page=&page=` | `{ data, meta }` |
| GET | `/books/categories` | No | — | `{ data: string[] }` |
| GET | `/books/:id` | No | — | `{ data: Book }` |
| POST | `/books` | Yes | JSON (see payload below) | `{ data: Book }` |
| PATCH | `/books/:id` | Yes | JSON partial | `{ data: Book }` |
| DELETE | `/books/:id` | Yes | — | void |
| GET | `/author/my-books` | Yes | query params | `{ data, meta }` |
| POST | `/admin/books/:id/approve` | Admin | — | void |
| POST | `/admin/books/:id/reject` | Admin | `{ reason }` | void |

**Book create/patch JSON payload:**
```json
{
  "title": "string",
  "description": "string",
  "sample_excerpt": "string|null",
  "category": "string",
  "tags": ["string"],
  "access_type": "FREE|PAID|SUBSCRIPTION",
  "format": "ebook|audiobook|magazine",
  "currency": "USD",
  "price": 9.99,
  "cover_s3_key": "uploads/42/uuid/cover.jpg",
  "book_file_s3_key": "uploads/42/uuid/book.epub",
  "audio_file_s3_key": "uploads/42/uuid/audio.mp3",
  "chapter_count": 24
}
```

**Book response fields the frontend reads:**
`id`, `title`, `author`, `description`, `sample_excerpt`, `opening_excerpt`, `cover_url`, `rating`, `review_count`, `price`, `currency`, `access_type`, `format`, `category`, `is_new`, `is_trending`, `chapter_count`, `file_format`, `file_size_bytes`, audio URL variants (`audiobook_url`, `audio_url`, `stream_url`, `signed_audio_url`)

### Chapters — [Issue #12](https://github.com/Wedevstore/Myscriptic/issues/12)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/books/:id/chapters` | Yes | `{ chapters: [{index,title,content}], append?: bool }` | `{ success: true }` |
| GET | `/books/:id/chapters` | Yes | `?page=1` | `{ data: Chapter[], meta: { current_page, last_page } }` |

When `append=false` (default): delete existing chapters first, then insert. When `append=true`: upsert by `book_id+index` (used for batched saves of 15 at a time).

### S3 Signed URLs — [Issue #14](https://github.com/Wedevstore/Myscriptic/issues/14)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/upload/signed-url` | Yes | `{ filename, mime_type }` | `{ url, key }` |
| POST | `/library/:id/signed-url` | Yes | `{}` | `{ url, expires_at }` |

### Library & Access

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/library` | Yes | `{ data: Book[] }` |
| GET | `/library/:id/access` | Yes | `{ has_access, source, expires_at }` |

### Reports — [Issue #15](https://github.com/Wedevstore/Myscriptic/issues/15)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/reports` | Yes | `{ target_type, target_id, target_title?, reason, description }` | `{ report_id, message }` |
| GET | `/admin/reports` | Admin | `?status=&target_type=&page=` | `{ data: Report[], meta }` |
| PATCH | `/admin/reports/:id` | Admin | `{ status, admin_note? }` | `{ success: true }` |

### Reading Progress

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/reading-progress` | Yes | `{ book_id, page_number, pages_total, seconds_read }` | `{ page_number, percent_complete, reading_time_seconds }` |
| GET | `/reading-progress/:id` | Yes | — | same shape |
| GET | `/reading-analytics` | Yes | — | `{ data: { summary, books } }` |

### Subscriptions

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/subscription/plans` | No | — | `{ data: Plan[] }` |
| POST | `/subscription/checkout` | Yes | `{ plan_id, payment_gateway, return_url? }` | `{ order_id, payment_url, amount, currency }` |
| POST | `/subscription/cancel` | Yes | — | `{ success, access_until? }` |
| GET | `/subscription/status` | Yes | — | `{ active, plan, expires_at }` |
| GET | `/subscription/catalog` | Yes | query params | `{ data, meta }` |

### Orders & Payments

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/orders` | Yes | `{ items?, coupon_code?, payment_gateway, currency, return_url? }` | `{ order_id, payment_url, order_number }` |
| GET | `/orders` | Yes | — | `{ data: Order[] }` |
| GET | `/orders/:id` | Yes | — | `{ data: Order }` |
| GET | `/orders/:id/verify` | Yes | — | `{ verified, order }` |
| GET | `/orders/:id/invoice` | Yes | — | PDF blob download |
| POST | `/payments/initialize` | Yes | `{ order_id, gateway, currency, return_url }` | `{ payment_url, reference }` |
| POST | `/payments/verify` | Yes | `{ reference, gateway }` | `{ verified, order_id, status }` |

### Cart

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/cart` | Yes | — | cart object |
| POST | `/cart` | Yes | `{ book_id, quantity }` | cart object |
| PATCH | `/cart/:bookId` | Yes | `{ quantity }` | cart object |
| DELETE | `/cart/:bookId` | Yes | — | void |
| DELETE | `/cart` | Yes | — | void (clear all) |

### Wishlist & Reviews

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/wishlist` | Yes | — | `{ data }` |
| POST | `/wishlist` | Yes | `{ book_id }` | success |
| DELETE | `/wishlist/:bookId` | Yes | — | void |
| GET | `/books/:id/reviews` | No | — | `{ data: Review[] }` |
| POST | `/books/:id/reviews` | Yes | `{ rating, comment }` | `{ data: Review }` |

### Authors

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/authors/trending` | No | `?limit=` | `{ data: Author[] }` |
| GET | `/authors/:id` | No | — | `{ data: Author }` |
| POST | `/authors/:id/follow` | Yes | — | `{ ok }` |
| DELETE | `/authors/:id/follow` | Yes | — | void |
| GET | `/me/followed-authors` | Yes | — | `{ data: string[] }` |
| POST | `/author/apply` | Yes | `{ bio, payout_method, payout_details, country, payoutCurrency, agreeTerms }` | `{ application_id }` |

### Author Earnings & Sales

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/author/earnings/summary` | Yes | earnings summary |
| GET | `/author/earnings/:year/:month` | Yes | monthly detail |
| GET | `/author/earnings/payouts` | Yes | payout history |
| GET | `/author/sales/summary` | Yes | sales summary |
| GET | `/author/sales/books` | Yes | per-book sales |
| GET | `/author/sales/transactions` | Yes | transaction list |
| GET | `/author/payout-details` | Yes | payout config |
| POST | `/author/payout-details` | Yes | update payout config |

### Courses

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/courses` | No | `?q=` | `{ data: Course[] }` |
| GET | `/courses/:slug` | No | — | `{ data: CourseDetail }` |
| GET | `/author/courses` | Yes | — | `{ data: CourseDetail[] }` |
| POST | `/author/courses` | Yes | course payload | `{ data: CourseDetail }` |
| PUT | `/author/courses/:id` | Yes | partial payload | `{ data: CourseDetail }` |
| DELETE | `/author/courses/:id` | Yes | — | void |

### Admin (condensed)

| Area | Key Endpoints |
|------|---------------|
| Dashboard | `GET /admin/dashboard`, `GET /admin/dashboard/charts?days=` |
| Users | `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/block` |
| Books | `GET /admin/books/pending` |
| Authors | `GET /admin/authors/stats`, `GET /admin/authors/pending-applications`, approve/reject |
| CMS | CRUD `/admin/homepage/sections`, items, reorder; `/admin/cms-pages` |
| Analytics | Revenue, top books/authors, cohort retention |
| Revenue | Cycles, payouts approve/hold, export CSV |
| Coupons | CRUD `/admin/coupons`; `POST /coupons/validate` |
| Refunds | `POST /admin/refunds`, `GET /admin/refunds` |
| Transactions | `GET /admin/transactions`, `GET /admin/transactions/:id` |
| Tax | `GET/PUT /admin/tax/:id` |
| Subscriptions | CRUD `/admin/subscription-plans`; `GET/PUT /admin/subscription-pool/settings` |
| Notifications | `GET/POST /admin/notification-broadcasts` |
| Features | `GET/PUT /admin/site-features` |
| Contact | `GET /admin/contact-submissions` |
| Audit | `GET /admin/audit-logs` |
| Courses | `GET /admin/author-courses` |

### Staff Management (NEW)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/admin/staff` | Admin | — | `{ data: StaffMember[] }` |
| POST | `/admin/staff` | Admin | `{ name, email, password, permissions: string[] }` | `{ data: StaffMember }` |
| PATCH | `/admin/staff/:id` | Admin | `{ permissions?, active? }` | `{ data: StaffMember }` |
| DELETE | `/admin/staff/:id` | Admin | — | void |

StaffMember: `{ id, name, email, avatar?, permissions: string[], active: boolean, created_at }`

### Platform Settings (NEW)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/admin/settings` | Admin | — | `{ data: PlatformSettings }` |
| PUT | `/admin/settings` | Admin | `{ platformName, supportEmail, authorRevenueShare, autoApproveAuthors, maxBooksPerAuthor, trialDays, emailOnNewBook, emailOnSubscription, emailOnPayout, maintenanceMode }` | `{ data: PlatformSettings }` |

### Blog Posts (NEW)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/blog` | No | `?category=&page=` | `{ data: BlogPost[], meta }` |
| GET | `/blog/:idOrSlug` | No | — | `{ data: BlogPost }` |

BlogPost: `{ id, title, slug, excerpt, body, author, category, cover_url, published_at, read_time }`

### Public / Misc

| Method | Path | Notes |
|--------|------|-------|
| POST | `/contact` | `{ name, email, topic, message }` |
| POST | `/newsletter/subscribe` | `{ email }` |
| POST | `/coupons/validate` | `{ code, subtotal }` |
| GET | `/site-config` | Ads, CDN, feature flags |
| GET | `/cms/homepage` | Public homepage sections |
| GET | `/cms/pages/:slug` | Public CMS page |
| GET | `/notifications` | User notifications |
| PATCH | `/notifications/:id/read` | Mark read |
| POST | `/notifications/read-all` | Mark all read |
| POST | `/devices/fcm` | `{ token, platform }` |
| GET | `/store/books` | Store catalog |
| GET | `/store/featured` | Featured store items |

---

## 3. User Object Contract

Every auth endpoint that returns `{ user }` must include:

```json
{
  "id": 42,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "avatar": "https://...|null",
  "role": "admin|staff|author|user",
  "permissions": ["dashboard_view", "books_manage"] | null,
  "subscription_plan": "premium|null",
  "subscription_expires_at": "ISO8601|null",
  "two_factor_enabled": true|false,
  "author_application_status": "pending|approved|rejected|null",
  "created_at": "ISO8601"
}
```

Frontend accepts both `snake_case` and `camelCase` for all fields.

---

## 4. S3 Configuration

### Bucket CORS (required for browser uploads/downloads)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "https://myscriptic.com",
      "https://www.myscriptic.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### Upload flow
1. Frontend calls `POST /api/upload/signed-url` → gets presigned PUT URL + S3 key
2. Frontend PUTs file directly to S3
3. Frontend sends S3 key in book create/patch payload

### Download flow (ebooks: EPUB/PDF)
1. Frontend calls `POST /api/library/:id/signed-url` → presigned GET URL for the object behind `book_file_s3_key`
2. Browser **GET**s the file directly from S3 (CORS required), parses chapters client-side, caches in IndexedDB
3. Optional fallback: `GET /api/books/:id/chapters` when signed URL or S3 fetch fails (legacy / server cache)

Author uploads use the same upload flow for EPUB and PDF (`book_file_s3_key`); presign should allow `application/epub+zip` and `application/pdf`.

---

## 5. Changelog

| Date | Change | Frontend Files | Backend Impact |
|------|--------|----------------|----------------|
| 2026-04-12 | Ebook reader: S3-first, EPUB MIME on upload | `lib/api.ts`, `app/reader/[id]/page.tsx` | Ensure `POST /library/:id/signed-url` serves `book_file_s3_key`; presign upload accepts `application/epub+zip` |
| 2026-04-12 | Book chapters: parse, store, fetch | `lib/book-parser.ts`, `lib/api.ts`, `app/reader/[id]/page.tsx` | NEW: `book_chapters` table, `POST/GET /books/:id/chapters` |
| 2026-04-12 | S3 direct upload + signed download | `lib/api.ts`, `app/dashboard/author/books/new/page.tsx` | NEW: `POST /upload/signed-url`, `POST /library/:id/signed-url` |
| 2026-04-12 | Book metadata fields | `lib/book-mapper.ts`, `app/books/[id]/page.tsx` | NEW columns: `chapter_count`, `file_format`, `file_size_bytes`, S3 keys |
| 2026-04-12 | Reports system | `components/report-dialog.tsx`, `app/dashboard/admin/reports/page.tsx` | NEW: `reports` table, `POST /reports`, `GET/PATCH /admin/reports` |
| 2026-04-12 | Staff permissions | `lib/staff-permissions.ts`, `components/providers/auth-provider.tsx` | NEW: `users.permissions` JSON column |
| 2026-04-12 | Author registration fields | `app/become-author/page.tsx` | ALTER: `author_applications` add `country`, `payout_currency`, `agree_terms` |
| 2026-04-12 | Auth user shape | `components/providers/auth-provider.tsx` | Ensure `role`, `permissions`, `author_application_status` in all auth responses |
| 2026-04-12 | Edit book flow | `app/dashboard/author/books/new/page.tsx` | Ensure `PATCH /api/books/:id` works with all fields |
| 2026-04-12 | Author/admin preview | `app/reader/[id]/page.tsx` | No backend change (access bypass is frontend-only) |
| 2026-04-12 | IndexedDB chapter cache | `lib/chapter-store.ts` | No backend change (client-side only) |
| 2026-04-12 | PDF Web Worker | `lib/book-parser-worker.ts` | No backend change (client-side only) |
| 2026-04-12 | Staff management API | `lib/staff-permissions.ts`, `lib/api.ts` | NEW: `GET/POST/PATCH/DELETE /admin/staff` — create staff with role + permissions |
| 2026-04-12 | Platform settings API | `app/dashboard/admin/settings/page.tsx`, `lib/api.ts` | NEW: `GET/PUT /admin/settings` — persist platform config to DB |
| 2026-04-12 | Blog posts API | `app/blog/page.tsx`, `lib/api.ts` | NEW: `GET /blog`, `GET /blog/:idOrSlug` — CMS-managed blog posts |
| 2026-04-12 | Book reviews wired to API | `app/books/[id]/page.tsx` | Ensure `GET /books/:id/reviews` returns reviews for the book |
| 2026-04-12 | Reports always use API in prod | `components/report-dialog.tsx` | No new endpoint — existing `POST /reports` now always called in production |
| 2026-04-12 | Middleware auth protection | `middleware.ts` | No backend change — server-side route guarding via auth cookie |
| 2026-04-12 | Seed functions disabled in prod | `lib/store.ts`, `lib/store-p4.ts`, `lib/author-courses-store.ts` | No backend change — mock data no longer seeded in production |
| 2026-04-12 | CSP tightened | `next.config.js` | No backend change — removed `unsafe-eval` from Content-Security-Policy |
| 2026-04-12 | Error reporting facade | `lib/error-reporting.ts`, `app/error.tsx`, `app/global-error.tsx` | No backend change — structured error logging for Vercel log drain |
| 2026-04-12 | Footer newsletter wired to API | `components/layout/footer-newsletter.tsx` | Ensure `POST /newsletter/subscribe` stores email + sends confirmation |

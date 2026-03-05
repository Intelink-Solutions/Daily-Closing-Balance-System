# Frontend + Laravel Backend Integration Setup

## 1) Backend (Laravel)

From [backend](backend):

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan vendor:publish --provider="Laravel\\Sanctum\\SanctumServiceProvider"
php artisan migrate
php artisan storage:link
php artisan serve
```

Start queue worker for statement imports:

```bash
php artisan queue:work --queue=statement-imports,default
```

Laravel API base URL will be `http://127.0.0.1:8000/api` by default.

## 2) Frontend (Vite)

From project root:

```bash
cp .env.example .env
npm install
npm run dev
```

If backend uses a different host/port, update `.env`:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## Quick Start (Windows)

From the project root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
```

This opens 3 terminals:
- Laravel API server (`php artisan serve`)
- Queue worker (`php artisan queue:work --queue=statement-imports,default`)
- Frontend Vite server (`npm run dev`)

To stop local dev processes:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-all.ps1
```

## 3) End-to-end check

1. Open frontend and login with API credentials.
2. Upload a CSV statement from Upload Statement page.
3. Check Transactions list updates.
4. Check Daily Closing Report updates.
5. Verify Dashboard metrics/trend load from backend.

## 4) Notes

- If API is unreachable, frontend falls back to local processing.
- With API configured and reachable, auth/data flows use Laravel endpoints.
- Protected endpoints require Sanctum Bearer token returned by `/api/login`.

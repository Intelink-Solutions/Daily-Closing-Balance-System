# DCBS Backend API (Laravel 11 + MySQL + Sanctum)

Production-ready backend API for Daily Closing Balance System.

## Stack
- Laravel 11
- MySQL
- Laravel Sanctum (token auth)
- Service Layer architecture
- API Resources
- Form Requests
- Queue jobs for large CSV imports
- Soft deletes + audit logging

## Implemented Features

### 1) Authentication
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout` (auth required)
- Password hashing via Laravel `hashed` cast
- Sanctum token creation and protected routes

### 2) Statement Upload (CSV)
- `POST /api/statements/upload` (auth required)
- Stores file in `storage/app/statements`
- Parses and imports rows through `StatementImportService`
- Triggers `DailyClosingService` after import
- Uses queue job `ProcessStatementImport` for scalability

### 3) Core Financial APIs
- `GET /api/transactions` (pagination + date filters)
- `GET /api/daily-closings`
- `DELETE /api/transactions/{id}`

### 3a) Bank Accounts (Multi-bank support)
- `GET /api/bank-accounts`
- `POST /api/bank-accounts`
- `PATCH /api/bank-accounts/{bankAccount}`
- `DELETE /api/bank-accounts/{bankAccount}`

### 3b) Admin APIs (RBAC)
- `GET /api/admin/users` (admin only)
- `PATCH /api/admin/users/{user}/role` (admin only)
- `GET /api/admin/diagnostics` (admin only)

### 3c) System Monitoring
- `GET /api/health` (public health check)

### 4) Architecture
- Controllers: `app/Http/Controllers/Api`
- Services: `app/Services`
- Requests: `app/Http/Requests`
- Resources: `app/Http/Resources`
- Middleware: role middleware + Sanctum auth
- Consistent JSON response format

### 5) Security & Production Practices
- Sanctum auth middleware on financial routes
- Form Request validation
- Try-catch handling in critical controllers
- JSON exception output for API routes
- Role-based checks (`admin` / `user`)
- Soft deletes (`users`, `bank_accounts`, `transactions`, `daily_closings`)
- Audit logging (`audit_logs` table)
- Rate limiting (`throttle:api`)
- Queue-ready import processing (`jobs`, `failed_jobs`, `job_batches`)

---

## Project Structure

```text
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   ├── StatementController.php
│   │   │   ├── TransactionController.php
│   │   │   └── DailyClosingController.php
│   │   ├── Requests/
│   │   ├── Resources/
│   │   └── Middleware/EnsureUserHasRole.php
│   ├── Jobs/ProcessStatementImport.php
│   ├── Models/
│   ├── Services/
│   │   ├── StatementImportService.php
│   │   ├── DailyClosingService.php
│   │   └── AuditLogService.php
│   └── Support/ApiResponse.php
├── bootstrap/app.php
├── config/dcbs.php
├── database/migrations/
├── routes/api.php
└── .env.example
```

---

## Setup Instructions

1. **Create Laravel app (if starting fresh)**
```bash
composer create-project laravel/laravel backend "^11.0"
cd backend
composer require laravel/sanctum
```

2. **Copy these backend files into the Laravel project**

3. **Configure environment**
```bash
cp .env.example .env
php artisan key:generate
```

4. **Install Sanctum**
```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

5. **Run migrations**
```bash
php artisan migrate
```

6. **Link storage for file serving (optional)**
```bash
php artisan storage:link
```

7. **Start queue worker (required for statement processing)**
```bash
php artisan queue:work --queue=statement-imports,default
```

8. **Optional one-command deploy script**
```bash
chmod +x deploy.sh
./deploy.sh
```

9. **Run API**
```bash
php artisan serve
```

---

## Request / Response Standard

### Success
```json
{
  "success": true,
  "message": "Statement processed successfully",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Validation error",
  "data": null
}
```

---

## cPanel Deployment Notes

1. Use PHP 8.2+.
2. Set document root to Laravel `public/`.
3. Set `.env` with production DB and app URL.
4. Run `composer install --no-dev --optimize-autoloader`.
5. Run `php artisan migrate --force`.
6. Configure cron for queue worker (or Supervisor if available):
   - `* * * * * php /home/USER/path/to/artisan queue:work --queue=statement-imports,default --stop-when-empty`
7. Set proper writable permissions for `storage/` and `bootstrap/cache/`.

---

## Postman

- Import collection: `postman/DCBS_API.postman_collection.json`
- Set:
  - `base_url` (e.g. `https://api.your-domain.com`)
  - `token` from login response

---

## Deployment Docs

- cPanel runbook: `docs/CPANEL_DEPLOY_CHECKLIST.md`
- Curl smoke tests: `docs/API_SMOKE_TESTS.md`

---

## Notes on Multi-Bank + RBAC
- Multi-bank supported via `bank_accounts` and `bank_account_id` relation in transactions/daily closings.
- User role is stored in `users.role` (`admin` / `user`).
- Deleting another user’s transaction is blocked unless requester is admin.


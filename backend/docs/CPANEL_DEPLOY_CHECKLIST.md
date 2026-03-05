# cPanel Deployment Checklist (DCBS API)

Use this as a runbook for first deployment and updates.

## 1) Server prerequisites
- PHP 8.2+
- MySQL 8+
- Composer available in shell
- Cron jobs enabled

## 2) Upload project
- Upload `backend/` contents to your API app folder (example: `/home/USER/apps/dcbs-api`).
- Ensure web root/public entry points to Laravel `public/`.

## 3) Configure environment
Create `.env` from `.env.example` and set:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://api.your-domain.com`
- `DB_*` values for MySQL
- `SESSION_DRIVER=database`
- `CACHE_STORE=database`
- `QUEUE_CONNECTION=database`

## 4) Install dependencies and optimize
```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan storage:link
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

## 5) Queue setup
Set cron (every minute):
```bash
* * * * * cd /home/USER/apps/dcbs-api && php artisan queue:work --queue=statement-imports,default --stop-when-empty >> /dev/null 2>&1
```

## 6) Permissions
Ensure writable permissions for:
- `storage/`
- `bootstrap/cache/`

## 7) API smoke tests
1. `POST /api/register`
2. `POST /api/login`
3. `POST /api/statements/upload` with Bearer token and CSV file
4. `GET /api/transactions`
5. `GET /api/daily-closings`
6. `POST /api/logout`

## 8) Production update flow
```bash
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan queue:restart
php artisan optimize
```

## 9) Security quick checks
- Use HTTPS only
- Rotate `APP_KEY` only before go-live
- Set strong MySQL user password
- Restrict DB user permissions to app database
- Keep `APP_DEBUG=false` in production

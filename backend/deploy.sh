#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"

cd "$APP_DIR"

echo "[1/7] Installing dependencies..."
$COMPOSER_BIN install --no-dev --optimize-autoloader

echo "[2/7] Caching config/routes/views..."
$PHP_BIN artisan config:cache
$PHP_BIN artisan route:cache
$PHP_BIN artisan view:cache

echo "[3/7] Running migrations..."
$PHP_BIN artisan migrate --force

echo "[4/7] Linking storage..."
$PHP_BIN artisan storage:link || true

echo "[5/7] Queue restart signal..."
$PHP_BIN artisan queue:restart || true

echo "[6/7] Optimizing app..."
$PHP_BIN artisan optimize

echo "[7/7] Done."

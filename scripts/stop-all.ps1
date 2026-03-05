$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping common local dev processes (php/node)..." -ForegroundColor Yellow
Get-Process php, node | Stop-Process -Force
Write-Host "Stopped." -ForegroundColor Green

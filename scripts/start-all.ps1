$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendCandidates = @(
    (Join-Path $root "backend"),
    (Join-Path $root "backend_laravel_seed"),
    (Join-Path $root "backend_laravel")
)

$backend = $null
foreach ($candidate in $backendCandidates) {
    if (Test-Path (Join-Path $candidate "artisan")) {
        $backend = $candidate
        break
    }
}

Write-Host "Starting DCBS stack..." -ForegroundColor Cyan

if (-not $backend) {
    Write-Warning "No runnable Laravel backend found (artisan missing in backend candidates). Skipping backend + queue startup."
} else {
    Write-Host "Using backend at: $backend" -ForegroundColor DarkCyan
    $phpRuntimeArgs = "-d upload_max_filesize=2048M -d post_max_size=2048M -d memory_limit=2048M"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; php $phpRuntimeArgs artisan serve"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; php $phpRuntimeArgs artisan queue:work --queue=statement-imports,default"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm run dev"

Write-Host "Done. Open frontend at the Vite URL shown in the spawned terminal." -ForegroundColor Green

# Start the full pipeline locally (API + Celery worker) — no Docker
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

& "$PSScriptRoot\fix_env_local.ps1"

& "$PSScriptRoot\verify_security.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Security check failed. Fix issues above before starting." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Run setup first: .\scripts\setup_local.ps1" -ForegroundColor Red
    exit 1
}

# Quick Redis check
try {
    $ping = redis-cli ping 2>&1
    if ($ping -notmatch "PONG") { throw "no pong" }
} catch {
    Write-Host "Redis is not running on 127.0.0.1:6379" -ForegroundColor Red
    Write-Host "Start Redis first, then run this script again." -ForegroundColor Yellow
    Write-Host "  Memurai: start from Windows Services, or run redis-server" -ForegroundColor Yellow
    exit 1
}

$venvActivate = Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1"
$escapedRoot = $ProjectRoot -replace "'", "''"

Write-Host "`nStarting ShortsForge locally..." -ForegroundColor Cyan
Write-Host "  Dashboard: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Two new terminal windows will open (API + Worker)" -ForegroundColor Gray
Write-Host "  Close those windows to stop the pipeline.`n" -ForegroundColor Gray

# API server (local only — not exposed to network)
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$escapedRoot'; & '$venvActivate'; Write-Host '=== API Server ===' -ForegroundColor Cyan; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
)

Start-Sleep -Seconds 2

# Celery worker (threads pool required on Windows)
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$escapedRoot'; & '$venvActivate'; Write-Host '=== Celery Worker ===' -ForegroundColor Cyan; celery -A app.workers.celery_tasks worker --loglevel=info --pool=threads --concurrency=4"
)

Write-Host "Started. Open http://127.0.0.1:8000 and click START PIPELINE." -ForegroundColor Green

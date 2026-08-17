# Verify local prerequisites without reading .env secrets
$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Ok = $true

function Test-Command($Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "`n=== ShortsForge Local Prerequisites ===" -ForegroundColor Cyan

# Python
if (Test-Command python) {
    $pyVer = python --version 2>&1
    Write-Host "[OK] Python: $pyVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Python not found. Install Python 3.11+ from python.org" -ForegroundColor Red
    $Ok = $false
}

# FFmpeg
if (Test-Command ffmpeg) {
    Write-Host "[OK] FFmpeg installed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] FFmpeg not found." -ForegroundColor Red
    Write-Host "       Install: winget install Gyan.FFmpeg" -ForegroundColor Yellow
    $Ok = $false
}

# Redis
$redisOk = $false
if (Test-Command redis-cli) {
    try {
        $ping = redis-cli ping 2>&1
        if ($ping -match "PONG") {
            Write-Host "[OK] Redis running (redis-cli ping -> PONG)" -ForegroundColor Green
            $redisOk = $true
        }
    } catch {}
}
if (-not $redisOk) {
    Write-Host "[FAIL] Redis not running on localhost:6379" -ForegroundColor Red
    Write-Host "       Option A: winget install Memurai.MemuraiDeveloper  (then start Memurai service)" -ForegroundColor Yellow
    Write-Host "       Option B: scoop install redis  then run redis-server in a terminal" -ForegroundColor Yellow
    Write-Host "       Option C: WSL: sudo apt install redis-server && redis-server" -ForegroundColor Yellow
    $Ok = $false
}

# .env exists
$envPath = Join-Path $ProjectRoot ".env"
if (Test-Path $envPath) {
    $hasKey = Select-String -Path $envPath -Pattern '^GEMINI_API_KEY=\S+' -Quiet
    if ($hasKey) {
        Write-Host "[OK] .env exists with GEMINI_API_KEY set" -ForegroundColor Green
    } else {
        Write-Host "[WARN] .env exists but GEMINI_API_KEY is empty" -ForegroundColor Yellow
        $Ok = $false
    }
} else {
    Write-Host "[FAIL] .env missing. Run: .\scripts\setup_local.ps1" -ForegroundColor Red
    $Ok = $false
}

# Venv
$venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    Write-Host "[OK] Virtual environment (.venv) ready" -ForegroundColor Green
} else {
    Write-Host "[WARN] .venv not found. Run: .\scripts\setup_local.ps1" -ForegroundColor Yellow
    $Ok = $false
}

Write-Host ""
if ($Ok) {
    Write-Host "All checks passed. Run: .\scripts\start_local.ps1" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Fix the items above, then run this script again." -ForegroundColor Red
    exit 1
}

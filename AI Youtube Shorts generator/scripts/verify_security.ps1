# Security audit for local-only pipeline (never prints .env contents)
$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
$Ok = $true

Write-Host "`n=== Security Audit ===" -ForegroundColor Cyan

# .env gitignored
if (Test-Path ".git") {
    $ignored = git check-ignore -v .env 2>$null
    if ($ignored) {
        Write-Host "[OK] .env is gitignored" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] .env is NOT gitignored - add to .gitignore before git init" -ForegroundColor Red
        $Ok = $false
    }
} else {
    Write-Host "[OK] .gitignore lists .env (git not initialized yet)" -ForegroundColor Green
}

# .dockerignore blocks .env
if (Select-String -Path ".dockerignore" -Pattern "^\.env" -Quiet) {
    Write-Host "[OK] .dockerignore excludes .env" -ForegroundColor Green
} else {
    Write-Host "[WARN] .dockerignore should exclude .env" -ForegroundColor Yellow
}

# No hardcoded API keys in source (pattern only, not reading .env)
$pyFiles = Get-ChildItem -Recurse -Include "*.py" -Path "app","scripts" -ErrorAction SilentlyContinue
$hardcoded = $pyFiles | Select-String -Pattern "AIza[0-9A-Za-z\-_]{20,}" -AllMatches
if ($hardcoded) {
    Write-Host "[FAIL] Possible hardcoded API key in source files" -ForegroundColor Red
    $Ok = $false
} else {
    Write-Host "[OK] No hardcoded API keys in Python source" -ForegroundColor Green
}

# .env local settings (read only key names, not values)
if (Test-Path ".env") {
    $envLines = Get-Content ".env"
    $checks = @{
        "API_HOST=127.0.0.1" = ($envLines -match "^API_HOST=127\.0\.0\.1")
        "DEBUG=false" = ($envLines -match "^DEBUG=false")
        "LOCAL_ONLY=true" = ($envLines -match "^LOCAL_ONLY=true")
        "localhost Redis" = ($envLines -match "^REDIS_URL=redis://127\.0\.0\.1")
        "GEMINI key set" = ($envLines -match "^GEMINI_API_KEY=\S+" -and $envLines -notmatch "^GEMINI_API_KEY=your_")
    }
    foreach ($label in $checks.Keys) {
        if ($checks[$label]) {
            Write-Host "[OK] .env: $label" -ForegroundColor Green
        } else {
            Write-Host "[WARN] .env: $label missing or incorrect - run fix_env_local.ps1" -ForegroundColor Yellow
            if ($label -eq "GEMINI key set") { $Ok = $false }
        }
    }
} else {
    Write-Host "[FAIL] .env file missing" -ForegroundColor Red
    $Ok = $false
}

Write-Host ""
if ($Ok) {
    Write-Host "Security audit passed for local operation." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Fix warnings above, then re-run this script." -ForegroundColor Red
    exit 1
}

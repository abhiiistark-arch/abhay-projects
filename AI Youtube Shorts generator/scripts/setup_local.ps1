# One-time local setup (no Docker)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "`n=== ShortsForge Local Setup ===" -ForegroundColor Cyan

# Fix .env for local
& "$PSScriptRoot\fix_env_local.ps1"

# Create venv
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

Write-Host "Installing Python packages..."
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt

Write-Host "Installing Playwright Chromium..."
& .\.venv\Scripts\playwright.exe install chromium

# Data dirs
@("data\output", "data\temp", "data\thumbnails", "data\cookies") | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. Ensure GEMINI_API_KEY is in .env (never share it)"
Write-Host "  2. Install & start Redis (see check_prerequisites.ps1 if unsure)"
Write-Host "  3. Run: .\scripts\verify_security.ps1"
Write-Host "  4. Run: .\scripts\check_prerequisites.ps1"
Write-Host "  5. Run: .\scripts\start_local.ps1"

# Switch .env from Docker hostnames to local-only settings (does not print secrets)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env"

if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile
    Write-Host "Created .env from .env.example - add your GEMINI_API_KEY before running."
}

$lines = Get-Content $EnvFile
$updated = $lines | ForEach-Object {
    switch -Regex ($_) {
        '^REDIS_URL=' { 'REDIS_URL=redis://127.0.0.1:6379/0' }
        '^CELERY_BROKER_URL=' { 'CELERY_BROKER_URL=redis://127.0.0.1:6379/0' }
        '^CELERY_RESULT_BACKEND=' { 'CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/1' }
        '^API_HOST=' { 'API_HOST=127.0.0.1' }
        '^DEBUG=' { 'DEBUG=false' }
        '^LOCAL_ONLY=' { 'LOCAL_ONLY=true' }
        default { $_ }
    }
}
$updated | Set-Content $EnvFile -Encoding UTF8

$content = Get-Content $EnvFile -Raw
if ($content -notmatch '(?m)^LOCAL_ONLY=') {
    Add-Content $EnvFile "LOCAL_ONLY=true"
}

Write-Host "Updated .env for secure local run."

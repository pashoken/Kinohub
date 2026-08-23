$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Test-Path -LiteralPath '.env')) {
    throw 'Copy .env.example to .env and fill in the CHANGE_ME values.'
}

if (Select-String -LiteralPath '.env' -Pattern 'CHANGE_ME' -Quiet) {
    throw '.env still contains CHANGE_ME placeholders.'
}

$requiredVariables = @(
    'PUBLIC_APP_ORIGIN', 'SEERR_URL', 'SEERR_API_KEY', 'JACKETT_URL',
    'PUBLIC_JACKETT_URL', 'JACKETT_API_KEY', 'TORRSERVER_URL',
    'PUBLIC_TORRSERVER_URL'
)
$envLines = Get-Content -LiteralPath '.env'
foreach ($name in $requiredVariables) {
    if (-not ($envLines -match "^$([regex]::Escape($name))=.+")) {
        throw "Required value $name is missing from .env."
    }
}

docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose configuration is invalid.' }
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'KinoHub did not become healthy.' }
docker compose ps

Write-Host 'KinoHub is ready. Open PUBLIC_APP_ORIGIN from .env'

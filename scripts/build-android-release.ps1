$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$environmentPath = Join-Path $projectRoot '.env.android-signing'
$gradlePath = Join-Path $projectRoot '.android-tooling\gradle\gradle-8.9\bin\gradle.bat'
$androidProject = Join-Path $projectRoot 'apps\android'
$sourceApk = Join-Path $androidProject 'app\build\outputs\apk\release\app-release.apk'
$artifactDirectory = Join-Path $projectRoot 'artifacts\apk'
$artifactApk = Join-Path $artifactDirectory 'kinohub-tv-0.4.0.apk'
$checksumPath = "$artifactApk.sha256"

if (-not (Test-Path -LiteralPath $environmentPath)) {
    throw 'Missing .env.android-signing. Run scripts/create-android-release-key.ps1 first.'
}

foreach ($line in Get-Content -LiteralPath $environmentPath) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}

foreach ($name in 'KINOHUB_KEYSTORE_PATH', 'KINOHUB_KEYSTORE_PASSWORD', 'KINOHUB_KEY_ALIAS', 'KINOHUB_KEY_PASSWORD') {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
        throw "Signing value $name is missing."
    }
}

$env:JAVA_HOME = Join-Path $projectRoot '.android-tooling\jdk\jdk-17.0.20+8'
$env:ANDROID_HOME = Join-Path $projectRoot '.android-tooling\sdk'
& $gradlePath --no-daemon -p $androidProject clean :app:assembleRelease
if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
Copy-Item -LiteralPath $sourceApk -Destination $artifactApk -Force
$hash = (Get-FileHash -LiteralPath $artifactApk -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  kinohub-tv-0.4.0.apk" | Set-Content -LiteralPath $checksumPath -Encoding ascii

Write-Host "Release APK: $artifactApk"
Write-Host "SHA-256: $hash"

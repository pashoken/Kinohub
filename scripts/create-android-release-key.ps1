$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$signingDirectory = Join-Path $projectRoot '.android-signing'
$keystorePath = Join-Path $signingDirectory 'kinohub-release.keystore'
$environmentPath = Join-Path $projectRoot '.env.android-signing'
$keytoolPath = Join-Path $projectRoot '.android-tooling\jdk\jdk-17.0.20+8\bin\keytool.exe'

if (Test-Path -LiteralPath $keystorePath) {
    throw "Release keystore already exists: $keystorePath"
}
if (-not (Test-Path -LiteralPath $keytoolPath)) {
    throw 'Bundled JDK is missing. Prepare Android tooling before creating the key.'
}

New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
$passwordBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($passwordBytes)
$password = [Convert]::ToHexString($passwordBytes)
$env:KINOHUB_GENERATED_KEY_PASSWORD = $password

& $keytoolPath -genkeypair -v `
    -keystore $keystorePath `
    -storepass:env KINOHUB_GENERATED_KEY_PASSWORD `
    -keypass:env KINOHUB_GENERATED_KEY_PASSWORD `
    -alias kinohub `
    -keyalg RSA `
    -keysize 4096 `
    -validity 10000 `
    -dname 'CN=KinoHub TV, O=KinoHub, C=RU'
if ($LASTEXITCODE -ne 0) { throw 'keytool failed to create the release keystore.' }

@(
    "KINOHUB_KEYSTORE_PATH=$keystorePath"
    "KINOHUB_KEYSTORE_PASSWORD=$password"
    'KINOHUB_KEY_ALIAS=kinohub'
    "KINOHUB_KEY_PASSWORD=$password"
) | Set-Content -LiteralPath $environmentPath -Encoding utf8

Remove-Item Env:KINOHUB_GENERATED_KEY_PASSWORD
Write-Host "Created release signing files. Back up both paths securely:"
Write-Host $keystorePath
Write-Host $environmentPath

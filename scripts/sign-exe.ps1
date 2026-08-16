[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9A-Fa-f ]{40,}$')]
    [string]$Thumbprint,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https?://')]
    [string]$TimestampUrl,

    [string]$SignToolPath
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$executablePath = Join-Path $repositoryRoot 'dist\DOS95.exe'

if (-not (Test-Path -LiteralPath $executablePath -PathType Leaf)) {
    throw 'dist\DOS95.exe отсутствует. Сначала выполните npm run build:win.'
}

if (-not $SignToolPath) {
    $SignToolPath = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' `
        -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $SignToolPath -or -not (Test-Path -LiteralPath $SignToolPath -PathType Leaf)) {
    throw 'SignTool.exe не найден. Установите Windows SDK Signing Tools или передайте -SignToolPath.'
}

$normalizedThumbprint = $Thumbprint.Replace(' ', '').ToUpperInvariant()
$certificate = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert |
    Where-Object { $_.Thumbprint -eq $normalizedThumbprint } |
    Select-Object -First 1

if (-not $certificate) {
    throw "Code Signing сертификат $normalizedThumbprint не найден в Cert:\CurrentUser\My."
}
if (-not $certificate.HasPrivateKey) {
    throw 'У выбранного сертификата отсутствует закрытый ключ.'
}
if ($certificate.NotAfter -le (Get-Date)) {
    throw 'Срок действия выбранного сертификата истёк.'
}

& $SignToolPath sign /sha1 $normalizedThumbprint /fd SHA256 /tr $TimestampUrl /td SHA256 /d DOS95 $executablePath
if ($LASTEXITCODE -ne 0) { throw "SignTool sign завершился с кодом $LASTEXITCODE." }

& $SignToolPath verify /pa /v $executablePath
if ($LASTEXITCODE -ne 0) { throw "SignTool verify завершился с кодом $LASTEXITCODE." }

Push-Location $repositoryRoot
try {
    & node scripts/checksum.js
    if ($LASTEXITCODE -ne 0) { throw "Пересчёт SHA-256 завершился с кодом $LASTEXITCODE." }
} finally {
    Pop-Location
}

Write-Host "DOS95.exe подписан и проверен: $($certificate.Subject)"

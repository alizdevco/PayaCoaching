# Verify Cache-Control headers on deployed static assets.
# Usage:
#   npm run verify:cache
#   npm run verify:cache -- -BaseUrl https://www.payacoaching.ir -AssetPath /assets/index-DnRrmJd-.js
#   npm run verify:cache -- -OriginOnly

param(
  [string]$BaseUrl = "https://www.payacoaching.ir",
  [string]$AssetPath = "",
  [switch]$OriginOnly
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DistIndex = Join-Path $Root "dist/index.html"
$Bucket = if ($env:ARVAN_PUBLIC_BUCKET) { $env:ARVAN_PUBLIC_BUCKET } else { "edu-consult-web" }

function Resolve-AssetPath {
  if ($AssetPath) {
    return $AssetPath
  }

  if (Test-Path $DistIndex) {
    $html = Get-Content $DistIndex -Raw
    $match = [regex]::Match($html, '/assets/[^"]+\.(js|css|woff2)')
    if ($match.Success) {
      return $match.Value
    }
  }

  $response = curl.exe -sL --max-redirs 5 -A "Mozilla/5.0" "$BaseUrl/" 2>&1
  if ($LASTEXITCODE -ne 0) {
    return $null
  }

  $match = [regex]::Match($response, '/assets/[^"]+\.(js|css|woff2)')
  if ($match.Success) {
    return $match.Value
  }

  return $null
}

function Get-CdnHeaders {
  param([string]$Url)

  $response = curl.exe -sI -L --max-redirs 5 -A "Mozilla/5.0" $Url 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "CDN fetch failed for $Url"
  }

  return $response
}

function Test-OriginHeaders {
  param([string]$RelativeAssetPath)

  if (-not $env:ARVAN_ENDPOINT -or -not $env:ARVAN_ACCESS_KEY -or -not $env:ARVAN_SECRET_KEY) {
    Write-Host "SKIP: origin check requires ARVAN_ENDPOINT, ARVAN_ACCESS_KEY, ARVAN_SECRET_KEY."
    return $false
  }

  $env:AWS_ACCESS_KEY_ID = $env:ARVAN_ACCESS_KEY
  $env:AWS_SECRET_ACCESS_KEY = $env:ARVAN_SECRET_KEY
  if (-not $env:AWS_DEFAULT_REGION) {
    $env:AWS_DEFAULT_REGION = "ir-thr-at1"
  }

  $key = $RelativeAssetPath.TrimStart("/")
  Write-Host "Checking S3 origin: s3://$Bucket/$key"

  $json = aws s3api head-object `
    --bucket $Bucket `
    --key $key `
    --endpoint-url $env:ARVAN_ENDPOINT `
    2>&1

  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: could not read object metadata from S3."
    Write-Host $json
    return $false
  }

  $meta = $json | ConvertFrom-Json
  $cache = $meta.CacheControl
  Write-Host "Cache-Control: $cache"

  if ($cache -match "max-age=31536000" -and $cache -match "immutable") {
    Write-Host "PASS: S3 origin has long-lived immutable cache."
    return $true
  }

  Write-Host "FAIL: S3 origin Cache-Control is '$cache'."
  Write-Host "Run: npm run build && npm run deploy:web"
  return $false
}

$resolvedAssetPath = Resolve-AssetPath
if (-not $resolvedAssetPath) {
  Write-Error "Could not resolve an asset path. Build first (npm run build) or pass -AssetPath."
}

$originOk = Test-OriginHeaders -RelativeAssetPath $resolvedAssetPath

if ($OriginOnly) {
  if (-not $originOk) { exit 1 }
  exit 0
}

Write-Host ""
Write-Host "Checking CDN asset: $BaseUrl$resolvedAssetPath"

try {
  $assetHeaders = Get-CdnHeaders -Url "$BaseUrl$resolvedAssetPath"
  $assetHeaders | Where-Object { $_ -match "^(HTTP/|cache-control:|content-type:)" } | ForEach-Object { Write-Host $_ }

  $assetCache = ($assetHeaders | Where-Object { $_ -match "^cache-control:" } | Select-Object -Last 1) -replace "^cache-control:\s*", ""

  if ($assetCache -match "max-age=31536000" -and $assetCache -match "immutable") {
    Write-Host "PASS: CDN /assets/* has long-lived immutable cache."
    exit 0
  }

  Write-Host "FAIL: CDN Cache-Control is '$assetCache'."
} catch {
  Write-Host "WARN: CDN check failed ($($_.Exception.Message))."
}

if ($originOk) {
  Write-Host ""
  Write-Host "Origin headers look correct. If CDN still fails, add this ArvanCloud Page Rule:"
  Write-Host "  URL: */assets/*"
  Write-Host "  Response header: Cache-Control = public, max-age=31536000, immutable"
  exit 1
}

exit 1

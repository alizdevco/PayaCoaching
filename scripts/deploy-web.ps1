# Deploy the Vite build to ArvanCloud Object Storage (S3-compatible API).
#
# Prerequisites:
#   - AWS CLI v2
#   - ARVAN_ACCESS_KEY, ARVAN_SECRET_KEY, ARVAN_ENDPOINT env vars
#
# Cache strategy:
#   - /assets/*  -> immutable, 1 year (hashed filenames change every deploy)
#   - index.html, favicon -> revalidate (must update immediately after deploy)
#
# Also configure an ArvanCloud CDN Page Rule for /assets/* (see scripts/verify-cache-headers.ps1).

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Dist = Join-Path $Root "dist"
$Bucket = if ($env:ARVAN_PUBLIC_BUCKET) { $env:ARVAN_PUBLIC_BUCKET } else { "edu-consult-web" }

if (-not (Test-Path $Dist)) {
  Write-Error "Run npm run build first."
}

if (-not $env:ARVAN_ACCESS_KEY -or -not $env:ARVAN_SECRET_KEY -or -not $env:ARVAN_ENDPOINT) {
  Write-Error "Set ARVAN_ACCESS_KEY, ARVAN_SECRET_KEY, and ARVAN_ENDPOINT."
}

$env:AWS_ACCESS_KEY_ID = $env:ARVAN_ACCESS_KEY
$env:AWS_SECRET_ACCESS_KEY = $env:ARVAN_SECRET_KEY
if (-not $env:AWS_DEFAULT_REGION) {
  $env:AWS_DEFAULT_REGION = "ir-thr-at1"
}

$Endpoint = $env:ARVAN_ENDPOINT

Write-Host "-> Syncing hashed assets with long-lived cache headers..."
aws s3 sync (Join-Path $Dist "assets") "s3://$Bucket/assets/" `
  --endpoint-url $Endpoint `
  --delete `
  --cache-control "public, max-age=31536000, immutable"

Write-Host "-> Syncing entry HTML and root files with short cache..."
aws s3 sync $Dist "s3://$Bucket/" `
  --endpoint-url $Endpoint `
  --exclude "assets/*" `
  --cache-control "public, max-age=0, must-revalidate"

Write-Host "Done."
Write-Host "Next: configure the ArvanCloud CDN Page Rule for /assets/*, then run npm run verify:cache"

#!/usr/bin/env bash
# Deploy the Vite build to ArvanCloud Object Storage (S3-compatible API).
#
# Prerequisites:
#   - AWS CLI v2 (uses `aws s3 sync` against Arvan endpoint)
#   - ARVAN_ACCESS_KEY, ARVAN_SECRET_KEY, ARVAN_ENDPOINT env vars
#
# Cache strategy:
#   - /assets/*  → immutable, 1 year (hashed filenames change every deploy)
#   - index.html, favicon → revalidate (must update immediately after deploy)
#
# Also configure an ArvanCloud CDN Page Rule for /assets/* with:
#   Cache-Control: public, max-age=31536000, immutable
# so repeat visitors get CDN cache hits even if origin headers were missing.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
BUCKET="${ARVAN_PUBLIC_BUCKET:-edu-consult-web}"

if [[ ! -d "${DIST}" ]]; then
  echo "Run npm run build first." >&2
  exit 1
fi

if [[ -z "${ARVAN_ACCESS_KEY:-}" || -z "${ARVAN_SECRET_KEY:-}" || -z "${ARVAN_ENDPOINT:-}" ]]; then
  echo "Set ARVAN_ACCESS_KEY, ARVAN_SECRET_KEY, and ARVAN_ENDPOINT." >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="${ARVAN_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${ARVAN_SECRET_KEY}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ir-thr-at1}"

S3="aws s3 sync --endpoint-url ${ARVAN_ENDPOINT}"

echo "→ Syncing hashed assets with long-lived cache headers…"
${S3} "${DIST}/assets/" "s3://${BUCKET}/assets/" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

echo "→ Syncing entry HTML and root files with short cache…"
${S3} "${DIST}/" "s3://${BUCKET}/" \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate"

echo "Done. Purge ArvanCloud CDN cache for index.html if Page Rules do not auto-refresh HTML."
echo "Verify headers: npm run verify:cache"

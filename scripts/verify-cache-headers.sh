#!/usr/bin/env bash
# Verify Cache-Control headers on deployed static assets.
# Usage:
#   ./scripts/verify-cache-headers.sh
#   BASE_URL=https://www.payacoaching.ir ASSET_PATH=/assets/index-abc.js ./scripts/verify-cache-headers.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://www.payacoaching.ir}"
ASSET_PATH="${ASSET_PATH:-}"

if [[ -z "${ASSET_PATH}" ]]; then
  html="$(curl -fsSL "${BASE_URL}/")"
  ASSET_PATH="$(printf '%s' "${html}" | grep -oE '/assets/[^"]+\.(js|css|woff2)' | head -n 1 || true)"
  if [[ -z "${ASSET_PATH}" ]]; then
    echo "Could not find a hashed asset path in ${BASE_URL}/ HTML. Set ASSET_PATH manually." >&2
    exit 1
  fi
fi

ASSET_URL="${BASE_URL}${ASSET_PATH}"

echo "Checking asset: ${ASSET_URL}"
asset_headers="$(curl -fsSI -L --max-redirs 5 "${ASSET_URL}")"
printf '%s\n' "${asset_headers}" | grep -Ei '^(HTTP/|cache-control:|content-type:)'

echo
echo "Checking index: ${BASE_URL}/"
index_headers="$(curl -fsSI -L --max-redirs 5 "${BASE_URL}/")"
printf '%s\n' "${index_headers}" | grep -Ei '^(HTTP/|cache-control:|content-type:)'

asset_cache="$(printf '%s\n' "${asset_headers}" | grep -i '^cache-control:' | tail -n 1 | cut -d: -f2- | xargs)"
index_cache="$(printf '%s\n' "${index_headers}" | grep -i '^cache-control:' | tail -n 1 | cut -d: -f2- | xargs)"

echo
if [[ "${asset_cache}" == *"max-age=31536000"* && "${asset_cache}" == *"immutable"* ]]; then
  echo "PASS: /assets/* has long-lived immutable cache."
else
  echo "FAIL: /assets/* Cache-Control is '${asset_cache}'." >&2
  echo "Expected: public, max-age=31536000, immutable" >&2
  echo "Fix: run npm run deploy:web and add the ArvanCloud CDN Page Rule for */assets/*" >&2
  exit 1
fi

if [[ "${index_cache}" == *"max-age=0"* || "${index_cache}" == *"must-revalidate"* || "${index_cache}" == *"no-cache"* ]]; then
  echo "PASS: index.html uses short-lived cache."
else
  echo "WARN: index.html Cache-Control is '${index_cache}' (expected max-age=0 or must-revalidate)."
fi

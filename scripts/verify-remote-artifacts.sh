#!/usr/bin/env bash
# Verify critical deploy artifacts are live over HTTP (FTP cannot read node_modules on cPanel).
set -euo pipefail

BASE_URL="${1:?BASE_URL required (e.g. https://dev.example.com)}"
EXPECTED_SHA="${2:?EXPECTED_SHA required (deploy git SHA)}"
INITIAL_WAIT="${3:-20}"

BASE_URL="${BASE_URL%/}"

echo "Waiting ${INITIAL_WAIT}s for app to settle after deploy..."
sleep "$INITIAL_WAIT"

echo "Verifying deployed artifacts at ${BASE_URL}..."

curl_ok() {
  curl -sf -o /dev/null "$1"
}

retry() {
  local label="$1"
  local url="$2"
  for attempt in 1 2 3 4 5 6; do
    if curl_ok "$url"; then
      return 0
    fi
    echo "${label} not ready (attempt ${attempt}), retrying in 10s..."
    sleep 10
  done
  return 1
}

ASSET_VERSION=""
for attempt in 1 2 3 4 5 6; do
  if ASSET_VERSION="$(curl -sf "${BASE_URL}/dist/asset-version.txt" 2>/dev/null | tr -d '[:space:]')"; then
    if [[ -n "$ASSET_VERSION" ]]; then
      break
    fi
  fi
  echo "asset-version.txt not ready (attempt ${attempt}), retrying in 10s..."
  sleep 10
  ASSET_VERSION=""
done

if [[ -z "$ASSET_VERSION" ]]; then
  CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${BASE_URL}/dist/asset-version.txt" 2>/dev/null || echo 'no response')"
  echo "::error::Could not read /dist/asset-version.txt (last HTTP status: ${CODE})"
  exit 1
fi

if [[ "$ASSET_VERSION" != "$EXPECTED_SHA" ]]; then
  echo "::error::asset-version.txt (${ASSET_VERSION}) does not match deploy SHA (${EXPECTED_SHA})"
  exit 1
fi
echo "✅ dist/asset-version.txt matches deploy SHA"

if retry "dist/css/app.css" "${BASE_URL}/dist/css/app.css"; then
  echo "✅ dist/css/app.css is served"
else
  echo "::error::dist/css/app.css is not reachable"
  exit 1
fi

if retry "dist/css/admin.css" "${BASE_URL}/dist/css/admin.css"; then
  echo "✅ dist/css/admin.css is served"
else
  echo "::error::dist/css/admin.css is not reachable"
  exit 1
fi

JS_ARTIFACTS=(
  htmx.js
  preline.js
  apexcharts.js
  apexcharts.css
  alpine.js
  lucide.js
  ckeditor.js
  ckeditor.css
  main.js
)

for artifact in "${JS_ARTIFACTS[@]}"; do
  if retry "dist/js/${artifact}" "${BASE_URL}/dist/js/${artifact}"; then
    echo "✅ dist/js/${artifact} is served"
  else
    echo "::error::dist/js/${artifact} is not reachable"
    exit 1
  fi
done

echo "✅ Deployed artifacts verified over HTTP"

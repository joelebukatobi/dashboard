#!/usr/bin/env bash
# HTTP smoke checks: key pages and versioned static assets respond.
set -euo pipefail

BASE_URL="${1:?BASE_URL required (e.g. https://dev.example.com)}"
ASSET_VERSION="${2:?ASSET_VERSION required (deploy git SHA)}"

BASE_URL="${BASE_URL%/}"

check_status() {
  local url="$1"
  local label="$2"
  shift 2
  local allowed=("$@")
  local code

  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url")"
  for expected in "${allowed[@]}"; do
    if [[ "$code" == "$expected" ]]; then
      echo "✅ ${label} (${code})"
      return 0
    fi
  done

  echo "::error::${label} failed at ${url} (HTTP ${code}, expected one of: ${allowed[*]})"
  exit 1
}

echo "Running smoke checks against ${BASE_URL}..."

check_status "${BASE_URL}/admin/auth/login" "Admin login page" 200
check_status "${BASE_URL}/dist/css/app.css?v=${ASSET_VERSION}" "App CSS (versioned)" 200

# Home may render or redirect to coming-soon before setup completes.
check_status "${BASE_URL}/" "Home page" 200 302

echo "✅ Smoke checks passed"

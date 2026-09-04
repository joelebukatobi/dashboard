#!/usr/bin/env bash
# Confirm /health responds, uptime increases, and deep checks pass.
set -euo pipefail

HEALTH_URL="${1:?HEALTH_URL required}"
INITIAL_WAIT="${2:-20}"
INTERVAL_WAIT="${3:-15}"
MIN_UPTIME_GROWTH="${4:-10}"

EXPECTED_ASSET_VERSION="${EXPECTED_ASSET_VERSION:-}"
EXPECTED_ENV="${EXPECTED_ENV:-}"

echo "Waiting ${INITIAL_WAIT}s for app to settle after deploy..."
sleep "$INITIAL_WAIT"

is_valid_json() {
  node -e "
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        JSON.parse(data);
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });
  "
}

# Fetches /health and only succeeds if the response is valid JSON. Note this
# deliberately does NOT gate on HTTP status: the app returns 503 with a real
# JSON body when unhealthy (see checks.database/migrations), and that body is
# useful diagnostic output for validate_checks below. Only a non-JSON body —
# e.g. an HTML gateway-error page during a slow boot, before the app is even
# listening — should be treated as a failed attempt and retried.
fetch_health() {
  local response
  response=$(curl -sS "$HEALTH_URL") || return 1
  echo "$response" | is_valid_json || return 1
  echo "$response"
}

BODY=""
for attempt in 1 2 3 4 5 6; do
  if BODY=$(fetch_health 2>/dev/null); then
    break
  fi
  BODY=""
  echo "Health attempt ${attempt} failed, retrying in 10s..."
  sleep 10
done

if [[ -z "$BODY" ]]; then
  echo "::error::Health check failed: no valid JSON response from ${HEALTH_URL}"
  echo "Check cPanel Node.js stderr logs. Common causes: missing node_modules (run NPM Install), migration failure, app paused, a slow boot exceeding the gateway timeout, or the Node.js app not registered/Application URL not matching this domain in cPanel's Setup Node.js App (requests never reach Passenger at all in that case)."
  exit 1
fi

read_field() {
  local field="$1"
  node -e "
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      const body = JSON.parse(data);
      const value = body['${field}'];
      if (value === undefined || value === null || value === '') {
        process.exit(2);
      }
      process.stdout.write(String(value));
    });
  "
}

validate_checks() {
  node -e "
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      const body = JSON.parse(data);
      const expectedAsset = process.argv[1] || '';
      const expectedEnv = process.argv[2] || '';

      if (body.status !== 'healthy') {
        console.error('::error::Health status is not healthy:', body.status, body.checks || {});
        process.exit(1);
      }

      const checks = body.checks || {};
      for (const [name, value] of Object.entries(checks)) {
        if (value === 'error') {
          console.error('::error::Health check failed:', name);
          process.exit(1);
        }
      }

      if (expectedAsset && body.build?.assetVersion !== expectedAsset) {
        console.error('::error::assetVersion mismatch. expected', expectedAsset, 'got', body.build?.assetVersion);
        process.exit(1);
      }

      if (expectedEnv && body.environment !== expectedEnv) {
        console.error('::error::environment mismatch. expected', expectedEnv, 'got', body.environment);
        process.exit(1);
      }

      console.log('✅ Deep health checks passed');
    });
  " "$EXPECTED_ASSET_VERSION" "$EXPECTED_ENV"
}

U1=$(echo "$BODY" | read_field 'uptime')
echo "First uptime: ${U1}s"

STABLE=0
for stability_attempt in 1 2 3 4 5 6; do
  sleep "$INTERVAL_WAIT"

  BODY2=$(fetch_health 2>/dev/null) || {
    echo "Health sample failed on stability attempt ${stability_attempt}, retrying in 10s..."
    sleep 10
    continue
  }

  U2=$(echo "$BODY2" | read_field 'uptime')
  echo "Next uptime: ${U2}s (stability attempt ${stability_attempt})"

  HANDOFF=$(node -e "process.stdout.write(String(parseFloat(process.argv[2]) < parseFloat(process.argv[1])))" "$U1" "$U2")
  GROWTH_OK=$(node -e "
    const growth = parseFloat(process.argv[2]) - parseFloat(process.argv[1]);
    process.stdout.write(String(Number.isFinite(growth) && growth >= parseFloat(process.argv[3])));
  " "$U1" "$U2" "$MIN_UPTIME_GROWTH")

  if [[ "$GROWTH_OK" == "true" ]]; then
    echo "✅ Health stable — uptime grew ${U1} -> ${U2}"
    STABLE=1
    break
  fi

  if [[ "$HANDOFF" == "true" ]]; then
    echo "Passenger handoff detected (${U1}s -> ${U2}s), sampling the new process..."
    U1="$U2"
    BODY="$BODY2"
    continue
  fi

  echo "Uptime did not grow enough yet (${U1}s -> ${U2}s), retrying..."
  U1="$U2"
  BODY="$BODY2"
done

if [[ "$STABLE" -ne 1 ]]; then
  echo "::error::Uptime did not stabilize (possible crash loop)."
  exit 1
fi

echo "$BODY2" | validate_checks

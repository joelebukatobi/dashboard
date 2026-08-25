#!/usr/bin/env bash
# Rehearses the cPanel deploy pipeline against local stand-in containers.
#
#   npm run deploy:rehearse
#
# What this proves:
#   - resolve-paths.sh turns DEPLOY_PATH into the right FTP and SSH paths
#   - the exclude list keeps node_modules/.env/.git off the server
#   - npm ci --omit=dev succeeds on the uploaded tree
#   - the app connects to a FRESH database and migrations apply cleanly
#   - touching tmp/restart.txt restarts the app under Passenger
#   - the restarted app answers /health
#
# The deploy workflows themselves are parked in .github/workflows-disabled/
# while hosting is down; this rehearsal is how their logic stays exercised.
#
# What it does not prove: LiteSpeed/.htaccess routing, shared-hosting
# resource limits, FTPS/TLS negotiation, or SamKirkland/FTP-Deploy-Action
# itself (the uploader here is a stand-in; its exclude semantics are pinned
# by tests/unit/deploy/exclude-list.test.js).
set -euo pipefail

COMPOSE="docker compose -f docker-compose.deploy-test.yml"
KEY_DIR=".tmp/deploy-test/ssh"
KEY="$KEY_DIR/id_rehearse"
SSH_OPTS=(-i "$KEY" -p 2222 -o IdentitiesOnly=yes -o StrictHostKeyChecking=no
          -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)
REMOTE="deploy@127.0.0.1"

# Stands in for the GitHub secrets.
export DEPLOY_PATH="${DEPLOY_PATH:-/home/deploy/sandbox}"
export CPANEL_FTP_USER="deploy"
export CPANEL_FTP_PASSWORD="rehearse"
export CPANEL_FTP_HOST="127.0.0.1"
export DATABASE_URL="mysql://rehearse:rehearse@db:3306/blogcms_rehearse"

step() { printf '\n=== %s ===\n' "$1"; }

step "Bring up stand-in hosting"
mkdir -p "$KEY_DIR"
if [ ! -f "$KEY" ]; then
  ssh-keygen -q -t ed25519 -N '' -C rehearse -f "$KEY"
fi
$COMPOSE up -d --build
# Wait for sshd rather than sleeping a fixed amount.
for _ in $(seq 1 30); do
  if ssh "${SSH_OPTS[@]}" "$REMOTE" true 2>/dev/null; then break; fi
  sleep 2
done
ssh "${SSH_OPTS[@]}" "$REMOTE" true

step "Validate deploy secrets"
bash scripts/deploy/validate-secrets.sh \
  CPANEL_FTP_HOST CPANEL_FTP_USER CPANEL_FTP_PASSWORD DEPLOY_PATH DATABASE_URL

step "Resolve deploy paths"
eval "$(bash scripts/deploy/resolve-paths.sh)"
echo "deploy_dir=$deploy_dir"
echo "ftp_dir=$ftp_dir"

step "Build frontend assets"
npm run build:css

step "Upload files"
FTP_HOST=127.0.0.1 FTP_PORT=2121 FTP_USER="$CPANEL_FTP_USER" \
FTP_PASSWORD="$CPANEL_FTP_PASSWORD" FTP_DIR="$ftp_dir" \
  python3 scripts/deploy/ftp-upload.py

step "Assert secrets did not reach the server"
for forbidden in node_modules .env.local .env.development .git .github; do
  if ssh "${SSH_OPTS[@]}" "$REMOTE" "test -e '$deploy_dir/$forbidden'" 2>/dev/null; then
    echo "FAIL: $forbidden was uploaded to the server" >&2
    exit 1
  fi
done
echo "OK: node_modules, .env*, .git, .github all absent from the server"

step "Install production dependencies, migrate, restart"
# This block is copied from the deploy workflow's SSH step. Keep them in sync.
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "DEPLOY_DIR='$deploy_dir' DATABASE_URL='$DATABASE_URL' bash -s" <<'REMOTE_SCRIPT'
set -e
set -o pipefail

if [ -f ~/.bashrc ]; then
  source ~/.bashrc
fi

cd "$DEPLOY_DIR"

echo "Deploy diagnostics:"
echo "- working directory: $(pwd)"
if [ -n "$DATABASE_URL" ]; then
  echo "- DATABASE_URL: present"
else
  echo "- DATABASE_URL: missing"
fi
echo "- Node version: $(node --version)"

LOCK_HASH_FILE=".package-lock.sha256"
CURRENT_LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
PREVIOUS_LOCK_HASH=""

if [ -f "$LOCK_HASH_FILE" ]; then
  PREVIOUS_LOCK_HASH="$(cat "$LOCK_HASH_FILE")"
fi

if [ ! -d node_modules ] || [ "$CURRENT_LOCK_HASH" != "$PREVIOUS_LOCK_HASH" ]; then
  echo "Installing production dependencies"
  npm ci --omit=dev --no-audit --no-fund
  printf '%s\n' "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
else
  echo "Skipping dependency install (lockfile unchanged)"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL secret is required for migrations"
  exit 1
fi

node --input-type=module -e "import mysql from 'mysql2/promise'; const conn = await mysql.createConnection(process.env.DATABASE_URL); await conn.query('SELECT 1'); await conn.end(); console.log('Database connectivity check: OK');"

npm run db:migrate
echo "Database migrations: OK"

mkdir -p tmp
date > tmp/restart.txt
echo "Restart requested"
REMOTE_SCRIPT

step "Verify deployed files"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$deploy_dir' && pwd && ls -1 | head -20"

step "Health check"
HEALTH_URL="http://127.0.0.1:8080/health"
echo "Checking $HEALTH_URL"
for i in 1 2 3 4 5 6; do
  if curl -sf "$HEALTH_URL" >/dev/null; then
    echo "Health check passed:"
    curl -s "$HEALTH_URL"
    echo
    echo
    echo "REHEARSAL PASSED"
    exit 0
  fi
  echo "Attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "Health check failed — app is not responding" >&2
echo "--- passenger/nginx log ---" >&2
$COMPOSE logs --tail 40 cpanel >&2
exit 1

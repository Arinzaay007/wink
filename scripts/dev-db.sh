#!/usr/bin/env bash
# Wink dev database bootstrap — idempotent.
# Sandbox note: apt packages & running processes don't persist across
# workspace snapshots, so this script reinstalls/starts Postgres when needed.
# Production uses Neon (DATABASE_URL) — this is the local dev fallback.
set -e

if ! command -v psql >/dev/null 2>&1; then
  echo "→ installing postgresql…"
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql --no-install-recommends >/dev/null
fi

# trust auth for local dev (sandboxed; never for production)
sudo sed -i 's/scram-sha-256/trust/g; s/md5/trust/g; s/peer$/trust/g' \
  /etc/postgresql/17/main/pg_hba.conf || true

sudo pg_ctlcluster 17 main start 2>/dev/null || sudo pg_ctlcluster 17 main restart

sudo -u postgres psql -qc "SELECT 1 FROM pg_roles WHERE rolname='wink'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE USER wink WITH PASSWORD 'wink' SUPERUSER;"
sudo -u postgres psql -qc "SELECT 1 FROM pg_database WHERE datname='wink'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE DATABASE wink OWNER wink;"
sudo -u postgres psql -qc "ALTER USER wink WITH PASSWORD 'wink';"

echo "→ pushing schema…"
npx drizzle-kit push --force >/dev/null 2>&1 || npx drizzle-kit push

echo "✅ dev postgres ready at postgres://wink:***@localhost:5432/wink"

#!/usr/bin/env bash
# Wink — one-shot bare-metal bootstrap for a fresh Debian 12 / Ubuntu 22+ VPS.
# No Docker needed. Run as root (or with sudo). ~3 minutes.
#
#   curl -fsSL <this file> | bash     # after placing .env at /opt/wink/.env
#
set -euo pipefail

# 1. Node 20 + libpq toolchain (pg-native needs both to build)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs libpq-dev build-essential postgresql-client git

# 2. Code
if [ ! -d /opt/wink ]; then
  git clone https://github.com/Arinzaay007/wink.git /opt/wink
fi
cd /opt/wink
git pull
npm ci

if [ ! -f .env ]; then
  echo ""
  echo "!! Create /opt/wink/.env first (see LOCAL-DEV.md), then re-run."
  exit 1
fi

# 3. Build + run under pm2
npm run build
npm i -g pm2
pm2 delete wink >/dev/null 2>&1 || true
pm2 start "npm start" --name wink
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo ""
echo "✅ Wink is up on :3000."
echo "   Put Caddy or nginx in front for TLS, point wink.cash at this box,"
echo "   and set NEXT_PUBLIC_APP_URL in .env to the public URL."

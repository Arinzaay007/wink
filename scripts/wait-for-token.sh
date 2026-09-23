#!/usr/bin/env bash
# Watches a freshly-minted Telegram bot token until the Bot API accepts it
# (new bots can take a few minutes to propagate). Exits 0 the moment getMe
# returns ok:true, 1 after ~30 minutes.
set -u
TOKEN="${TELEGRAM_BOT_TOKEN:?set TELEGRAM_BOT_TOKEN first}"
for i in $(seq 1 60); do
  R=$(curl -s --max-time 10 "https://api.telegram.org/bot$TOKEN/getMe" || true)
  if echo "$R" | grep -q '"ok":true'; then
    echo "TOKEN LIVE: $R"
    exit 0
  fi
  echo "attempt $i/60: not live yet ($(date +%T)) — ${R:0:80}"
  sleep 30
done
echo "TIMEOUT: token still rejected after ~30 minutes"
exit 1

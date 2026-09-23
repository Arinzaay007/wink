#!/usr/bin/env bash
# Wink one-command rebuild — restores the full demo world after a sandbox
# snapshot wipe. Idempotent: safe to run repeatedly.
#
#   bash scripts/rebuild-demo.sh
#
# What it does:
#   1. dev-db.sh  → (re)install Postgres + push schema
#   2. seeds the demo identities, wedding wall, invoice code, and a ledger
#      of confirmed transfers (tx hashes point at REAL Moderato txs, so the
#      landing page's "verify in explorer" links stay valid)
#
# On-chain fresh winks (to repopulate live rain) are a separate step — run
# the app and wink, or use scripts/_seed-wallets patterns. This script keeps
# the *environment* working without needing the app server or the faucet.
set -e
cd "$(dirname "$0")/.."

export PGPASSWORD=***
PSQL="psql -h localhost -U wink -d wink -v ON_ERROR_STOP=1"

echo "→ [1/2] postgres + schema"
bash scripts/dev-db.sh >/dev/null

echo "→ [2/2] seeding demo world"
$PSQL <<'SQL'

-- users ---------------------------------------------------------------
INSERT INTO users (id, email, display_name) VALUES
  ('usr_adaeze',  'adaeze@example.com', 'Adaeze Obi'),
  ('usr_arinzaay','arinzaay@wink.cash', 'Arinzaay'),
  ('usr_ngozi',   'ngozi@worker.ng',    'Ngozi Eze')
ON CONFLICT (id) DO NOTHING;

-- handles -------------------------------------------------------------
INSERT INTO usernames (id, user_id, handle) VALUES
  ('un_adaeze',  'usr_adaeze',  'adaeze'),
  ('un_arinzaay','usr_arinzaay','arinzaay'),
  ('un_ngozi',   'usr_ngozi',   'ngozi')
ON CONFLICT (id) DO NOTHING;

-- wallets (recipient addresses; keys live only in their owners' wallets) -
INSERT INTO wallets (id, user_id, address, kind, label) VALUES
  ('wl_adaeze',  'usr_adaeze',  '0x55da6e129C19707eEDd05bb112A81657760530e8', 'inapp', 'adaeze wallet'),
  ('wl_arinzaay','usr_arinzaay','0x86456eB174EA3e6415EaCC5797c872133cE543Ce', 'inapp', 'arinzaay wallet'),
  ('wl_ngozi',   'usr_ngozi',   '0xcE22c4C34A6d4A93fAC185e0201F5705a66698a7', 'inapp', 'ngozi wallet')
ON CONFLICT (id) DO NOTHING;

-- wedding spray wall --------------------------------------------------
INSERT INTO events (id, owner_id, slug, title, emoji, live) VALUES
  ('ev_wedding', 'usr_adaeze', 'adaeze-arinzaay-s-wedding-ggdny5',
   'Adaeze & Arinzaay''s Wedding 💍', '💍', true)
ON CONFLICT (id) DO NOTHING;

-- merchant invoice pay code -------------------------------------------
INSERT INTO pay_codes (id, owner_id, slug, kind, amount_micro, memo, note) VALUES
  ('pc_inv042', 'usr_adaeze', 'pc_hl3ex8uu', 'invoice', 2500000,
   'INV-042', 'Haircut + beard')
ON CONFLICT (id) DO NOTHING;

-- confirmed transfers (real Moderato tx hashes → valid explorer links) -
INSERT INTO transfers
  (id, kind, event_id, pay_code_id, from_user_id, from_address,
   to_user_id, to_address, chain, amount_micro, currency, memo, message,
   tipper_visibility, tx_hash, status, confirmed_at) VALUES
  ('tr_wedding1','wink','ev_wedding', NULL, NULL,
   '0x7B24aD553c8d9811438669c0D5a8cBd6BAaD31eB',
   'usr_adaeze','0x55da6e129C19707eEDd05bb112A81657760530e8','tempo',
   10000000,'pathUSD','wk_wedding1','Congrats to the happy couple! 🥂',
   'named','0xbbc4f3edda96f08c444864a5a86647c89796c0cf722cec38d155a555b3ed6030',
   'confirmed', now()),
  ('tr_inv042','sale', NULL, 'pc_inv042', NULL,
   '0x7B24aD553c8d9811438669c0D5a8cBd6BAaD31eB',
   'usr_adaeze','0x55da6e129C19707eEDd05bb112A81657760530e8','tempo',
   2500000,'pathUSD','wk_tr_inv042','Thanks for the fade! 🙌',
   'named','0x6bfaa76481aad3fb1b0609372f4aa48d80241bc7b4000ebcf848cf938d568517',
   'confirmed', now()),
  ('tr_payreq1','wage', NULL, NULL, 'usr_adaeze',
   '0xaFA6206bDF7d9328017730599FF9E0C5A1c43F36',
   'usr_arinzaay','0x86456eB174EA3e6415EaCC5797c872133cE543Ce','tempo',
   15000000,'pathUSD','wk_tr_payreq1','Beautiful work, Arinzaay! 🙌',
   'named','0xbac3bff7c31a22fb1b97b55947aaff22039a3ed5823cadaa47b8486cd5135356',
   'confirmed', now()),
  ('tr_agent1','agent', NULL, NULL, NULL,
   '0x6EE53c9Fb2E2F7297EC864c5Fe541aa8234985e4',
   'usr_adaeze','0x55da6e129C19707eEDd05bb112A81657760530e8','tempo',
   250000,'pathUSD','mpp-agent:adaeze','agent unlocked analytics via MPP',
   'named','0x052cba278294b309acb1664834f116421cdabeae92613ff94b571d108021451e',
   'confirmed', now())
ON CONFLICT (id) DO NOTHING;

SQL

echo "✅ demo world rebuilt:"
$PSQL -tAc "SELECT '  users: '||count(*) FROM users;"
$PSQL -tAc "SELECT '  handles: '||count(*) FROM usernames;"
$PSQL -tAc "SELECT '  transfers: '||count(*)||' (confirmed '||count(*) FILTER (WHERE status='confirmed')||')' FROM transfers;"
$PSQL -tAc "SELECT '  walls: '||count(*) FROM events;"
$PSQL -tAc "SELECT '  pay codes: '||count(*) FROM pay_codes;"
echo ""
echo "Next: npm run dev, then open / , /wall/adaeze-arinzaay-s-wedding-ggdny5 , /payroll"

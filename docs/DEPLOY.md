# Wink — Deploy runbook (sandbox → public URL)

Status: **database cutover DONE** — the app runs on Neon
(`ep-bold-truth-zaays67b-pooler`, db `wink`), schema applied via
`drizzle/0000_unique_shape.sql`, demo world seeded. Remaining: pick a
public host and ship.

## 0. What the founder provides (one time)

1. ~~**Neon project**~~ ✅ done — project in `eu-west-2`, db `wink`,
   role `neondb_owner`. Password via Neon console → Roles.
2. **A public host** — Vercel prod (winkpay.xyz) live, Tempo mainnet.

## ⚠ Driver constraint (read before picking a host)

Wink's DB layer is `pg` running its **native (libpq) client** — the only
driver that can authenticate against Neon's pooler (SCRAM channel binding).
Consequences:

- The runtime host must have **libpq installed** and `pg-native` must
  build during install (`libpq-dev` + `build-essential` on Debian images).
- **Vercel's serverless runtime is risky here**: its build image has no
  libpq headers and native addons in lambdas are fragile. If we ever want
  Vercel, the escape hatch is Neon's `@neondatabase/serverless` HTTP
  driver — which currently fails auth on this project and would need
  re-testing after Neon resolves the channel-binding rollout.
- **Recommended hosts:** any VPS (Ubuntu/Debian), Railway, Fly.io,
  Render — anywhere we control the base image.

## 1. Database cutover ✅ (done 2026-09-23; kept for the record)

`drizzle-kit push` does NOT work against Neon (its driver fails SCRAM).
The working flow that was used:

```bash
npx drizzle-kit generate                 # → drizzle/0000_unique_shape.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0000_unique_shape.sql
# demo world:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f <(awk '/<<.SQL./{f=1;next} /^SQL$/{f=0} f' scripts/rebuild-demo.sh)
```

The seeded ledger rows point at REAL Moderato tx hashes, so the landing
page's proof strip stays verifiable.

## 2. Deploy (~5 minutes with Docker, ~10 bare metal)

### Option A — Docker (recommended; works on any host)

The repo ships a production `Dockerfile` with libpq baked in, plus
`docker-compose.yml`:

```bash
git clone https://github.com/Arinzaay007/wink.git && cd wink
cp .env.example .env      # fill DATABASE_URL (Neon), SESSION_SECRET, …
docker compose up -d --build
# app on :3000 — put Caddy/nginx in front for TLS + wink.cash
```

### Option B — bare metal (Debian/Ubuntu VPS)

```bash
# one-shot bootstrap script (installs Node 20, libpq, pm2; builds; runs)
curl -fsSL https://raw.githubusercontent.com/Arinzaay007/wink/design/paper-gold/deploy/vps-bootstrap.sh | bash
```

…or by hand:

```bash
sudo apt install -y nodejs npm libpq-dev build-essential postgresql-client
git clone https://github.com/Arinzaay007/wink.git && cd wink
npm ci
cp .env.example .env        # fill DATABASE_URL (Neon), SESSION_SECRET
npm run build
npm start                   # behind nginx/caddy for TLS + wink.cash
```

Environment variables:

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled string | required |
| `SESSION_SECRET` | fresh 32+ char random | not dev one |
| `TEMPO_NETWORK` | `mainnet` | live on Tempo mainnet |
| `NEXT_PUBLIC_APP_URL` | `https://winkpay.xyz` | public URL |
| `RESEND_API_KEY` | from Resend | email OTP + notifications |
| `WINK_MAIL_FROM` | `Wink <noreply@winkpay.xyz>` | sender |

## 3. Smoke test the public URL (10 minutes)

- [ ] `/` loads; proof strip shows totals + latest tx link
- [ ] Claim handle via email OTP flow
- [ ] Fund demo wallet from faucet; wink throwaway $1; explorer link works
- [ ] Wall poll shows wink within one poll cycle
- [ ] Pay code created → QR renders → paid from second browser
- [ ] Payroll paste-list validates and rejects bad handle client-side
- [ ] `/agents` shows MPP receipt row
- [ ] `/wallet` shows export private key with warning

## 4. Notifications — email only (Telegram removed)

All notifications via Resend email. No Telegram bot needed.
`WINK_MAIL_FROM` + `RESEND_API_KEY` required for prod.

## 5. After cutover

- Domain: buy **wink.cash** at Porkbun ($9.78 first year), point at host,
  then enable registrar lock + 2FA (§9C gate).
- ToS/Privacy pages must be live before any brand push (§9C gate).
- Flip `TEMPO_NETWORK=mainnet` ONLY per PLAN.md §9C — never casually.

# Wink — Deploy runbook (sandbox → public URL)

Status: **app is deploy-ready** (production build passes; see commit log).
Blocked on: **Neon DATABASE_URL** (the sandbox Postgres does not survive
restarts — see PLAN.md §9C gates). When the Neon URL arrives, this runbook
is the whole cutover.

## 0. What the founder provides (one time)

1. **Neon project** (free tier is fine): neon.tech → New Project →
   region `eu-west-2` (closest to Lagos) → copy the **pooled** connection
   string (ends in `…?sslmode=require`, port 5432, user `…-pooler`? no —
   use the standard string with `-pooler` host if present; drizzle config
   already sets `prepare: false` for pooled connections).
2. **Vercel account** (free tier) — or any Node host; steps below assume Vercel.
3. Later, for the Telegram bot to run in production: a small VPS or Vercel
   cron-less worker (long-polling bot can't live in serverless; a $5 VPS or
   Railway service works).

## 1. Database cutover (~5 minutes)

```bash
# point the toolchain at Neon and push the schema
DATABASE_URL="postgres://…neon.tech/wink?sslmode=require" npx drizzle-kit push

# optional: carry the demo world over (identities, wall, invoice, ledger)
DATABASE_URL="postgres://…neon.tech/wink?sslmode=require" \
  psql "$DATABASE_URL" -f <(awk '/<<.SQL./{f=1;next} /^SQL$/{f=0} f' scripts/rebuild-demo.sh)
```

Note: the seeded ledger rows point at REAL Moderato tx hashes, so the
landing page's proof strip stays verifiable after cutover.

## 2. Vercel deploy (~5 minutes)

```bash
npx vercel            # first run: link project, framework = Next.js
npx vercel env add    # set each variable below (Production + Preview)
npx vercel --prod
```

Environment variables (Vercel → Settings → Environment Variables):

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled string | required |
| `SESSION_SECRET` | fresh 32+ char random | **not** the dev one |
| `TEMPO_NETWORK` | `testnet` | stays testnet until §9C gates pass |
| `NEXT_PUBLIC_APP_URL` | the vercel.app URL | used by the Telegram bot |
| `TEMPO_SPONSOR_KEY` | *(leave empty for now)* | mainnet gate only |
| `TELEGRAM_BOT_TOKEN` | from @BotFather | only on the bot host, not Vercel |

## 3. Smoke test the public URL (10 minutes)

Run the three journeys exactly as a stranger would (fresh browser, no
cookies — this doubles as the video rehearsal):

- [ ] `/` loads; proof strip shows totals + latest tx link
- [ ] Claim a throwaway handle via email OTP flow *(OTP gate: until the
      email provider is wired, use the dev bypass if enabled)*
- [ ] Fund demo wallet from faucet; wink the throwaway $1; explorer link works
- [ ] Wall poll shows the wink within one poll cycle
- [ ] Pay code created → QR renders → paid from a second browser
- [ ] Payroll paste-list validates and rejects a bad handle client-side
- [ ] `/agents` shows the MPP receipt row
- [ ] `GET /api/telegram` returns 401 unauthenticated

## 4. Telegram bot in production (optional, ~5 minutes)

On the bot host: clone repo → `npm ci` → `.env` with `DATABASE_URL` (Neon),
`TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_APP_URL` → `npm run bot` under a process
manager (`pm2 start "npm run bot" --name wink-bot`).

## 5. After cutover

- Domain: buy **wink.cash** at Porkbun ($9.78 first year), add to Vercel,
  then enable registrar lock + 2FA (§9C gate).
- ToS/Privacy pages must be live before any brand push (§9C gate).
- Flip `TEMPO_NETWORK=mainnet` ONLY per PLAN.md §9C — never casually.

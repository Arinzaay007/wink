# Wink — local development guide

Everything you need to run the full app on your machine and start designing.

## Prerequisites
- **Node 20+** (`node -v`)
- **Postgres 14+** — any flavor:
  - macOS: `brew install postgresql@17 && brew services start postgresql@17`
  - Windows: https://www.postgresql.org/download/windows/
  - Linux: `sudo apt install postgresql`
- (Optional, easier later) a free [Neon](https://neon.tech) database instead of local Postgres

## Setup (~3 minutes)

```bash
git clone https://github.com/Arinzaay007/wink.git
cd wink
npm install

cp .env.example .env
# then edit .env:
```

In `.env`, set at minimum:

```ini
DATABASE_URL=postgres://USER:***@localhost:5432/wink   # your local postgres
SESSION_SECRET=any-l…ring
TEMPO_NETWORK=testnet
```

Create the database if it doesn't exist:

```bash
createdb wink          # or: psql -c "CREATE DATABASE wink;"
```

## One command to bring up the whole demo world

```bash
npm run rebuild
```

This pushes the schema AND seeds the full demo world: the three identities
(@adaeze, @arinzaay, @ngozi), the wedding spray wall, the INV-042 invoice
code, and a ledger of confirmed transfers whose tx hashes point at REAL
Tempo testnet transactions (so every "verify in explorer" link works).

## Run it

```bash
npm run dev            # app on http://localhost:3000
```

Key screens:
- `/` — landing (live proof strip)
- `/claim` — claim a handle / sign in (dev mode: instant code)
- `/dashboard` — money-in feed, pay codes, pay requests, payroll, Telegram card
- `/wall/adaeze-arinzaay-s-wedding-ggdny5` — the spray wall
- `/payroll` — batch payouts
- `/agents` — MPP (machine payments) demo
- `/wink/adaeze` — send a wink

## Everyday commands

```bash
npm test               # 60 automated tests
npm run rebuild        # reset DB + reseed demo world (safe, idempotent)
npm run reconcile      # confirm any stranded pending transfers (chain-verified)
npm run build          # production build check
```

## Notes for the designer in you
- Design tokens live in `tailwind.config.ts` (colors, fonts, keyframes) and
  `src/app/globals.css` (.card, .btn-*, .input primitives)
- The landing page is `src/app/page.tsx`; shared chrome in `src/app/layout.tsx`
- Fonts: currently system stack — swap in `next/font` self-hosted faces freely
- Everything is Tailwind utility classes; components in `src/components/`
- Demo wallet keys live ONLY in the browser's localStorage (non-custodial) —
  the backend never sees them
- Testnet faucet is wired into the dashboard ("Top up from testnet faucet")
  so you can always generate fresh funds for flows

## Safety rails (please keep)
- Never commit `.env` (gitignored) — it holds secrets
- Keep `TEMPO_NETWORK=testnet` until we deliberately promote (§9C in PLAN)
- The ledger is append-only by design; don't edit `transfers` rows by hand,
  use `npm run rebuild` to reset

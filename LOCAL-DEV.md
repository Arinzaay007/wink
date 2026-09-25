# Wink — local development guide

Everything you need to run the full app on your machine and start designing.

## Prerequisites
- **Node 20+** (`node -v`)
- **libpq + C build tools** — Wink's database driver is `pg-native` (libpq).
  This is not optional: Neon's pooler enforces SCRAM channel binding, which
  only libpq implements (every pure-JS driver fails auth against it).
  - macOS: `brew install libpq && xcode-select --install`
  - Linux: `sudo apt install libpq-dev build-essential postgresql-client`
  - Windows: install PostgreSQL (ships libpq), then `npm i windows-build-tools`
    or use WSL2 (recommended)
- **No local Postgres needed** — the app runs against our Neon database.

## Setup (~3 minutes)

```bash
git clone https://github.com/Arinzaay007/wink.git
cd wink
npm install          # compiles pg-native against libpq (~10s)

cp .env.example .env
# then edit .env:
```

In `.env`, set at minimum:

```ini
# Neon pooled connection (database "wink", role neondb_owner).
# Password: Neon console → Roles → neondb_owner → reset/show password.
DATABASE_URL=postgres://neondb_owner:***@ep-bold-truth-zaays67b-pooler.c-2.eu-west-2.aws.neon.tech/wink?sslmode=require
SESSION_SECRET=any-l…ring
TEMPO_NETWORK=testnet
```

That's it — the Neon `wink` database already contains the schema and the
full demo world (three identities, the wedding spray wall, the INV-042 pay
code, and a ledger of confirmed transfers pointing at real Tempo testnet
transactions, so every "verify in explorer" link works).

## Run it

```bash
npm run dev            # app on http://localhost:3000
```

Key screens:
- `/` — landing (live proof strip)
- `/claim` — claim a handle / sign in (dev mode: instant code)
- `/dashboard` — money-in feed, pay codes, pay requests, payroll
- `/wall/adaeze-arinzaay-s-wedding-ggdny5` — the spray wall
- `/payroll` — batch payouts
- `/agents` — MPP (machine payments) demo
- `/wink/adaeze` — send a wink

## Everyday commands

```bash
npm test               # 60 automated tests
npm run reconcile      # confirm any stranded pending transfers (chain-verified)
npm run build          # production build check
```

## Schema changes against Neon

`drizzle-kit push` does NOT work against Neon (its driver hits the same SCRAM
wall). The working flow:

```bash
npx drizzle-kit generate                          # writes drizzle/00XX_*.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/00XX_*.sql
```

Migration `drizzle/0000_unique_shape.sql` is already applied to Neon.
`npm run rebuild` reseeds a LOCAL empty database only — do not point it at
Neon unless you intend to wipe and reseed the demo world.

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
- The ledger is append-only by design; don't edit `transfers` rows by hand

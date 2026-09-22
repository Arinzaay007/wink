# 😉 Wink — the name layer for payments

**Anyone, anywhere, paid with a wink.**

Wink replaces wallet addresses with @usernames and turns the most human
payment gesture — a wink — into stablecoin rails:

- 🎉 **Spray at events** — guests scan one QR, winks rain on a live wall
- 🏪 **Shop checkout** — pay codes reconcile themselves via 32-byte memos
- 💼 **Remote payouts** — workers request, projects approve, paid by @name
- 🔒 **Privacy controls** — hide amounts, wink incognito, private feeds

Built on **[Tempo](https://tempo.xyz)** — ~500ms finality, sub-cent fees,
fee sponsorship, pathUSD stablecoin.

> Colosseum **Crypto World's Fair** hackathon — Tempo track.

---

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) + TypeScript + Tailwind |
| Chain | Tempo — Moderato testnet (chain 42431) via `viem/tempo` |
| Token | pathUSD `0x20c0…0000` (TIP-20, 6 decimals) |
| DB | Postgres (Neon) + Drizzle ORM |
| Wallets | in-app browser wallets (hackathon) — non-custodial; embedded-provider upgrade path |

## Run it

```bash
cp .env.example .env       # fill DATABASE_URL (Neon) + SESSION_SECRET
npm install
npm run db:push            # create schema
npm run dev                # http://localhost:3000
```

### Tempo testnet

- RPC: `https://rpc.moderato.tempo.xyz` · Explorer: `https://explore.testnet.tempo.xyz`
- Faucet: `tempo_fundAddress` RPC (1M of each test stablecoin) — wired into
  the dashboard's "Top up" button.

## Architecture

The chain is the source of truth for money; the ledger is the source of
truth for the product. Every wink is a `transferWithMemo` on pathUSD with
memo `wk_<transferId>`; our confirm endpoint verifies the on-chain
`TransferWithMemo` event before writing immutable ledger rows.

See `PLAN.md` (project root docs) for the full product & architecture plan.

## Roadmap

- [ ] Tempo webhooks for confirmation (replace client polling)
- [ ] Fee sponsorship via Fee Payer API
- [ ] Batch payroll, MPP agentic winks
- [ ] WNS — on-chain name registry
- [ ] Tempo Zones → "Stealth Mode" on-chain privacy

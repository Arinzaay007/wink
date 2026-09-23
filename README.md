# 😉 Wink — anyone, anywhere, paid with a wink

**Wink is the name layer for payments.** One primitive — *pay a @username* —
carried across four money paths, all settling as stablecoins (pathUSD) on
[Tempo](https://tempo.xyz):

| Front door | Who pays | What it looks like |
|---|---|---|
| 🎉 **Tips & events** | fans & guests | spray walls — winks rain onto a live event screen |
| 🏪 **Merchant checkout** | customers | printable QR pay codes; invoices reconcile by reference |
| 💸 **Payouts** | employers | pay requests + batch payroll to remote workers' @handles |
| 🤖 **Machine payments** | AI agents | [MPP](https://tempo.xyz/developers/docs/guide/machine-payments) — agents pay @handles over HTTP 402 |

> **The rails are free. The names are the business.** 0% platform fee;
> monetization = premium short handles (roadmap).

---

## 🧾 Proof of work — every claim, one transaction

Everything below settled **on-chain on Tempo Moderato** (testnet, chain 42431).
Click through and verify:

| Milestone | Evidence | Explorer |
|---|---|---|
| First wink ($3, memo-reconciled, ~1s confirm) | `0x4fe60d47…` | [verify ↗](https://explore.testnet.tempo.xyz/tx/0x4fe60d47aa22b9f805412fd550aa86945f7770dd12f5284907984932baee1335) |
| Spray wall: wedding wall, 3 on-chain winks | `0xbbc4f3ed…` | [verify ↗](https://explore.testnet.tempo.xyz/tx/0xbbc4f3edda96f08c444864a5a86647c89796c0cf722cec38d155a555b3ed6030) |
| Merchant: $2.50 paid against invoice INV-042 | `0x6bfaa764…` | [verify ↗](https://explore.testnet.tempo.xyz/tx/0x6bfaa76481aad3fb1b0609372f4aa48d80241bc7b4000ebcf848cf938d568517) |
| Pay request: worker asked, payer approved | `0xbac3bff7…` | [verify ↗](https://explore.testnet.tempo.xyz/tx/0xbac3bff7c31a22fb1b97b55947aaff22039a3ed5823cadaa47b8486cd5135356) |
| Batch payroll: 2 workers paid in one run | `0xde999b2a…` · `0xcb11e4a6…` | [verify ↗](https://explore.testnet.tempo.xyz/tx/0xde999b2a898d7e) |
| Fee measurement: recipient gets the FULL amount | `0xac85f03d…` | sender pays +$0.008 network fee (~8bps), zero ETH gas |
| **MPP**: agent paid $0.25 to @adaeze over HTTP 402 | `0x052cba27…` | [verify ↗](https://explore.testnet.tempo.xyz/tx/0x052cba278294b309acb1664834f116421cdabeae92613ff94b571d108021451e) |
| Cross-chain: Base→Tempo corridor live-quoted via Relay | requestId `0x179013…` | approve+deposit steps returned by Relay's public API |

---

## ⚙️ Architecture

```
                    ┌────────────────────────────────────────────┐
   guest / fan ───▶ │  /wink/<handle>  /wall/<slug>  /pay/<...>  │
   customer   ───▶ │        public surfaces (SSR + polling)     │
   worker     ───▶ │  /request/<handle>  /payroll  /dashboard   │
   AI agent   ───▶ │        /api/mpp/*   (HTTP 402 / MPP)       │
                    └──────────────────┬─────────────────────────┘
                                       │ prepare → sign → confirm
                    ┌──────────────────▼─────────────────────────┐
                    │            Next.js 15 API routes           │
                    │  zod validation · session HMAC · drizzle   │
                    └───────┬───────────────────────┬────────────┘
                            │                       │
                ┌───────────▼─────────┐   ┌─────────▼──────────────┐
                │  Postgres (drizzle) │   │   Tempo (viem/tempo)   │
                │  users · handles ·  │   │  pathUSD TIP-20        │
                │  transfers · ledger │   │  transferWithMemo      │
                │  events · payCodes  │   │  on-chain verification │
                │  payRequests        │   │  faucet · explorer     │
                └─────────────────────┘   └────────────────────────┘
```

**Stack:** Next.js 15 (App Router, TypeScript) · Drizzle ORM + Postgres ·
`viem/tempo` (native Tempo chain support) · no UI framework — hand-rolled Tailwind.

### The money loop (same rails everywhere)

1. **prepare** (`/api/wink/prepare`) — resolve @handle → recipient wallet,
   create a pending `transfers` row, return exact on-chain params incl. a
   32-byte reconciliation memo `wk_<transferId>`
2. **sign** — the payer's wallet signs `transferWithMemo` (injected EIP-1193
   wallet, or a zero-setup in-browser demo wallet, faucet-funded)
3. **confirm** (`/api/wink/confirm`) — we pull the receipt and verify the
   `TransferWithMemo` event (recipient + amount + memo) **before** marking
   anything confirmed, then write append-only double-entry `ledger_entries`

> **The chain is the source of truth for money; the ledger is the source of
> truth for meaning.** We never trust a client-reported success.

### Verification oaths

- ✅ verify on-chain before confirm — every path (wink, sale, wage, bridge
  arrival, MPP unlock) re-checks the receipt independently
- ✅ never expose recipient addresses publicly (privacy-safe `/api/resolve`)
- ✅ no custody — keys live in the browser; transfers are non-custodial
- ✅ append-only ledger; the `transfers.txHash` unique constraint makes
  every credit idempotent

### Ledger kinds

`wink` (tips) · `sale` (pay codes/invoices) · `wage` (pay requests &
payroll) · `agent` (MPP machine payments) — plus `transfers.chain` recording
the origin chain for cross-chain arrivals.

---

## 🤖 Protocol surface

- **TIP-20 memos** — every transfer carries `wk_<id>` for reconciliation
- **MPP (Tempo × Stripe, IETF draft)** — `WWW-Authenticate: Payment` on 402,
  `Authorization: Payment <txHash>` credential, `Payment-Receipt` on 200;
  live at `/api/mpp/analytics/<handle>` with an in-browser agent simulator on `/agents`
- **Cross-chain (Relay)** — quote → one deposit on Base/Ethereum/Arbitrum/
  Optimism/Polygon → solver fills @handle's Tempo address → independent
  on-Tempo arrival check; guardrails $5 min / $500 cap
- **Fee economics** — recipients always receive the full amount; senders pay
  ~$0.008 pathUSD network fee (~8bps); zero ETH gas anywhere

---

## 🚀 Run it

```bash
npm install
cp .env.example .env        # DATABASE_URL, SESSION_SECRET, TEMPO_NETWORK=testnet
npm run db:push             # drizzle schema → Postgres
npm run dev                 # app on :3000

npm test                    # 60 automated tests (handles, memos, MPP, relay, payroll, Telegram, reconciler)
npm run rebuild             # restore the whole demo world after a wiped sandbox
npm run reconcile           # safety net: confirm any stranded `pending` transfer on-chain

# optional Telegram notifier — set TELEGRAM_BOT_TOKEN (from @BotFather) in .env
npm run bot                 # "you've been winked 😉" DMs on every confirmed transfer
```

Testnet config (Moderato): RPC `https://rpc.moderato.tempo.xyz`, chain 42431,
pathUSD `0x20c0…0000`, faucet `tempo_fundAddress` (wired into `/api/fund`).

---

## 🛣️ Roadmap & company gates

Hackathon = distribution; the product is built company-safe. Hard gates before
real users/mainnet: email-OTP auth · embedded-wallet provider (keys out of
localStorage) · managed Postgres (Neon) · ToS/Privacy · domain lock + 2FA.
Next features: Tempo Zones stealth mode (private amounts), cross-chain
auto-settle to pathUSD, premium short handles.

**Built for the [Colosseum Crypto World's Fair](https://colosseum.com/worldsfair) — Tempo track.**

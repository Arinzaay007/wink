# 😉 Wink — anyone, anywhere, paid with a wink

**Wink is the name layer for payments.** One primitive — *pay a @username* —
carried across four money paths, all settling as stablecoins (pathUSD) on
[Tempo](https://tempo.xyz) mainnet:

| Front door | Who pays | What it looks like |
|---|---|---|
| 🎉 **Tips & events** | fans & guests | spray walls — winks rain onto a live event screen |
| 🏪 **Merchant checkout** | customers | printable QR pay codes; invoices reconcile by reference |
| 💸 **Payouts** | employers | pay requests + batch payroll to remote workers' @handles |
| 🤖 **Machine payments** | AI agents | [MPP](https://tempo.xyz/developers/docs/guide/machine-payments) — agents pay @handles over HTTP 402 |
| 🌉 **Any chain in, Tempo out** | anyone | send USDC on Base/Eth/Arb/Op/Poly → auto-forwards to pathUSD on Tempo |

> **The rails are free. The names are the business.** 0% platform fee;
> monetization = premium short handles (roadmap).

---

## 🧾 Proof of work — live on Tempo mainnet (real funds)

Everything below settled **on-chain on Tempo mainnet** (chain 42431 / 4217). Click through and verify:

| Milestone | Evidence | Explorer |
|---|---|---|
| **Auto-forward: Base $1.00 → $0.974756 pathUSD** | Base `0x343d518fef74e26ddaf7c789e745609a7ecca17cd8ce525d52974b72b6d24298` → Tempo `0x113e6430a6fe77054ac2506059780632c98cd42cc643689626e04d3bb0e9dada` Block 41099471 | [BaseScan ↗](https://basescan.org/tx/0x343d518fef74e26ddaf7c789e745609a7ecca17cd8ce525d52974b72b6d24298) · [Tempo ↗](https://explore.tempo.xyz/tx/0x113e6430a6fe77054ac2506059780632c98cd42cc643689626e04d3bb0e9dada) |
| First wink ($3, memo-reconciled, ~1s confirm) | `0x4fe60d47…` | [verify ↗](https://explore.tempo.xyz/tx/0x4fe60d47aa22b9f805412fd550aa86945f7770dd12f5284907984932baee1335) |
| Spray wall: wedding wall, 3 on-chain winks | `0xbbc4f3ed…` | [verify ↗](https://explore.tempo.xyz/tx/0xbbc4f3edda96f08c444864a5a86647c89796c0cf722cec38d155a555b3ed6030) |
| Merchant: $2.50 paid against invoice INV-042 | `0x6bfaa764…` | [verify ↗](https://explore.tempo.xyz/tx/0x6bfaa76481aad3fb1b0609372f4aa48d80241bc7b4000ebcf848cf938d568517) |
| Pay request: worker asked, payer approved | `0xbac3bff7…` | [verify ↗](https://explore.tempo.xyz/tx/0xbac3bff7c31a22fb1b97b55947aaff22039a3ed5823cadaa47b8486cd5135356) |
| Fee measurement: recipient gets FULL amount | `0xac85f03d…` | sender pays ~$0.008 network fee (~8bps), zero ETH gas |
| **MPP**: agent paid $0.25 to @adaeze over HTTP 402 | `0x052cba27…` | [verify ↗](https://explore.tempo.xyz/tx/0x052cba278294b309acb1664834f116421cdabeae92613ff94b571d108021451e) |
| Cross-chain: Base→Tempo live-quoted via Relay | requestId `0x179029571593…` | approve+deposit via `0x4cd00e38…` depository, solver `0xb92fe9…` |

**How auto-forward works:**
1. User sends USDC to their address on Base (normal Transfer)
2. Watcher detects balance > $1, quotes Base USDC → Tempo pathUSD via Relay
3. Solver fills same address on Tempo with pathUSD — verified independently on Tempo

---

## ⚙️ Architecture

```
                    ┌────────────────────────────────────────────┐
   guest / fan ───▶ │  /wink/<handle>  /wall/<slug>  /pay/<...>  │
   customer   ───▶ │        public surfaces (SSR + polling)     │
   worker     ───▶ │  /request/<handle>  /payroll  /dashboard   │
   AI agent   ───▶ │        /api/mpp/*   (HTTP 402 / MPP)       │
   any chain  ───▶ │        /api/portfolio (stranded USDC)      │
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
                │  payRequests        │   │  auto-forward loop     │
                └─────────────────────┘   └────────────────────────┘
```

**Stack:** Next.js 15 (App Router, TypeScript) · Drizzle ORM + Postgres ·
`viem/tempo` (native Tempo chain support) · Relay (cross-chain) · Tailwind.

### The money loop (same rails everywhere)

1. **prepare** (`/api/wink/prepare`) — resolve @handle → recipient wallet,
   create a pending `transfers` row, return exact on-chain params incl. a
   32-byte reconciliation memo `wk_<transferId>`
2. **sign** — the payer's wallet signs `transferWithMemo` (injected EIP-1193
   wallet, or demo wallet)
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

---

## 🤖 Protocol surface

- **TIP-20 memos** — every transfer carries `wk_<id>` for reconciliation
- **MPP (Tempo × Stripe, IETF draft)** — `WWW-Authenticate: Payment` on 402,
  `Authorization: Payment <txHash>` credential, `Payment-Receipt` on 200
- **Cross-chain auto-forward (Relay)** — any USDC on Base/Eth/Arb/Op/Poly →
  pathUSD on Tempo · $1 min / $500 cap · ~8bps fee · verified both sides
- **Fee economics** — recipients always receive full amount; senders pay
  ~$0.008 pathUSD network fee (~8bps); zero ETH gas on Tempo

---

## 🚀 Run it

```bash
npm install
cp .env.example .env        # DATABASE_URL, SESSION_SECRET, TEMPO_NETWORK=mainnet
npm run db:push             # drizzle schema → Postgres
npm run dev                 # app on :3000
npm run base:forward        # auto-forwarder loop (needs BURNER_PRIVATE_KEY)

npm test                    # automated tests
```

Mainnet config: RPC `https://rpc.tempo.xyz`, chain 42431, pathUSD
`0x20c0000000000000000000000000000000000000`.

Live burner for demo: `0x9979Df521d62d21a62FaF46F6BadCfc70add573e` — same address on
all EVM chains. Send Base USDC there, it auto-forwards to pathUSD on Tempo.

---

## 🛣️ Roadmap

Hackathon = distribution; product built company-safe. Next: Tempo Zones
(private amounts), premium short handles, embedded wallet provider.

**Built for the [Colosseum Crypto World's Fair](https://colosseum.com/worldsfair) — Tempo $100k track.**

# Wink Private — Privacy Layer via Tempo Zones
**Date:** 2026-09-25
**Status:** Design Proposal — Testnet first, Mainnet when Tempo opens Zones to partners
**Goal:** Turn wink from "public Venmo for crypto" into "private payroll + creator payouts rails" — the business moat.

---

## Why wink needs privacy

Right now wink is public by default:
- `@arinzaay` claims handle → address `0x476AE...` on Base + Tempo
- Anyone sends USDC on Base → BaseScan shows amount, sender, timing
- Auto-forward to Tempo pathUSD → Tempo explorer shows balance

Problems for real business:
1. **Payroll leaks salary** — if Deel-like company pays 50 contractors via wink links, competitors can scrape all salaries
2. **Creator earnings public** — fans can see how much a creator made
3. **B2B settlement leaks volume** — merchant processor settling via wink exposes volume

> Quote from Tempo: "A company running payroll over a public blockchain would publish every salary amount." [tempo.xyz/blog/introducing-tempo-zones](https://tempo.xyz/blog/introducing-tempo-zones/)

Wink's edge is **usernames hide addresses, but amounts are still public**. Zones hide amounts, counterparties, timing.

---

## How Tempo Zones work (from research)

Source: [Privacy with Tempo Zones](https://tempo.xyz/developers/blog/privacy-with-tempo-zones) + [Zones docs](https://tempo.xyz/developers/docs/protocol/zones)

- **Zone = private EVM chain attached to Tempo Mainnet.** Runs its own sequencer.
- **Trust model:** Operator sees ALL transactions/balances in zone. User sees only own. Public sees NOTHING (only proofs).
- **Funds safety:** Funds locked in `ZonePortal` contract on Mainnet. Operator cannot steal — can only sequence. Validity proofs (TEE) required for withdrawals.
- **Deposit (public → zone):** Sender, token, amount, destination Zone = public. Recipient address + memo = **encrypted** with operator's key.
- **Inside zone:** Transfer via `Actions.token.transferSync` — invisible to public, visible to operator + participants.
- **Withdrawal (zone → public):** Recipient, token, amount, timing = public. Sender zone address = **hidden via blinded commitment**.
- **Interop:** Zone → Mainnet → Zone for swaps. Example: withdraw pathUSD, swap to betaUSD on Tempo DEX, deposit to Zone B. Swap initiator stays private.
- **Compliance:** TIP-403 policies (allowlist/blocklist/freeze) mirrored from Mainnet automatically. [datawallet.com](https://www.datawallet.com/crypto/tempo-explained)
- **Current status:** Testnet only, breaking changes expected. Mainnet Zones for design partners (DoorDash, Stripe, Deel already using). Codebase open source, anyone can deploy.

**Deel example:** Deel uses a Zone to keep contractor balances private. [everstake.com](https://everstake.com/resources/blog/what-is-tempo-stripe-and-paradigms-stablecoin-payments-blockchain-explained)

---

## Architecture Options for Wink

### Option A — Wink operates its own Zone (RECOMMENDED)

**Model:** Wink = operator of "Wink Private Zone"

Flow:
```
1. User has public Tempo balance (from auto-forward Base→Tempo)
2. Click "Move to Private" in /wallet
   → Deposit 100 pathUSD to Wink Zone via ZonePortal (encrypted mode)
   → Public sees: 0xUser → Wink Zone 100 pathUSD, but NOT which wink handle inside zone got it

3. Inside Wink Zone:
   - @arinzaay → @daveed 25 pathUSD via private transfer
   - Public sees: nothing. Operator (Wink) sees: arinzaay → daveed 25
   - daveed sees: +25 via zone RPC auth

4. Withdraw when needed:
   - daveed withdraws to public Tempo → swaps → offramp
   - Public sees: Wink Zone → 0xRecipient 25 pathUSD, but NOT that sender was daveed
```

**Pros:**
- True privacy for handle-to-handle payments
- Business moat: Wink is the trusted operator (like payroll company)
- Can charge premium: "Wink Private" $5/mo or 20bps
- Fits existing handle abstraction

**Cons:**
- Operator trust — we see everything. Must be transparent + audited. Critics say this "reintroduces centralized trust" [cointelegraph.com](https://cointelegraph.com/news/tempo-zones-highlight-divide-over-privacy)
- Need to run sequencer infra (or use Tempo's hosted)

### Option B — Use separate Zones per enterprise

**Model:** Each business (e.g., payroll company) runs its own Zone, Wink is just the username resolver.

Wink provides:
- `@acme-corp/payroll` → resolves to Acme's Zone address
- Employees withdraw from Acme Zone to Wink public

More complex, less moat. Good for enterprise sales later.

### Option C — Hybrid (Start with A, evolve to B)

Launch with Wink Zone for all users. Later offer "Bring your own Zone" for enterprises who want to be operator themselves (they see their own payroll, we don't).

**Recommendation: Option C — start A.**

---

## UX for Wink Private

**In /wallet page:**

```
[Public Balance] $124.50 pathUSD on Tempo
[Private Balance] $0.00 in Wink Zone  ← new

Buttons:
- "Move to Private" → modal: amount, encrypted deposit, shows fee (portal deposit fee)
- "Private Send" → handle input @daveed, amount, memo (encrypted)
- "Withdraw to Public" → amount, to address

[Privacy Badge] 
"Transactions inside Wink Private are invisible to public explorers. Only you and Wink operator can see them. Funds locked on Tempo Mainnet — we cannot steal."
```

**In /wink/[handle] page:**

```
Public wink: anyone can send, amount public
Private wink: toggle "Send privately"
  → if sender has private balance, sends inside zone
  → recipient gets notification, balance updates via private RPC auth
```

**Auth flow (from Tempo docs):**
```ts
// Connect to zone
await zoneAClient.zone.signAuthorizationToken() // signs auth token with passkey

// Private read — only own balance
const balance = await zoneAClient.getBalance({ address: myAddress })

// Private transfer
import { Actions } from 'viem/tempo'
await Actions.token.transferSync(zoneAClient, {
  account,
  amount: parseUnits('25', 6),
  feeToken: pathUsd,
  to: recipientZoneAddress,
  token: pathUsd,
})
```

**Deposit (encrypted):**
```ts
// From docs: Deposit pathUSD to a Tempo Zone on Testnet
// Plaintext reveals recipient, encrypted hides it
const { receipt } = await Actions.zone.depositSync(rootClient, {
  amount: parseUnits('100', 6),
  token: pathUsd,
  to: zonePortalAddress,
  // encrypted recipient + memo
  encrypted: true,
  recipient: myZoneAddress,
})
```

**Cross-zone routed send (for future enterprise):**
```ts
// Withdraw from Zone A → swap on Mainnet → deposit to Zone B
const callbackData = encodeAbiParameters(
  [{type:'bool'},{type:'address'},{type:'address'},{type:'address'},{type:'bytes32'},{type:'uint128'}],
  [false, pathUsd, ZONE_B.portalAddress, account.address, zeroBytes32, 0n]
)
await Actions.zone.requestWithdrawalSync(zoneAClient, {
  amount,
  data: callbackData,
  to: swapAndDepositRouter,
  token: pathUsd,
})
```

---

## Compliance & Enterprise Controls

- **TIP-403 mirrored:** If USDC issuer blacklists address on Mainnet, Zone enforces automatically
- **Wink operator can configure:** Only allow pathUSD, only allow verified handles, apply receive policies
- **Screening at boundaries:** Deposits into Wink Zone can be screened (e.g., block OFAC addresses)
- **Selective disclosure:** For audit, operator can provide proofs without revealing all transactions publicly

From Tempo: "Enterprises can configure their Zones to support specific customers, assets, and workflows, aligned with their compliance requirements." [tempo.xyz/developers/blog/privacy-with-tempo-zones](https://tempo.xyz/developers/blog/privacy-with-tempo-zones)

---

## Roadmap

**Phase 1 — Testnet Prototype (Now, 1-2 weeks)**
- [ ] Connect to Tempo testnet Zone A/B (RPC URLs from docs)
- [ ] Add `viem/tempo` to wink repo
- [ ] Implement `zoneClient` hook with `signAuthorizationToken()`
- [ ] UI: "Private balance" card in /wallet (behind `NEXT_PUBLIC_ZONES_ENABLED` flag)
- [ ] Deposit 100 pathUSD testnet → Zone A, confirm private balance
- [ ] Send 25 pathUSD inside Zone A → verify other user can't see via public RPC
- [ ] Withdraw back to public

**Phase 2 — Wink Zone on Mainnet (When Tempo opens)**
- [ ] Apply for Tempo Zones design partner (mention payroll/creator use case)
- [ ] Deploy Wink Zone operator infra (or use hosted)
- [ ] Add encrypted deposits (recipient hidden)
- [ ] Add blinded withdrawals
- [ ] Add handle → zone address resolver

**Phase 3 — Business Model**
- [ ] Pricing: Free public wink, $5/mo or 0.2% for private (min $0.10)
- [ ] Pitch: "Deel uses Zone for contractor privacy — Wink brings same to any creator"
- [ ] Enterprise: "Bring your own Zone" — Acme runs Zone, Wink provides username layer + interop

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Operator trust — Wink sees all** | Publish transparency report, open-source sequencer logs, offer ZK proof of correct execution (TEE proof from Tempo). Make clear in UI: "Wink operator sees transactions, public does not" |
| **Zones testnet only** | Build behind feature flag, don't promise mainnet date. Use testnet for demo to investors. |
| **Fee AMM liquidity** | Use pathUSD only initially (57% of Tempo supply, most liquid) |
| **No smart contracts in zones** | Fine — wink is payments only. Swaps happen on Mainnet via router. |
| **Breaking changes** | Pin viem/tempo version, expect rewrites. |

---

## Why this is the moat

Public username payments = easy to clone (ENS + Relay can do same).
**Private username payments with compliance = hard to clone.**

- ENS is public forever
- Tempo Zones + Wink handles = private payroll that still complies
- Network effect: more handles in Wink Zone → more private liquidity → harder to leave

Pitch: "Wink is the first consumer Zone on Tempo — private Venmo for stablecoins, with usernames."

---

## Next Step Decision

Need your call on:

1. **Build testnet prototype now?** (I can scaffold zoneClient + deposit UI in /wallet)
2. **Apply for Tempo mainnet Zones partner?** (Need to write application — I can draft)
3. **Pricing:** Should private be premium or free for early users?

Let me know and I'll start coding Phase 1.


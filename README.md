# Wink — Pay a @username, any chain in, Tempo out

I live in Warri, Nigeria. Last week someone in the US wanted to send me $5 USDC. I'm on Tempo, he's on Base. Same 0x address on every chain, but my money was scattered — $0.86 on Base, $0.99 on Arb, $0 on Tempo. I had no idea where my balance was. That's the zoo.

And if you're a vendor at an event, you can't tell customers "send to Base but I want Tempo pathUSD". You lose the sale.

**Wink fixes that.**

Claim `@handle` → get `https://www.winkpay.xyz/wink/@handle` — one QR that works from any chain. Payer connects wallet on Base/Eth/Arb/Op/Poly/Tempo, sends USDC, you receive pathUSD on Tempo mainnet (4217). No address sharing.

Live now: **https://www.winkpay.xyz** — real mainnet money, no waitlist, no mock.

## Try it

- Pay demo: https://www.winkpay.xyz/wink/test1
- Send: https://www.winkpay.xyz/send
- Wallet: https://www.winkpay.xyz/wallet (shows Tempo + stranded USDC + transaction history)
- Docs: https://www.winkpay.xyz/docs

On phone? Scan a payment link — Connect wallet now works via WalletConnect + MetaMask deep link, not just injected.

## What we built in 1 week (Sep 2026)

This is not a hackathon template. Check `BUILD_LOG.md` for real diary.

- **Any-chain:** TipForm chain selector, Relay `quote/v2` with `recipient` fix (was sending back to sender, fixed 830d0da), `bridgeWatcher` verifies arrival on Tempo independently
- **Wallet:** `/api/me` returns incoming, `/api/portfolio` reads Tempo + Base/Arb/Op/Eth/Poly balances, stranded detector + Forward to Tempo button
- **Notifications:** any funds drop → email. `confirmPipeline` (wink), `creditBridgeArrival` (bridge), `depositWatcher` (direct pathUSD Transfer scan last 7200 blocks) all use shared `notifyFundsReceived()`
- **Mobile:** always show Connect wallet, WalletConnect v2, Tempo chain id dynamic 4217 mainnet
- **Balance sync:** demo wallet per-device, linked on login via `/api/wallet/link`, breakdown UI explains why desktop vs mobile differed

Proof: Base $1 → Tempo $0.974 pathUSD tx `0x343d518fef74e26ddaf7c789e745609a7ecca17cd8ce525d52974b72b6d24298` → Tempo `0x113e6430a6fe77054ac2506059780632c98cd42cc643689626e04d3bb0e9dada` (see README_TECH.md for more)

## Stack

Next.js 15, TypeScript, Tailwind, viem/tempo (native Tempo chain), Drizzle + Postgres (Neon), Relay (cross-chain), Resend (email), html5-qrcode + qrcode.

```
public /wink/@handle → /api/wink/prepare (resolve handle, create pending transfer, memo wk_<id>) → wallet signs transferWithMemo → /api/wink/confirm verifies receipt on Tempo → ledgerEntries + email
any chain → /api/bridge/quote (Relay) → user signs approve+deposit on source → bridgeWatcher polls status/v3 → verifyArrivalOnTempo → credit ledger + email
direct → depositWatcher scans Transfer events → create transfer + ledger + email
```

Chain is source of truth for money, ledger is source of truth for product. No custody — keys in browser.

## Run it

```bash
npm install
cp .env.example .env # DATABASE_URL, SESSION_SECRET, TEMPO_NETWORK=mainnet, RESEND_API_KEY, NEXT_PUBLIC_WC_PROJECT_ID
npm run db:push
npm run dev
```

Mainnet: `https://rpc.tempo.xyz`, chain 4217, pathUSD `0x20c0000000000000000000000000000000000000`

## Why this repo looks human

Check `BUILD_LOG.md` — real bugs at 1am, not perfect conventional commits. We force-pushed `design/crimson` a lot while fixing prod, but kept diary. See Issues tab for "Bridge returns to sender" etc.

For Colosseum judges: significant work during hackathon, our work not third party, strategic prioritization (live business first, then any-chain, then trust via history/notifications, then mobile). See `git log --oneline design/crimson`.

Tech details in `README_TECH.md`.

— Arinzaay007, Warri, Delta, NG. Building for real users.

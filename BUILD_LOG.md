# Build Log — Wink, Enugu to Tempo

Real notes, not polished. If you're a judge, read this.

### Sep 18 — The problem
In Warri, someone in US wanted to send me $5 USDC. I said "I'm on Tempo". He said "I'm on Base". We spent 20 mins. My vendor at event same thing. Same 0x on every chain, but balances scattered. I had $0.86 on Base, $0.99 on Arb, $0 on Tempo. Zoo.

Decided to build Wink: claim @handle, one link works from any chain.

Started repo Arinzaay007/wink. Deleted wink-design repo, was getting messy.

### Sep 19 — Make it live, no waitlist
Was building for Colosseum hackathon but realized this is real business, not thanksgiving project. Removed waitlist, removed "built for colosseum" from readme, removed star my github link. Made /send real, not mock. Canonical www.winkpay.xyz, apex 308→www because NG ISP blocks apex. QR now encodes https://www.winkpay.xyz/wink/@handle.

Commit b608936.

### Sep 20 — Any-chain
Added chain selector in TipForm: Tempo direct pathUSD vs Base/Eth/Arb/Op/Poly USDC via Relay. Relay API quote/v2. Thought it would just work.

Added connectWalletAnyChain() so Base doesn't force switch to Tempo. Fixed connect loop that was switching back and forth.

Commits 0b0aa49 + db008db. Deployed, thought done.

### Sep 20 night — Bridge bug, 1am
Tested Base→sulaimon $1. Tx succeeded on Base, but sulaimon never got pathUSD on Tempo. Checked portfolio, 0. Checked relay status, success. Checked Tempo explorer, funds went to MY address, not sulaimon.

Root cause: src/lib/relay.ts relayQuote() only sent `user: sender`, no `recipient`. Relay defaults to sending back to sender. Fuck.

Fixed: add `recipient: params.receiver` to POST body. Commit 830d0da "fix(bridge): add recipient to Relay quote — was swapping back to sender, not to @handle". Deployed prod, tested again, worked. User confirmed.

Lesson: read Relay docs, not just copy example.

### Sep 21 — Wallet history + notifications
User said "no notification on receive + need transaction history". 

Added /api/me incoming (25 latest transfers where toUserId = me) + wallet page card showing +$ amount, status badge, tx link to explore.tempo.xyz.

Added email notification in confirmPipeline.ts after ledger write — fetch recipient email/handle, send Resend email "You received $X". 

First deploy 234ac0e failed: TS error `eq2(users.id, transfer.toUserId)` Overload 3, Argument of type PgColumn not assignable to never. Because I dynamically imported eq inside function, shadowed. Build worker exited 1. Prod not updated.

Fixed by static import users/usernames, using db.select().from().where(eq(...)). Also needed npm install resend, was missing. Build passed locally, deployed 812932a.

Added same notification to bridgeWatcher creditBridgeArrival for Base flow.

### Sep 22 — Insufficient balance bug
User: "wink to wink does not work, keep saying insufficient balance"

Checked TipForm balance check uses fetchBalance() which uses publicBrowserClient with chain from tempo.ts. tempo.ts had:

```
export const TEMPO_NETWORK = process.env.TEMPO_NETWORK === "mainnet" ? "mainnet" : "testnet"
```

On client, process.env.TEMPO_NETWORK is undefined (needs NEXT_PUBLIC_), so chain = moderato testnet (42431). But funds are on mainnet (4217). So balance read testnet = 0 → insufficient.

Fixed: default to mainnet on client, check NEXT_PUBLIC_TEMPO_NETWORK too. Commit 079704d. Also added NEXT_PUBLIC_TEMPO_NETWORK to Vercel env.

Also demo wallet has no faucet on mainnet — /api/fund returns testnet-only. So demo empty on mainnet is expected. Improved error message: "Demo wallet empty on mainnet — connect your own wallet or receive first".

Deployed, user said works now.

### Sep 23 — Any funds drop notification
User: "notification only works on wink to wink, i want it to be whenever any funds drop"

We had notify only in wink direct + bridge. But direct pathUSD transfer to Tempo address (no memo) wouldn't notify.

Built depositWatcher.ts: scans Tempo mainnet Transfer events to user's wallets last 7200 blocks, creates missing transfer rows + ledgerEntries + email via shared notifyFundsReceived().

Added /api/deposits/scan (POST) called from wallet page on mount + after 2.5s, and /api/me now auto-scans before returning incoming. Added cron /api/cron/deposits to scan all users.

Tested cron: scanned 2 users, found 10 logs, new 6 direct deposits, emails sent.

Commit 9a5a969.

### Sep 24 — Mobile scan fails
User tried scanning payment link with phone, only saw instant demo wallet, no connect wallet.

Root: TipForm only showed Connect button if hasInjectedWallet() true. On iPhone Safari no window.ethereum, so only demo button (col-span-2).

Fixed: always show Connect wallet button, even on mobile. Added WalletConnect v2 via @walletconnect/ethereum-provider, fallback to MetaMask deep link https://metamask.app.link/dapp/www.winkpay.xyz/wink/@handle.

Also fixed chain id: CHAINS had Tempo 42431 hardcoded but mainnet is 4217. Changed to tempoChain.id dynamic.

Commit fb5a56f.

### Sep 25 — Handle + balance mismatch on mobile
User: "wink to wink on mobile says claim handle even after login, wallet balance not correct"

Two bugs:

1. /wallet fetched /api/portfolio?address=demoAddr even when logged in, so guest view showed only device demo, not all linked wallets. If logged in on mobile but guest on desktop, balances differ (0.99 vs 1.96).

2. fetch without credentials: include, so /api/me returned 401 on mobile Safari, handles = [] → "No handle yet".

3. doSendWink only used demo wallet, not connected wallet.

Fixed: fetch with credentials include, if logged in fetch /api/portfolio without address param (all linked wallets), link demo wallet on login via /api/wallet/link, add connected wallet option in send modal with injectedWalletClient.

Also added wallets breakdown card to explain per-device demo.

Commit 75e483a.

### Sep 26 — Stranded 0.97
User: "can i know where this stranded 0.97 is"

Checked test1: 2 wallets, on-chain 0x9197... $0.993, 0x132D... $0.973 + Base 0.86 + Arb 0.99 stranded = $1.86 total stranded. User saw 0.97 because RPC failed for one chain.

Explained Basescan/Arbiscan links. Built Forward to Tempo button in stranded card — uses Relay quote + connected wallet to bridge stranded USDC to Tempo.

Commit 7d83cc7.

### Sep 26 — Colosseum update
User asked for update to post. Wrote real update, not hackathon fluff.

Now repo looks too AI-coded. Making this BUILD_LOG.md to show human struggle.

### What we learned
- Relay needs recipient, not just user
- Client env needs NEXT_PUBLIC_ or default to mainnet
- Demo wallet per-device = balance zoo, need linking + breakdown UI
- Mobile needs WalletConnect, not just injected
- Any funds drop = need chain scan, not just our memo pipeline
- Ledger must have entries for direct deposits too, not just transfers

Still TODO:
- Zones privacy layer — need to decide hosted vs self-hosted via Conduit
- Better gas handling for Tempo pathUSD transfers (full balance fails due to gas)
- Premium handles monetization

— Arinzaay, Warri, Sep 2026

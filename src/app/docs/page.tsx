"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Code2, GitBranch, Layers, ShieldCheck, Terminal } from "lucide-react";
import { BgFx } from "@/components/BgFx";

const SECTIONS = [
  { icon: Layers, title: "The money loop", body: "prepare → sign → confirm. Resolve @handle to recipient wallet, create a pending transfer with memo, payer signs in their wallet, we verify on-chain and append to the ledger. Same loop everywhere — tips, checkout, payroll, agents." },
  { icon: ShieldCheck, title: "Verification oaths", body: "We never trust a client-reported success. Every transfer is re-checked on Tempo before we mark anything confirmed. Recipients are never exposed publicly — privacy-safe /api/resolve. Keys never leave the browser." },
  { icon: Code2, title: "TIP-20 memos", body: "Every transfer carries a 32-byte reconciliation memo (wk_<transferId> for wink flows, merchant + invoice for sales). The memo tells the story; the chain is the receipt." },
  { icon: GitBranch, title: "Cross-chain by default", body: "Workers stay on their chain. We quote via Relay, accept a deposit on Base / Arbitrum / Optimism / Polygon / Ethereum, the solver fills the @handle's Tempo address, and we verify the arrival independently on-Tempo." },
  { icon: Terminal, title: "MPP · machine payments", body: "An IETF draft co-authored by Tempo and Stripe. WWW-Authenticate: Payment on 402, Authorization: Payment <txHash> on retry, Payment-Receipt on 200. Open standard, open simulator." },
];

const STACK = [
  { k: "framework", v: "Next.js 15 (App Router, TypeScript)" },
  { k: "data", v: "Drizzle ORM + Postgres" },
  { k: "chain", v: "viem/tempo · chain 42431 · pathUSD" },
  { k: "auth", v: "session HMAC · injected EIP-1193 wallet" },
  { k: "fees", v: "0% platform · ~8bps network · zero ETH gas" },
];

export default function DocsPage() {
  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="chip chip-red mb-6"><BookOpen size={11} /> /docs · protocol</div>
        <h1 className="text-display text-[56px] sm:text-[80px] leading-[0.92] tracking-[-0.045em]">
          The <em className="italic font-light neon-text">protocol</em><br />
          <span className="text-white">behind</span> <em className="italic font-light text-[color:var(--color-ink-2)]">the</em> <span className="text-white">wink</span><span className="text-[color:var(--color-neon)]">.</span>
        </h1>
        <p className="mt-6 text-[color:var(--color-ink-2)] max-w-2xl leading-relaxed text-[16px]">The rails are free. The names are the business. 0% platform fee; monetization = premium short handles (roadmap). Built for the Colosseum Crypto World&apos;s Fair — Tempo track.</p>

        <section className="mt-20">
          <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-4">§ 01 · architecture</div>
          <div className="card p-7 md:p-10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-10 blur-3xl" />
            <pre className="relative font-mono text-[12.5px] leading-relaxed text-white overflow-x-auto">
{`                    ┌────────────────────────────────────────────┐
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
                └─────────────────────┘   └────────────────────────┘`}
            </pre>
          </div>
        </section>

        <section className="mt-20">
          <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-4">§ 02 · what we promise</div>
          <div className="grid md:grid-cols-2 gap-4">
            {SECTIONS.map((s) => (
              <div key={s.title} className="card p-7">
                <div className="w-10 h-10 rounded-lg bg-[color:var(--color-neon-soft)] border border-[rgba(255,31,61,0.3)] flex items-center justify-center text-[color:var(--color-neon)] mb-5"><s.icon size={16} /></div>
                <div className="text-display text-xl text-white">{s.title}</div>
                <p className="text-[14px] text-[color:var(--color-ink-2)] mt-2 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-4">§ 03 · stack</div>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[180px_1fr] gap-px bg-[color:var(--color-line)]">
              {STACK.map((s) => (
                <div key={s.k} className="contents">
                  <div className="bg-[color:var(--color-surface)] px-5 py-4 text-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">{s.k}</div>
                  <div className="bg-[color:var(--color-surface)] px-5 py-4 text-[14px] text-white font-mono">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-4">§ 04 · quickstart</div>
          <div className="card p-7 md:p-10 bg-black">
            <div className="text-display text-2xl text-white mb-5">local dev</div>
            <pre className="font-mono text-[13px] text-[color:var(--color-ink-2)] leading-relaxed overflow-x-auto">
{`# clone & install
git clone https://github.com/Arinzaay007/wink
cd wink && npm install

# env (DATABASE_URL, SESSION_SECRET, TEMPO_NETWORK=mainnet)
cp .env.example .env

# schema → postgres
npm run db:push

# run
npm run dev                          # app on :3000
npm test                             # 60 automated tests
npm run rebuild                      # restore the whole demo world
npm run reconcile                    # safety net for stranded transfers
npm run bot                          # optional: telegram "you've been winked 😉"`}
            </pre>
          </div>
        </section>

        <section className="mt-24 text-center">
          <div className="inline-flex flex-col items-center gap-5">
            <a href="https://github.com/Arinzaay007/wink" target="_blank" rel="noreferrer" className="btn-primary !py-4 !px-8 !text-base">Star on GitHub <ArrowRight size={16} /></a>
            <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">MIT · tempo moderato · pathUSD</div>
          </div>
        </section>
      </div>
    </div>
  );
}

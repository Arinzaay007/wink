"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Zap,
  ScanLine,
  Receipt,
  Users,
  Bot,
  Check,
  Play,
  QrCode,
  Send,
  Wallet,
  CircleDollarSign,
  PartyPopper,
} from "lucide-react";
import { WinkLogo } from "@/components/Logo";
import { PhoneFrame } from "@/components/PhoneFrame";
import { BgFx, Marquee } from "@/components/BgFx";

const features = [
  {
    icon: PartyPopper,
    eyebrow: "TIPS · 01",
    title: "One wink to a name.",
    body: "No addresses, no QR dance. Type @lina, choose an amount, hit send. Memo-reconciled on Tempo, settled in pathUSD.",
  },
  {
    icon: QrCode,
    eyebrow: "MERCHANT · 02",
    title: "A pay code that prints itself.",
    body: "Generate QR invoices your customers scan with any wallet. Reconciles by memo. Zero custody, zero platform fee.",
  },
  {
    icon: Users,
    eyebrow: "PAYROLL · 03",
    title: "Pay people, not addresses.",
    body: "Batch payroll to @handles — even across chains. Quoted via Relay, settled on Tempo, every arrival verified on-chain.",
  },
  {
    icon: Bot,
    eyebrow: "AGENTS · 04",
    title: "HTTP 402 is now payments.",
    body: "Your AI agent calls /api/mpp, gets a 402 challenge, signs and pays — and the resource unlocks. MPP, the open standard.",
  },
];

const ticker = [
  { left: "@lina", right: "+ $3.00 · wink" },
  { left: "@cafe-mira", right: "+ $2.50 · sale" },
  { left: "@adaeze", right: "+ $0.25 · agent" },
  { left: "@nik", right: "+ $14.00 · wage" },
  { left: "@tempo-bot", right: "+ $0.008 · fee" },
  { left: "@studio-9", right: "+ $1,200.00 · payroll" },
  { left: "@wedding-marisol", right: "+ $0.50 · wall" },
];

export default function Home() {
  return (
    <>
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        <BgFx variant="default" />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full opacity-50"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,31,61,0.18), transparent 60%)",
          }}
        />

        <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <span className="status-pill">
              <span className="dot-live" /> live on tempo · mainnet
            </span>
          </motion.div>

          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="text-display text-[64px] sm:text-[84px] lg:text-[104px] leading-[0.92] tracking-[-0.045em]"
              >
                <span className="text-white">anyone,</span>
                <br />
                <span className="text-white">anywhere,</span>
                <br />
                <span className="italic font-light text-[color:var(--color-ink-2)]">paid with a</span>{" "}
                <span className="neon-text italic font-light">wink</span>
                <span className="text-[color:var(--color-neon)]">.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-7 text-[17px] md:text-[19px] text-[color:var(--color-ink-2)] max-w-xl leading-relaxed"
              >
                Wink is the name layer for payments. One primitive —{" "}
                <span className="text-white font-medium">pay a @username</span> — carried across tips, checkout,
                payroll, and machine payments. All settling as stablecoins on Tempo.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <Link href="/claim" className="btn-primary">
                  Claim @handle — get started <ArrowRight size={16} />
                </Link>
                <Link href="/wink/demo" className="btn-ghost">
                  <Play size={14} /> Try demo
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-12 grid grid-cols-3 max-w-md gap-px bg-[color:var(--color-line)] rounded-2xl overflow-hidden border border-[color:var(--color-line)]"
              >
                {[
                  { k: "0%", v: "platform fee" },
                  { k: "~1s", v: "memo reconcile" },
                  { k: "8bps", v: "all-in network fee" },
                ].map((s, i) => (
                  <div key={i} className="bg-[color:var(--color-surface)] px-4 py-4">
                    <div className="text-display text-2xl text-white">{s.k}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mt-1.5">
                      {s.v}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-[440px] h-[440px]">
                  <div className="absolute inset-0 rounded-full border border-[color:var(--color-line)] ring-rotate" />
                  <div className="absolute inset-6 rounded-full border border-dashed border-[color:var(--color-line)] ring-rotate-rev" />
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[color:var(--color-neon)] shadow-[0_0_18px_4px_rgba(255,31,61,0.6)]" />
                </div>
              </div>

              <PhoneFrame width={310} height={640}>
                <PhoneHomeScreen />
              </PhoneFrame>
            </motion.div>
          </div>
        </div>

        <div className="relative mt-8 border-y border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          <Marquee items={ticker} />
        </div>
      </section>

      <section className="relative py-12 border-b border-[color:var(--color-line)] bg-black">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {["tempo · pathUSD", "Relay · cross-chain", "MPP · IETF draft", "TIP-20 · memos on chain"].map((t) => (
            <div
              key={t}
              className="flex items-center justify-center text-xs text-mono uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]"
            >
              {t}
            </div>
          ))}
        </div>
      </section>

      <FeatureBlock
        eyebrow="ONE WINK TO A NAME"
        title={
          <>
            The simplest & <em className="italic font-light">fastest</em>
            <br /> way to pay anyone.
          </>
        }
        body="No addresses. No QR dance. Type a @handle, pick an amount, confirm. Memo-reconciled on Tempo, settled in pathUSD. The recipient gets the full amount — sender pays ~$0.008 network fee."
        cta={{ label: "Try sending a wink", to: "/wink/demo" }}
        mock={<MockWink />}
        reverse={false}
      />

      <FeatureBlock
        eyebrow="SPRAY THE WALL"
        title={
          <>
            Tip the room, <em className="italic font-light">not the room</em>{" "}
            <br className="hidden sm:block" /> of strangers.
          </>
        }
        body="Event hosts spin up a wall. Guests spray winks onto a live screen — each one a real on-chain transfer. Wedding bells, conference talks, livestream raids: every tip is public, verifiable, and instant."
        cta={{ label: "Open the demo wall", to: "/wall/wedding" }}
        mock={<MockWall />}
        reverse
      />

      <FeatureBlock
        eyebrow="MERCHANT CHECKOUT"
        title={
          <>
            Printable QR codes <em className="italic font-light">that pay</em> themselves.
          </>
        }
        body="Generate pay codes for any invoice. Customers scan, sign, send. Every transfer carries a memo so reconciliation is automatic. No middleman, no chargebacks, no charge for the privilege."
        cta={{ label: "Generate a pay code", to: "/pay" }}
        mock={<MockPay />}
        reverse={false}
      />

      <FeatureBlock
        eyebrow="PAY REQUESTS + PAYROLL"
        title={
          <>
            Pay people, <em className="italic font-light">not</em> <br className="hidden sm:block" /> addresses.
          </>
        }
        body="Workers send a pay request — amount + memo. Employers approve and dispatch. Batch payroll runs in a single click. Cross-chain by default: Base, Arbitrum, Optimism, Polygon, Ethereum, settled on Tempo."
        cta={{ label: "Open payroll", to: "/payroll" }}
        mock={<MockPayroll />}
        reverse
      />

      <FeatureBlock
        eyebrow="MACHINE PAYMENTS · MPP"
        title={
          <>
            HTTP <em className="italic font-light">402</em> is now a
            <br className="hidden sm:block" /> payment endpoint.
          </>
        }
        body="AI agents discover a paywalled endpoint, receive a 402 challenge, sign and pay pathUSD against a @handle, then retry the request with the on-chain receipt. Open standard, live simulator, real receipts."
        cta={{ label: "Try the agent simulator", to: "/agents" }}
        mock={<MockAgent />}
        reverse={false}
      />

      <section className="relative py-32 border-t border-[color:var(--color-line)] bg-black">
        <BgFx variant="tight" />
        <div className="max-w-[1400px] mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div>
              <div className="chip mb-5">THE MONEY LOOP</div>
              <h2 className="text-display text-[44px] sm:text-[60px] leading-[0.95] max-w-3xl">
                Same rails. <em className="italic font-light">Everywhere.</em>
              </h2>
            </div>
            <p className="max-w-sm text-[color:var(--color-ink-2)] text-[15px] leading-relaxed">
              Whether it&apos;s a tip, a coffee, a salary, or a bot buying API credits — the loop is identical, the memo
              tells the story.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-[color:var(--color-line)] rounded-3xl overflow-hidden border border-[color:var(--color-line)]">
            {[
              {
                n: "01",
                t: "prepare",
                d: "Resolve @handle → recipient wallet. Create a pending transfer with memo wk_<id>. Return exact on-chain params.",
              },
              {
                n: "02",
                t: "sign",
                d: "Payer's wallet signs transferWithMemo. Injected EIP-1193 wallet or zero-setup demo wallet, faucet-funded.",
              },
              {
                n: "03",
                t: "confirm",
                d: "We pull the receipt and verify the on-chain event before marking anything confirmed. Append-only ledger.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-[color:var(--color-surface)] p-8 md:p-10 relative overflow-hidden"
              >
                <div className="absolute top-6 right-6 text-display text-7xl text-[color:var(--color-line-2)] select-none">
                  {s.n}
                </div>
                <div className="text-mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-4">
                  step {s.n}
                </div>
                <h3 className="text-display text-3xl text-white mb-3">{s.t}</h3>
                <p className="text-[color:var(--color-ink-2)] text-sm leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 border-t border-[color:var(--color-line)] bg-black">
        <BgFx variant="default" />
        <div className="max-w-[1400px] mx-auto px-5 md:px-8">
          <div className="chip mb-6">FOUR MONEY PATHS, ONE PRIMITIVE</div>
          <h2 className="text-display text-[44px] sm:text-[64px] leading-[0.95] max-w-3xl">
            Built for <em className="italic font-light">everyone</em> who gets paid.
          </h2>
          <p className="mt-5 max-w-2xl text-[color:var(--color-ink-2)] text-[16px] leading-relaxed">
            Wink handles four completely different money flows with the exact same backend. The rails are free. The names
            are the business.
          </p>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="card p-7 group hover:border-[color:var(--color-line-2)] transition"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="w-11 h-11 rounded-xl bg-[color:var(--color-neon-soft)] border border-[rgba(255,31,61,0.3)] flex items-center justify-center text-[color:var(--color-neon)] group-hover:scale-110 transition">
                    <f.icon size={18} />
                  </div>
                  <div className="text-mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)]">{f.eyebrow}</div>
                </div>
                <h3 className="text-display text-[22px] text-white leading-tight">{f.title}</h3>
                <p className="mt-3 text-[13.5px] text-[color:var(--color-ink-2)] leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 border-t border-[color:var(--color-line)] bg-black">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-start">
            <div className="sticky top-24">
              <div className="chip chip-red mb-5">
                <span className="dot-live" /> every claim, one transaction
              </div>
              <h2 className="text-display text-[44px] sm:text-[60px] leading-[0.95]">
                The chain is
                <br />
                <em className="italic font-light text-[color:var(--color-neon)]">the source of truth</em>
                <br />
                for money.
              </h2>
              <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
                The ledger is the source of truth for meaning. We verify every transfer on-chain before marking it
                confirmed.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Link href="/docs" className="btn-ghost w-fit">
                  Read the architecture <ArrowUpRight size={14} />
                </Link>
                <Link href="/dashboard" className="btn-primary w-fit">
                  Open the live dashboard <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  tag: "AUTO-FORWARD · MAINNET",
                  title: "Base $1.00 → $0.974756 pathUSD",
                  sub: "Burner 0x9979Df52… · Relay · Block 41099471 · real funds",
                  hash: "0x343d51… + 0x113e64…",
                  kind: "bridge",
                },
                {
                  tag: "FIRST WINK",
                  title: "@adaeze received $3.00",
                  sub: "Memo-reconciled · ~1s confirm",
                  hash: "0x4fe60d47aa22b9f8…",
                  kind: "wink",
                },
                {
                  tag: "SPRAY WALL",
                  title: "Wedding · 3 on-chain winks",
                  sub: "Host: @marisol · 12 guests tipped",
                  hash: "0xbbc4f3edda96f08c…",
                  kind: "wall",
                },
                {
                  tag: "MERCHANT",
                  title: "$2.50 against invoice INV-042",
                  sub: "Cafe Mira · QR pay code · reconciled",
                  hash: "0x6bfaa76481aad3fb…",
                  kind: "sale",
                },
                {
                  tag: "PAY REQUEST",
                  title: "Worker @nik asked, payer approved",
                  sub: "Memo: wk_a31b · 24h SLA · cleared in 4m",
                  hash: "0xbac3bff7c31a22fb…",
                  kind: "wage",
                },
                {
                  tag: "MPP AGENT",
                  title: "@adaeze paid $0.25 over HTTP 402",
                  sub: "AI agent · IETF draft · 1 request, 1 pay",
                  hash: "0x052cba278294b30…",
                  kind: "agent",
                },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="card p-5 flex items-center gap-5 hover:border-[color:var(--color-line-2)] transition"
                >
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] shrink-0 w-28">
                    {row.tag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-[15px]">{row.title}</div>
                    <div className="text-[12px] text-[color:var(--color-ink-3)] mt-0.5">{row.sub}</div>
                  </div>
                  <div className="hidden md:block text-mono text-[11px] text-[color:var(--color-ink-3)] shrink-0">
                    {row.hash}
                  </div>
                  <span className="text-mono text-[11px] text-[color:var(--color-neon)] uppercase tracking-[0.14em] flex items-center gap-1 shrink-0">
                    verify <ArrowUpRight size={11} />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-32 border-t border-[color:var(--color-line)] bg-black overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 100%, rgba(255,31,61,0.18), transparent 50%)",
          }}
        />
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 text-center relative">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <WinkLogo size={120} />
              <div
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255,31,61,0.25), transparent 70%)",
                }}
              />
            </div>
          </div>
          <h2 className="text-display text-[64px] sm:text-[110px] leading-[0.9] tracking-[-0.045em]">
            <span className="text-white">Get a</span> <em className="italic font-light neon-text">@handle</em>
            <span className="text-[color:var(--color-neon)]">.</span>
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-[color:var(--color-ink-2)] text-[16px]">
            Your name is your wallet. Use it for tips, checkout, payroll, and machine payments — across every chain,
            settled as pathUSD.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/claim" className="btn-primary !px-7 !py-4 !text-base">
              Claim @handle now <ArrowRight size={18} />
            </Link>
            <Link href="/docs" className="btn-ghost !px-7 !py-4 !text-base">
              Read protocol
            </Link>
            <Link href="/dashboard" className="btn-ghost !px-7 !py-4 !text-base">
              Open dashboard
            </Link>
          </div>
          <div className="mt-14 inline-flex items-center gap-4 text-mono text-xs text-[color:var(--color-ink-3)]">
            <span>live on mainnet</span>
            <span className="text-[color:var(--color-neon)]">✦</span>
            <span>0% platform fee</span>
            <span className="text-[color:var(--color-neon)]">✦</span>
            <span>settled on tempo · pathUSD · real funds</span>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureBlock({
  eyebrow,
  title,
  body,
  cta,
  mock,
  reverse,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  cta: { label: string; to: string };
  mock: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="relative py-24 md:py-32 border-t border-[color:var(--color-line)]">
      <BgFx variant={reverse ? "tight" : "default"} />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" } as any}
            transition={{ duration: 0.6 }}
          >
            <div className="chip chip-red mb-7">
              <Zap size={11} /> {eyebrow}
            </div>
            <h3 className="text-display text-[40px] sm:text-[56px] leading-[0.95] max-w-xl">{title}</h3>
            <p className="mt-6 max-w-md text-[color:var(--color-ink-2)] text-[15.5px] leading-relaxed">{body}</p>
            <div className="mt-9 flex items-center gap-3">
              <Link href={cta.to} className="btn-primary">
                {cta.label} <ArrowRight size={16} />
              </Link>
              <button className="btn-ghost">
                <Play size={13} /> Watch demo
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" } as any}
            transition={{ duration: 0.7 }}
            className="relative flex justify-center"
          >
            {mock}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PhoneHomeScreen() {
  return (
    <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden">
      <div className="flex justify-between items-center px-7 pt-4 text-[10px] text-white/90 z-10 relative">
        <span className="font-mono">9:41</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-white/80" />
          <span className="w-3 h-1.5 rounded-sm bg-white/80" />
          <span className="w-3 h-1.5 rounded-sm bg-white/40" />
        </span>
      </div>

      <div className="absolute top-12 inset-x-0 bottom-0 px-5 pt-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-neon)] mb-1">tap to send</div>
            <div className="text-display text-2xl text-white">hey, adaeze</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[color:var(--color-neon)] to-[color:var(--color-neon-deep)] flex items-center justify-center text-white text-xs font-bold">
            a
          </div>
        </div>

        <div className="card-red p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">balance</span>
            <span className="status-pill !text-[9px] !py-0.5">
              <span className="dot-live" /> live
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-display text-4xl text-white">$842</span>
            <span className="text-mono text-[11px] text-[color:var(--color-ink-3)]">.15</span>
          </div>
          <div className="text-[10px] text-mono text-[color:var(--color-ink-3)] mt-1">pathUSD · tempo</div>
        </div>

        <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2.5">send a wink</div>
        <div className="card p-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[color:var(--color-neon-soft)] border border-[rgba(255,31,61,0.3)] flex items-center justify-center text-[color:var(--color-neon)] text-xs">
              <Send size={11} />
            </div>
            <div className="flex-1">
              <div className="text-mono text-[10px] text-[color:var(--color-ink-3)]">to</div>
              <div className="text-white text-sm">@lina</div>
            </div>
            <div className="text-right">
              <div className="text-mono text-[10px] text-[color:var(--color-ink-3)]">amount</div>
              <div className="text-white text-sm">
                $3<span className="text-[color:var(--color-ink-3)]">.00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2.5">recent</div>
        <div className="space-y-2">
          {[
            { who: "@cafe-mira", amt: "+$2.50", k: "sale" },
            { who: "@nik", amt: "+$14.00", k: "wage" },
            { who: "@adaeze", amt: "+$0.25", k: "agent" },
          ].map((t) => (
            <div key={t.who} className="flex items-center justify-between text-[11px] py-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-neon)]" />
                <span className="text-white">{t.who}</span>
                <span className="text-mono text-[9px] text-[color:var(--color-ink-3)] uppercase tracking-wider">{t.k}</span>
              </div>
              <span className="text-mono text-[color:var(--color-neon)]">{t.amt}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-3 inset-x-5 border-t border-[color:var(--color-line)] pt-3 flex items-center justify-around text-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">
          <span className="text-white">home</span>
          <span>wall</span>
          <span>pay</span>
          <span>you</span>
        </div>
      </div>
    </div>
  );
}

function MockWink() {
  return (
    <div className="relative">
      <PhoneFrame width={310} height={640}>
        <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[color:var(--color-neon-soft)] to-transparent" />
          <div className="absolute top-12 inset-x-0 px-6 text-center">
            <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-3">sending wink</div>
            <div className="text-display text-3xl text-white">@lina</div>
            <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1.5">lina.tempo · verified</div>
          </div>

          <div className="absolute top-44 inset-x-0 flex justify-center">
            <div className="text-display text-[88px] leading-none neon-text">
              $3<span className="text-[40px] text-[color:var(--color-ink-2)]">.00</span>
            </div>
          </div>

          <div className="absolute top-[290px] inset-x-6 space-y-3">
            <KeyVal k="memo" v="wk_a31b8e2c" />
            <KeyVal k="network fee" v="$0.008 · ~8bps" />
            <KeyVal k="recipient gets" v="the full $3.00" />
          </div>

          <div className="absolute bottom-6 inset-x-5">
            <div className="card-red p-3 mb-3 text-center">
              <div className="flex items-center justify-center gap-2 text-[11px] text-[color:var(--color-neon)]">
                <Sparkles size={12} /> waiting for signature
              </div>
            </div>
            <div className="btn-primary w-full justify-center !py-3 !text-[13px]">
              Sign & send wink <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </PhoneFrame>

      <div className="hidden md:block absolute -top-4 -right-4 card p-3 w-44 rotate-3">
        <div className="text-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1">on-chain</div>
        <div className="text-mono text-[11px] text-[color:var(--color-neon)]">transferWithMemo</div>
        <div className="text-[10px] text-[color:var(--color-ink-2)] mt-1">memo: wk_a31b8e2c</div>
      </div>
    </div>
  );
}

function MockWall() {
  const winks = [
    { x: "12%", y: "20%", name: "@nik", amt: "$3" },
    { x: "70%", y: "15%", name: "@ada", amt: "$5" },
    { x: "30%", y: "40%", name: "@jo", amt: "$1" },
    { x: "78%", y: "48%", name: "@rae", amt: "$2" },
    { x: "20%", y: "70%", name: "@sami", amt: "$10" },
    { x: "65%", y: "75%", name: "@vee", amt: "$2" },
    { x: "45%", y: "30%", name: "@kim", amt: "$1" },
    { x: "55%", y: "60%", name: "@marco", amt: "$5" },
  ];
  return (
    <PhoneFrame width={310} height={640}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a14] via-[#0a0a0c] to-[#0a0a0c] overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-20 blur-3xl" />
        <div className="absolute top-10 inset-x-0 text-center px-5">
          <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)]">live · 14 guests</div>
          <div className="text-display text-[26px] text-white mt-1">Marisol & Jules</div>
          <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">wall · wedding-marisol</div>
        </div>
        {winks.map((w, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.15, type: "spring" }}
            className="absolute"
            style={{ left: w.x, top: w.y }}
          >
            <div className="bg-[color:var(--color-neon)] text-white rounded-full px-2 py-1 text-[10px] font-mono whitespace-nowrap shadow-[0_0_20px_rgba(255,31,61,0.6)]">
              {w.name} · {w.amt}
            </div>
          </motion.div>
        ))}
        <div className="absolute bottom-5 inset-x-4">
          <div className="card p-3 flex items-center gap-2">
            <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] flex-1">tap to spray a wink</div>
            <div className="bg-[color:var(--color-neon)] text-white text-[10px] font-mono px-3 py-1.5 rounded-full">+ wink</div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function MockPay() {
  return (
    <PhoneFrame width={310} height={640}>
      <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden flex flex-col items-center justify-center px-6">
        <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-3">cafe mira · invoice</div>
        <div className="text-display text-3xl text-white mb-1">INV-042</div>
        <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mb-7">scan to pay · any wallet</div>
        <div className="bg-white p-3 rounded-2xl shadow-[0_0_60px_rgba(255,31,61,0.25)]">
          <div className="w-44 h-44 grid grid-cols-12 grid-rows-12 gap-px">
            {Array.from({ length: 144 }).map((_, i) => {
              const skip = [0, 1, 2, 3, 4, 5, 12, 13, 18, 19, 24, 25, 30, 31, 36, 37, 42, 43, 48, 49, 54, 55, 60, 61, 66, 67, 72, 73, 84, 85, 96, 97, 102, 103, 108, 109, 114, 115, 120, 121, 122, 123, 124, 125, 126, 127, 132, 133, 138, 139, 142, 143];
              const filled = ((i * 37) % 7) > 2 && !skip.includes(i);
              return <div key={i} className={filled ? "bg-black" : "bg-white"} />;
            })}
          </div>
        </div>
        <div className="mt-7 card-red w-full p-4 text-center">
          <div className="text-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">amount due</div>
          <div className="text-display text-3xl text-white mt-1">$2.50</div>
        </div>
        <div className="mt-3 text-mono text-[10px] text-[color:var(--color-ink-3)] text-center">memo: INV-042 · cafe-mira</div>
      </div>
    </PhoneFrame>
  );
}

function MockPayroll() {
  const rows = [
    { who: "@adaeze", role: "designer", amt: "$1,200.00" },
    { who: "@nik", role: "engineer", amt: "$2,400.00" },
    { who: "@lina", role: "ops", amt: "$950.00" },
    { who: "@jo", role: "writer", amt: "$600.00" },
  ];
  return (
    <PhoneFrame width={310} height={640}>
      <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden">
        <div className="absolute top-10 inset-x-0 px-5">
          <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)]">payroll · oct</div>
          <div className="text-display text-2xl text-white mt-1">4 workers</div>
          <div className="text-display text-3xl text-white mt-1">
            $5,150<span className="text-[color:var(--color-ink-3)] text-base">.00</span>
          </div>
        </div>
        <div className="absolute top-44 inset-x-4 space-y-2">
          {rows.map((r, i) => (
            <motion.div
              key={r.who}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="card p-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)] flex items-center justify-center text-[10px] text-white">
                {r.who.replace("@", "")[0]}
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-white">{r.who}</div>
                <div className="text-[9px] text-mono uppercase tracking-wider text-[color:var(--color-ink-3)]">{r.role}</div>
              </div>
              <div className="text-[12px] text-mono text-white">{r.amt}</div>
              <div className="w-4 h-4 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center">
                <Check size={9} className="text-white" />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-5 inset-x-4">
          <div className="card-red p-3 flex items-center justify-between">
            <div>
              <div className="text-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">network fee · 4 txs</div>
              <div className="text-display text-xl text-white">$0.032</div>
            </div>
            <div className="text-mono text-[10px] text-[color:var(--color-neon)] uppercase tracking-[0.16em]">~8bps</div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function MockAgent() {
  return (
    <PhoneFrame width={310} height={640}>
      <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden font-mono text-[11px]">
        <div className="absolute top-10 inset-x-4 text-[color:var(--color-neon)] text-[10px] uppercase tracking-[0.18em]">
          agent · /api/mpp/analytics/@adaeze
        </div>
        <div className="absolute top-20 inset-x-4 space-y-2.5 text-[10.5px]">
          <Block color="white">
            <span className="text-[color:var(--color-ink-3)]">GET</span> /api/mpp/analytics/@adaeze
          </Block>
          <Block color="red">
            <span className="text-white/70">←</span> 402 Payment Required
            <br />
            <span className="text-[9px] text-[color:var(--color-ink-3)] mt-1 block">
              WWW-Authenticate: Payment
              <br />
              &nbsp;&nbsp;address=&quot;0x…&quot;, amount=&quot;250000&quot;, memo=&quot;wk_mpp_a31b&quot;
            </span>
          </Block>
          <Block color="white">
            <span className="text-[color:var(--color-ink-3)]">→</span> sign transferWithMemo
            <br />
            <span className="text-[9px] text-[color:var(--color-ink-3)] block">tx: 0x052cba278294b30…</span>
          </Block>
          <Block color="red">
            <span className="text-white/70">→</span> GET /api/mpp/analytics/@adaeze
            <br />
            <span className="text-[9px] text-[color:var(--color-ink-3)] block">Authorization: Payment 0x052c…</span>
          </Block>
          <Block color="white">
            <span className="text-[color:var(--color-ink-3)]">←</span> 200 OK
            <br />
            <span className="text-[9px] text-[color:var(--color-ink-3)] block">Payment-Receipt: verified · $0.25</span>
          </Block>
        </div>
        <div className="absolute bottom-5 inset-x-4 card-red p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">paid</div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-display text-xl text-white">$0.25</div>
            <div className="text-[10px] text-[color:var(--color-neon)] uppercase tracking-[0.16em]">MPP · IETF</div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Block({ children, color }: { children: React.ReactNode; color: "white" | "red" }) {
  return (
    <div
      className={`p-2.5 rounded-lg border ${
        color === "red"
          ? "bg-[color:var(--color-neon-soft)] border-[rgba(255,31,61,0.3)] text-white"
          : "bg-[color:var(--color-surface-2)] border-[color:var(--color-line)] text-white"
      } leading-relaxed`}
    >
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">{k}</span>
      <span className="text-white font-mono">{v}</span>
    </div>
  );
}

"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Send, QrCode, Wallet, ScanLine } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";

export default function HomePage() {
  return (
    <div className="relative">
      <BgFx />

      {/* hero */}
      <section className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-12">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <div className="chip chip-red mb-6"><span className="dot-live" /> live on Tempo mainnet · pathUSD</div>
            <h1 className="text-display text-[56px] sm:text-[72px] md:text-[84px] leading-[0.9] tracking-[-0.05em]">
              <span className="text-white">Pay a</span><br />
              <em className="italic font-light neon-text">@username</em><br />
              <span className="text-white">any chain in,</span><br />
              <span className="text-white">Tempo out.</span>
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-[color:var(--color-ink-2)] max-w-md">
              Wink is the name layer for money. One handle → same address on Base, Ethereum, Arbitrum, Optimism, Polygon, Tempo. Send USDC anywhere, recipient gets pathUSD on Tempo.
              <br /><br />
              <span className="text-white">No address to copy. No chain to pick. Just a wink.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/claim" className="btn-primary !px-7 !py-4 !text-[15px]">Claim @handle — get started <ArrowRight size={16} /></Link>
              <Link href="/send" className="btn-ghost !px-7 !py-4 !text-[15px]">Try sending</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Base", "Ethereum", "Arbitrum", "Optimism", "Polygon", "→", "Tempo"].map(c => (
                <span key={c} className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${c === "→" ? "border-transparent text-[color:var(--color-neon)]" : c === "Tempo" ? "bg-[color:var(--color-neon)] text-white border-[color:var(--color-neon)]" : "bg-white/[0.04] border-[color:var(--color-line)] text-[color:var(--color-ink-2)]"}`}>{c}</span>
              ))}
            </div>
            <div className="mt-6 text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">0% platform fee · ~$0.008 network · non-custodial</div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <PhoneFrame width={300} height={600}>
              <div className="absolute inset-0 bg-[#0a0a0c] p-6 flex flex-col">
                <div className="text-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-neon)]">to @lina · live</div>
                <div className="mt-4 text-display text-5xl text-white">$3<span className="text-[20px] text-[color:var(--color-ink-3)]">.00</span></div>
                <div className="mt-2 text-[12px] text-[color:var(--color-ink-2)]">thanks for the set 🌹</div>
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-[10px]"><span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">fee</span><span className="text-white font-mono">$0.008</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">settles</span><span className="text-white font-mono">pathUSD</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">chain</span><span className="text-white font-mono">Tempo</span></div>
                </div>
                <div className="mt-auto btn-primary justify-center !py-3 !text-[13px]">Wink $3.00 →</div>
              </div>
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* real features only */}
      <section className="relative border-t border-[color:var(--color-line)] py-20">
        <div className="max-w-[1100px] mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Send, title: "Send to @handle", desc: "Type @lina, pick amount, sign. transferWithMemo on Tempo. Recipient gets full amount, you pay ~$0.008.", link: "/send", cta: "Send now" },
              { icon: QrCode, title: "Pay with QR", desc: "Every handle has unique QR. Merchant prints, customer scans with any wallet — Base, Eth, Arb → Tempo pathUSD.", link: "/pay", cta: "Get QR" },
              { icon: Wallet, title: "One wallet everywhere", desc: "Same address on all EVM chains. USDC on Base/Eth/Arb/Op/Poly auto-forwards to pathUSD on Tempo via Relay.", link: "/wallet", cta: "Open wallet" },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card p-7">
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/20 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-[color:var(--color-neon)]" />
                </div>
                <div className="text-display text-xl text-white">{f.title}</div>
                <div className="text-[13px] text-[color:var(--color-ink-2)] mt-2 leading-relaxed">{f.desc}</div>
                <Link href={f.link} className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.14em] text-[color:var(--color-neon)] hover:text-white">{f.cta} <ArrowRight size={12} /></Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="card p-7">
              <div className="flex items-center gap-2 mb-3"><ScanLine size={16} className="text-[color:var(--color-neon)]" /><span className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">scan to pay</span></div>
              <h3 className="text-display text-2xl text-white">Scan any QR to pay</h3>
              <p className="text-[13px] text-[color:var(--color-ink-2)] mt-2">Wallet has Scan button — uses camera, parses winkpay.xyz/wink/@handle, /pay/@handle, or 0x address. No app needed.</p>
              <Link href="/wallet" className="mt-4 inline-flex btn-ghost !py-2.5 !text-[12px]">Open wallet → Scan</Link>
            </div>
            <div className="card p-7">
              <div className="flex items-center gap-2 mb-3"><Wallet size={16} className="text-[color:var(--color-neon)]" /><span className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">receive</span></div>
              <h3 className="text-display text-2xl text-white">Share @handle or link</h3>
              <p className="text-[13px] text-[color:var(--color-ink-2)] mt-2">Your payment link works from any chain. Base USDC → Tempo pathUSD. Copy handle, copy link, show QR. Address hidden by default.</p>
              <Link href="/wallet" className="mt-4 inline-flex btn-ghost !py-2.5 !text-[12px]">Get payment link</Link>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="relative border-t border-[color:var(--color-line)] py-20 bg-black/30">
        <div className="max-w-[1000px] mx-auto px-5 md:px-8">
          <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-3">how it works</div>
          <h2 className="text-display text-[36px] sm:text-[48px] leading-[0.9] text-white">Same rails. <em className="italic font-light text-[color:var(--color-ink-2)]">Everywhere.</em></h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Prepare", d: "Resolve @handle → recipient wallet. Create pending transfer with memo wk_<id>. Return exact on-chain params." },
              { n: "02", t: "Sign", d: "Payer signs transferWithMemo on Tempo via injected wallet or instant demo wallet faucet-funded with real pathUSD." },
              { n: "03", t: "Confirm", d: "We verify receipt on Tempo via viem before marking confirmed. Chain is source of truth." },
            ].map(s => (
              <div key={s.n} className="card p-6">
                <div className="text-mono text-[11px] text-[color:var(--color-neon)] mb-2">{s.n}</div>
                <div className="text-display text-xl text-white">{s.t}</div>
                <div className="text-[13px] text-[color:var(--color-ink-2)] mt-2 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/claim" className="btn-primary !px-6 !py-3">Claim @handle</Link>
            <Link href="/send" className="btn-ghost !px-6 !py-3">Send a wink</Link>
            <Link href="/docs" className="btn-ghost !px-6 !py-3">Read docs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

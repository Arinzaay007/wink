"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Mail, AtSign, Wallet, Check } from "lucide-react";
import { BgFx } from "@/components/BgFx";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [chain, setChain] = useState("base");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, handle: handle || undefined, chain, source: "waitlist-page" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setDone(true);
      // fetch count
      fetch("/api/waitlist").then(r=>r.json()).then(j=>setCount(j.count)).catch(()=>{});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="relative">
        <BgFx />
        <div className="max-w-[800px] mx-auto px-5 md:px-8 py-24 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="mx-auto w-20 h-20 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center text-3xl">✨</motion.div>
          <h1 className="mt-8 text-display text-[48px] leading-[0.95] text-white">You're in — <em className="italic font-light neon-text">early</em></h1>
          <p className="mt-4 text-[color:var(--color-ink-2)] max-w-md mx-auto leading-relaxed">
            {handle ? `@${handle.replace(/^@/, "")} reserved for you.` : "We'll email you when we open final launch."} Same address on every chain — Base, Eth, Arb, Op, Poly, Tempo — receivable everywhere from day one.
          </p>
          {count !== null && <div className="mt-4 text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">{count} early wallets ahead of you · mainnet live</div>}
          <div className="mt-10 flex justify-center gap-3">
            <Link href="/" className="btn-primary !px-7 !py-4">Back to home <ArrowRight size={16} /></Link>
            <Link href="/claim" className="btn-ghost !px-7 !py-4">Claim handle now</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white mb-10"><ArrowLeft size={14} /> back</Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
          <div>
            <div className="chip chip-red mb-6"><Sparkles size={11} /> /waitlist · early access · mainnet live</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">Get early</span><br />
              <em className="italic font-light neon-text">access</em><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              We're opening final launch soon. Join waitlist → reserve your @handle → auto-get wallet (same on every chain). Anyone can send you Base USDC → you get pathUSD on Tempo. Live proof: Base $1 → Tempo $0.974 in 12s.
            </p>

            <div className="mt-10 card p-7 space-y-5">
              <div>
                <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">email</div>
                <div className="flex items-center gap-3 bg-black border border-[color:var(--color-line)] focus-within:border-[color:var(--color-neon)] rounded-xl px-4 py-3">
                  <Mail size={14} className="text-[color:var(--color-ink-3)]" />
                  <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 bg-transparent outline-none text-white text-sm" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">desired @handle</div>
                  <div className="flex items-center gap-2 bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3">
                    <AtSign size={14} className="text-[color:var(--color-neon)]" />
                    <input value={handle} onChange={(e)=>setHandle(e.target.value.toLowerCase())} placeholder="arinzaay" className="flex-1 bg-transparent outline-none text-white text-sm" />
                  </div>
                </div>
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">main chain</div>
                  <select value={chain} onChange={(e)=>setChain(e.target.value)} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3 text-sm text-white">
                    <option value="base">Base</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>
              </div>

              <button onClick={submit} disabled={!email.includes("@") || submitting} className="btn-primary w-full justify-center !py-4 disabled:opacity-50">
                {submitting ? "Reserving..." : "Reserve my @handle"} <ArrowRight size={16} />
              </button>
              {error && <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3">{error}</div>}
              <div className="text-[11px] text-[color:var(--color-ink-3)]">No spam, ever. One email when we launch. Your wallet auto-creates on claim — same address on every chain.</div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card-red p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">what early gets</div>
              <div className="space-y-3 text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">
                <div className="flex gap-2"><Check size={14} className="text-[color:var(--color-neon)] mt-0.5" /><span><span className="text-white">Reserve @handle</span> — first-come, premium short names</span></div>
                <div className="flex gap-2"><Check size={14} className="text-[color:var(--color-neon)] mt-0.5" /><span><span className="text-white">Auto-wallet</span> — same on Base/Eth/Arb/Op/Poly/Tempo, receivable everywhere</span></div>
                <div className="flex gap-2"><Check size={14} className="text-[color:var(--color-neon)] mt-0.5" /><span><span className="text-white">Any chain in, Tempo out</span> — live proof $1 Base → $0.974 Tempo</span></div>
                <div className="flex gap-2"><Check size={14} className="text-[color:var(--color-neon)] mt-0.5" /><span><span className="text-white">0% fee</span> — ~8bps network, ~1s confirm, gasless option 1% min $0.01</span></div>
              </div>
            </div>
            <div className="card p-5">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">live proof · mainnet</div>
              <div className="text-[13px] text-white">Base 0x343d51… → Tempo 0x113e64…</div>
              <div className="text-[11px] text-[color:var(--color-ink-3)] mt-1">$1.00 → $0.974756 pathUSD · block 41099471 · auto-forward</div>
            </div>
            <div className="card p-5 flex items-start gap-3 text-[12px] text-[color:var(--color-ink-2)]"><Wallet size={14} className="text-[color:var(--color-neon)] mt-0.5" /><span>Your wallet is non-custodial — keys in browser, same address on every chain. Send Base USDC here, get pathUSD on Tempo. Fee friendly 1% min $0.01 max $0.10 self-sustaining.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

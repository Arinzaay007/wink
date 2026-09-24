"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Check, Users, Zap, ArrowRight, Globe2 } from "lucide-react";
import { BgFx } from "@/components/BgFx";

const WORKERS = [
  { h: "@adaeze", role: "designer", amt: 1200, chain: "Tempo", status: "paid" },
  { h: "@nik", role: "engineer", amt: 2400, chain: "Base → Tempo", status: "paid" },
  { h: "@lina", role: "ops", amt: 950, chain: "Tempo", status: "paid" },
  { h: "@jo", role: "writer", amt: 600, chain: "Arbitrum → Tempo", status: "paid" },
  { h: "@yuki", role: "engineer", amt: 1800, chain: "Tempo", status: "queued" },
  { h: "@eli", role: "designer", amt: 1400, chain: "Optimism → Tempo", status: "queued" },
];

export default function PayrollPage() {
  const total = WORKERS.reduce((s, w) => s + w.amt, 0);
  const paid = WORKERS.filter((w) => w.status === "paid").reduce((s, w) => s + w.amt, 0);

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="chip chip-red mb-6"><Users size={11} /> /payroll · oct 2026</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              Batch <em className="italic font-light neon-text">payroll</em><br /> to <span className="text-white">@handles</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">One click pays every worker — across chains. Cross-chain by default via Relay. Each arrival is verified independently on Tempo before we mark it done.</p>

            <div className="mt-10 grid grid-cols-3 gap-px bg-[color:var(--color-line)] rounded-2xl overflow-hidden border border-[color:var(--color-line)]">
              {[
                { k: "paid", v: `$${paid.toLocaleString()}`, sub: `${WORKERS.filter(w => w.status === "paid").length} workers` },
                { k: "queued", v: `$${(total - paid).toLocaleString()}`, sub: `${WORKERS.filter(w => w.status === "queued").length} pending` },
                { k: "fee", v: "$0.048", sub: "6 txs · ~8bps" },
              ].map((s, i) => (
                <div key={i} className="bg-[color:var(--color-surface)] p-6">
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">{s.k}</div>
                  <div className="text-display text-3xl text-white">{s.v}</div>
                  <div className="text-[11px] text-[color:var(--color-ink-3)] mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 card overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_1fr_100px_80px] gap-px bg-[color:var(--color-line)] text-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">
                {["worker", "amount", "corridor", "arrived", ""].map((h, i) => (
                  <div key={i} className="bg-[color:var(--color-surface)] px-4 py-3">{h}</div>
                ))}
              </div>
              <div className="divide-y divide-[color:var(--color-line)]">
                {WORKERS.map((w, i) => (
                  <motion.div key={w.h} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="grid grid-cols-[1fr_120px_1fr_100px_80px] gap-px text-[13px] items-center hover:bg-white/[0.015] transition">
                    <div className="px-4 py-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)] flex items-center justify-center text-[11px] text-white">{w.h.replace("@","")[0]}</div>
                      <div><div className="text-white text-[13px]">{w.h}</div><div className="text-[10px] text-mono uppercase tracking-wider text-[color:var(--color-ink-3)]">{w.role}</div></div>
                    </div>
                    <div className="px-4 py-3 font-mono text-white">${w.amt.toLocaleString()}</div>
                    <div className="px-4 py-3 text-[12px] text-[color:var(--color-ink-2)] flex items-center gap-1.5"><Globe2 size={11} className="text-[color:var(--color-neon)]" />{w.chain}</div>
                    <div className="px-4 py-3 text-[11px] text-mono text-[color:var(--color-ink-3)]">{w.status === "paid" ? <span className="text-[color:var(--color-neon)]">~{1 + i * 0.4}s</span> : <span className="text-[color:var(--color-ink-3)]">—</span>}</div>
                    <div className="px-4 py-3 text-right">{w.status === "paid" ? <span className="inline-flex w-5 h-5 rounded-full bg-[color:var(--color-neon)] items-center justify-center"><Check size={11} className="text-white" /></span> : <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--color-ink-3)]" />}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <button className="mt-8 btn-primary !py-4 !px-7 !text-base">Run payroll <Zap size={16} /></button>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="card p-7">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">corridors live</div>
              <h3 className="text-display text-2xl text-white mb-1">cross-chain by default</h3>
              <p className="text-[12px] text-[color:var(--color-ink-2)] mb-7">Workers stay on their chain. Quote → one deposit → solver fills the @handle&apos;s Tempo address → we verify the arrival on-Tempo.</p>
              <div className="space-y-3">
                {[
                  { from: "Base", to: "Tempo", t: "12s" },
                  { from: "Arbitrum", to: "Tempo", t: "8s" },
                  { from: "Optimism", to: "Tempo", t: "9s" },
                  { from: "Polygon", to: "Tempo", t: "14s" },
                  { from: "Ethereum", to: "Tempo", t: "32s" },
                ].map((c) => (
                  <div key={c.from} className="flex items-center gap-3 text-[13px]"><span className="text-white">{c.from}</span><ArrowRight size={14} className="text-[color:var(--color-neon)]" /><span className="text-white">{c.to}</span><span className="ml-auto font-mono text-[11px] text-[color:var(--color-ink-3)]">{c.t}</span></div>
                ))}
              </div>
            </div>
            <div className="card p-5 mt-5 text-[12px] text-[color:var(--color-ink-2)] leading-relaxed"><span className="text-white font-medium">Guardrails:</span> $5 min / $500 cap per bridge tx. Anything outside requires a workspace multisig approval.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

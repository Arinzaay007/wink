"use client";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { BgFx } from "@/components/BgFx";

export default function RequestIndex() {
  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="chip chip-red mb-6"><Clock size={11} /> /request</div>
        <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">Pay <span className="neon-text italic font-light">requests</span><span className="text-[color:var(--color-neon)]">.</span></h1>
        <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">Workers ask, payers approve. Memo-reconciled on Tempo.</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { handle: "lina", amt: "$248.00", meta: "Oct 1–14 · 62h" },
            { handle: "nik", amt: "$1,200.00", meta: "Oct payroll" },
            { handle: "adaeze", amt: "$950.00", meta: "design sprint" },
          ].map((r) => (
            <Link key={r.handle} href={`/request/${r.handle}`} className="card p-6 hover:border-[color:var(--color-line-2)] transition">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">@{r.handle}</div>
              <div className="text-display text-2xl text-white mt-2">{r.amt}</div>
              <div className="text-[12px] text-[color:var(--color-ink-2)] mt-1">{r.meta}</div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-neon)]">Open request <ArrowRight size={12} /></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

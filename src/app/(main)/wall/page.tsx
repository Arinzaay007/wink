"use client";
import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { BgFx } from "@/components/BgFx";

export default function WallIndex() {
  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="chip chip-red mb-6"><PartyPopper size={11} /> /wall</div>
        <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
          Spray <span className="neon-text italic font-light">walls</span><span className="text-[color:var(--color-neon)]">.</span>
        </h1>
        <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">Live walls for events. Every wink is a real on-chain transfer.</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { slug: "wedding-marisol", title: "Marisol & Jules", meta: "wedding · 48 winks · $284" },
            { slug: "demo-conf", title: "Demo Conf 2026", meta: "conference · 12 winks · $42" },
            { slug: "birthday-ada", title: "Ada's Birthday", meta: "party · 23 winks · $120" },
          ].map((w) => (
            <Link key={w.slug} href={`/wall/${w.slug}`} className="card p-6 hover:border-[color:var(--color-line-2)] transition">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">/wall/{w.slug}</div>
              <div className="text-display text-2xl text-white mt-3">{w.title}</div>
              <div className="text-[12px] text-[color:var(--color-ink-2)] mt-2">{w.meta}</div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-neon)]">Open wall <ArrowRight size={12} /></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

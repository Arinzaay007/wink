"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, PartyPopper, Plus, Volume2, QrCode } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";

interface Wink {
  id: string;
  handle: string;
  amount: number;
  x: number;
  y: number;
  rot: number;
}

const INITIAL: Wink[] = [
  { id: "1", handle: "@nik", amount: 3, x: 12, y: 18, rot: -6 },
  { id: "2", handle: "@ada", amount: 5, x: 72, y: 12, rot: 4 },
  { id: "3", handle: "@jo", amount: 1, x: 30, y: 38, rot: -2 },
  { id: "4", handle: "@rae", amount: 2, x: 78, y: 44, rot: 8 },
  { id: "5", handle: "@sami", amount: 10, x: 18, y: 66, rot: -4 },
  { id: "6", handle: "@vee", amount: 2, x: 64, y: 72, rot: 3 },
  { id: "7", handle: "@kim", amount: 1, x: 46, y: 26, rot: -8 },
  { id: "8", handle: "@marco", amount: 5, x: 54, y: 56, rot: 6 },
];

const STREAM = [
  { handle: "@nik", amount: 3 },
  { handle: "@ada", amount: 5 },
  { handle: "@jo", amount: 1 },
  { handle: "@rae", amount: 2 },
  { handle: "@sami", amount: 10 },
  { handle: "@vee", amount: 2 },
  { handle: "@kim", amount: 1 },
  { handle: "@marco", amount: 5 },
  { handle: "@eli", amount: 3 },
  { handle: "@yuki", amount: 7 },
];

const STATS = [
  { k: "sprayed", v: "48" },
  { k: "raised", v: "$284.00" },
  { k: "guests", v: "23" },
  { k: "avg wink", v: "$5.92" },
];

export default function WallPage() {
  const routeParams = useParams() as { slug?: string };
  const slug = routeParams.slug || "wedding-marisol";
  const [winks, setWinks] = useState<Wink[]>(INITIAL);
  const [stream, setStream] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = STREAM[stream % STREAM.length];
      setWinks((w) => [
        ...w.slice(-15),
        {
          id: Date.now().toString(),
          handle: next.handle,
          amount: next.amount,
          x: 8 + Math.random() * 80,
          y: 14 + Math.random() * 65,
          rot: (Math.random() - 0.5) * 16,
        },
      ]);
      setStream((s) => s + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [stream]);

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="chip chip-red mb-6"><PartyPopper size={11} /> /wall/{slug}</div>
            <h1 className="text-display text-[52px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">Marisol</span><br />
              <em className="italic font-light text-[color:var(--color-ink-2)]">&amp;</em> <span className="text-white">Jules</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">A live spray wall for the wedding. Every wink you see is a real on-chain transfer to <span className="text-white">@marisol</span> on Tempo, settled as pathUSD.</p>

            <div className="mt-8 grid grid-cols-2 gap-px bg-[color:var(--color-line)] rounded-2xl overflow-hidden border border-[color:var(--color-line)]">
              {STATS.map((s) => (
                <div key={s.k} className="bg-[color:var(--color-surface)] px-4 py-5">
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">{s.k}</div>
                  <div className="text-display text-2xl text-white">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 card p-5">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">join code</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-black border border-[color:var(--color-line)] rounded-xl p-3 text-center">
                  <div className="text-display text-2xl text-white tracking-wider">M & J · 25</div>
                  <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">tap to spray · opens scan-to-pay</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[color:var(--color-neon-soft)] border border-[rgba(255,31,61,0.3)] flex items-center justify-center text-[color:var(--color-neon)]"><QrCode size={18} /></div>
              </div>
            </div>

            <div className="mt-6 text-[12px] text-[color:var(--color-ink-3)] flex items-start gap-2"><Volume2 size={13} className="mt-0.5 shrink-0" /><span>Hosts pin this URL on a projector. Guests scan or type the join code to spray — each wink drops on screen in &lt;1s.</span></div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-2)]"><span className="dot-live" /> live · now</div>
              <div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">tempo · {winks.length} winks on-chain</div>
            </div>

            <div className="card aspect-[4/5] relative overflow-hidden bg-gradient-to-b from-[#1a0a14] via-[#0a0a0c] to-[#0a0a0c]">
              <BgFx variant="tight" />
              <div aria-hidden className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-20 blur-3xl" />
              <div aria-hidden className="absolute -bottom-32 -right-20 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-15 blur-3xl" />

              <div className="absolute top-8 inset-x-0 text-center z-10">
                <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-neon)]">spray wall · live</div>
                <div className="text-display text-3xl text-white mt-1">Marisol &amp; Jules</div>
                <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1.5">
                  {new Date().toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}{"  ·  "}{winks.length} winks · ${winks.reduce((s, w) => s + w.amount, 0).toFixed(2)}
                </div>
              </div>

              {winks.map((w) => (
                <motion.div key={w.id} initial={{ scale: 0, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="absolute" style={{ left: `${w.x}%`, top: `${w.y}%`, transform: `rotate(${w.rot}deg)` }}>
                  <div className="bg-[color:var(--color-neon)] text-white px-3.5 py-2 rounded-full whitespace-nowrap text-[13px] font-mono font-medium shadow-[0_0_24px_rgba(255,31,61,0.55)]">{w.handle}<span className="mx-1.5 opacity-70">·</span>${w.amount}</div>
                </motion.div>
              ))}

              <div className="absolute bottom-6 inset-x-6 flex items-center justify-between gap-4 z-10">
                <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] uppercase tracking-[0.18em]">tap to spray</div>
                <button className="bg-white text-black rounded-full px-5 py-2.5 text-[13px] font-medium inline-flex items-center gap-2 hover:bg-[color:var(--color-neon)] hover:text-white transition"><Plus size={14} /> wink</button>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <PhoneFrame width={210} height={430}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a14] via-[#0a0a0c] to-[#0a0a0c] overflow-hidden">
                  <div className="absolute top-10 inset-x-0 px-3 text-center"><div className="text-mono text-[8px] uppercase tracking-[0.22em] text-[color:var(--color-neon)]">live · 23 guests</div><div className="text-display text-[15px] text-white mt-1">M &amp; J</div></div>
                  {winks.slice(-6).map((w, i) => (
                    <div key={w.id} className="absolute" style={{ left: `${8 + (i * 13) % 80}%`, top: `${22 + (i * 17) % 55}%` }}>
                      <div className="bg-[color:var(--color-neon)] text-white px-2 py-0.5 rounded-full text-[9px] font-mono whitespace-nowrap" style={{ boxShadow: "0 0 12px rgba(255,31,61,0.6)" }}>{w.handle}·${w.amount}</div>
                    </div>
                  ))}
                  <div className="absolute bottom-4 inset-x-3"><div className="bg-white text-black rounded-full py-1.5 text-center text-[10px] font-medium">+ spray a wink</div></div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>

        <div className="mt-24">
          <div className="flex items-end justify-between mb-6"><h2 className="text-display text-3xl text-white">live ledger</h2><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">appended on every confirmed wink</div></div>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-px bg-[color:var(--color-line)] text-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">
              {["#", "from", "to", "amount", "tx"].map((h, i) => (<div key={i} className="bg-[color:var(--color-surface)] px-4 py-3">{h}</div>))}
            </div>
            <div className="divide-y divide-[color:var(--color-line)]">
              {[...winks].reverse().slice(0, 8).map((w, i) => (
                <div key={w.id} className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-px text-[13px] hover:bg-white/[0.015] transition">
                  <div className="px-4 py-3 text-mono text-[color:var(--color-ink-3)]">{String(winks.length - i).padStart(3, "0")}</div>
                  <div className="px-4 py-3 text-white font-mono text-[12px]">{w.handle}</div>
                  <div className="px-4 py-3 text-white">@marisol</div>
                  <div className="px-4 py-3 text-mono text-[color:var(--color-neon)]">+${w.amount.toFixed(2)}</div>
                  <div className="px-4 py-3 text-mono text-[color:var(--color-ink-3)] text-[10px]">0x{((i * 31337) >>> 0).toString(16).padStart(8, "0")}…</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

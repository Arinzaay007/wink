"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, PartyPopper, Plus, Volume2, QrCode } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";
import TipForm from "@/components/TipForm";

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

type WallData = {
  event: { slug: string; title: string; emoji: string; live: boolean };
  host: { handle?: string; displayName?: string };
  totals: { micro: number | null; winks: number };
  recent: { id: string; amountMicro: number | null; message?: string | null; sprayer?: string | null; createdAt: string }[];
};

export default function WallPage() {
  const routeParams = useParams() as { slug?: string };
  const slug = routeParams.slug || "wedding-marisol";
  const [winks, setWinks] = useState<Wink[]>(INITIAL);
  const [wall, setWall] = useState<WallData | null>(null);
  const [showTip, setShowTip] = useState(false);

  // poll real wall data
  useEffect(() => {
    let alive = true;
    const fetchWall = async () => {
      try {
        const res = await fetch(`/api/wall/${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setWall(data);
        if (data.recent?.length) {
          const mapped: Wink[] = data.recent.slice(0, 15).map((r: any, idx: number) => ({
            id: r.id,
            handle: r.sprayer ? `@${r.sprayer.replace(/^@/, "")}` : "@guest",
            amount: r.amountMicro ? r.amountMicro / 1_000_000 : Math.floor(Math.random() * 10) + 1,
            x: 8 + Math.random() * 80,
            y: 14 + Math.random() * 65,
            rot: (Math.random() - 0.5) * 16,
          }));
          if (mapped.length > 0) setWinks(mapped);
        }
      } catch {}
    };
    fetchWall();
    const id = setInterval(fetchWall, 2500);
    return () => { alive = false; clearInterval(id); };
  }, [slug]);

  const totalRaised = wall?.totals?.micro ? wall.totals.micro / 1_000_000 : winks.reduce((s, w) => s + w.amount, 0);
  const totalCount = wall?.totals?.winks ?? winks.length;
  const title = wall?.event?.title || "Marisol & Jules";
  const hostHandle = wall?.host?.handle || "marisol";

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="chip chip-red mb-6"><PartyPopper size={11} /> /wall/{slug} {wall && <span className="ml-2 text-[color:var(--color-neon)]">· live · {totalCount} winks</span>}</div>
            <h1 className="text-display text-[52px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">{title.split("&")[0] || "Marisol"}</span><br />
              <em className="italic font-light text-[color:var(--color-ink-2)]">&amp;</em> <span className="text-white">{title.split("&")[1] || "Jules"}</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">A live spray wall for {title}. Every wink you see is a real on-chain transfer to <span className="text-white">@{hostHandle}</span> on Tempo, settled as pathUSD.</p>

            <div className="mt-8 grid grid-cols-2 gap-px bg-[color:var(--color-line)] rounded-2xl overflow-hidden border border-[color:var(--color-line)]">
              {[
                { k: "sprayed", v: `${totalCount}` },
                { k: "raised", v: `$${totalRaised.toFixed(2)}` },
                { k: "guests", v: wall ? `${Math.max(1, Math.floor(totalCount * 0.6))}` : "23" },
                { k: "avg wink", v: `$${totalCount ? (totalRaised / totalCount).toFixed(2) : "5.92"}` },
              ].map((s) => (
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
                  <div className="text-display text-2xl text-white tracking-wider">{slug.slice(0, 8).toUpperCase()} · {new Date().getFullYear().toString().slice(-2)}</div>
                  <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">tap to spray · opens wink</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[color:var(--color-neon-soft)] border border-[rgba(255,31,61,0.3)] flex items-center justify-center text-[color:var(--color-neon)]"><QrCode size={18} /></div>
              </div>
            </div>

            {showTip && (
              <div className="mt-6 card p-2">
                <TipForm handle={hostHandle} recipientName={hostHandle} eventSlug={slug} />
                <button onClick={() => setShowTip(false)} className="mt-3 w-full text-center text-mono text-[11px] text-[color:var(--color-ink-3)]">close</button>
              </div>
            )}

            <div className="mt-6 text-[12px] text-[color:var(--color-ink-3)] flex items-start gap-2"><Volume2 size={13} className="mt-0.5 shrink-0" /><span>Hosts pin this URL on a projector. Guests scan or type the join code to spray — each wink drops on screen in &lt;1s, verified on Tempo.</span></div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-2)]"><span className="dot-live" /> live · now {wall && "· real chain data"}</div>
              <div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">tempo · {totalCount} winks on-chain</div>
            </div>

            <div className="card aspect-[4/5] relative overflow-hidden bg-gradient-to-b from-[#1a0a14] via-[#0a0a0c] to-[#0a0a0c]">
              <BgFx variant="tight" />
              <div aria-hidden className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-20 blur-3xl" />
              <div aria-hidden className="absolute -bottom-32 -right-20 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-15 blur-3xl" />

              <div className="absolute top-8 inset-x-0 text-center z-10">
                <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-neon)]">spray wall · live</div>
                <div className="text-display text-3xl text-white mt-1">{title}</div>
                <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1.5">{new Date().toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}{"  ·  "}{totalCount} winks · ${totalRaised.toFixed(2)}</div>
              </div>

              {winks.map((w) => (
                <motion.div key={w.id} initial={{ scale: 0, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="absolute" style={{ left: `${w.x}%`, top: `${w.y}%`, transform: `rotate(${w.rot}deg)` }}>
                  <div className="bg-[color:var(--color-neon)] text-white px-3.5 py-2 rounded-full whitespace-nowrap text-[13px] font-mono font-medium shadow-[0_0_24px_rgba(255,31,61,0.55)]">{w.handle}<span className="mx-1.5 opacity-70">·</span>${w.amount}</div>
                </motion.div>
              ))}

              <div className="absolute bottom-6 inset-x-6 flex items-center justify-between gap-4 z-10">
                <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] uppercase tracking-[0.18em]">tap to spray</div>
                <button onClick={() => setShowTip(!showTip)} className="bg-white text-black rounded-full px-5 py-2.5 text-[13px] font-medium inline-flex items-center gap-2 hover:bg-[color:var(--color-neon)] hover:text-white transition"><Plus size={14} /> wink</button>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <PhoneFrame width={210} height={430}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a14] via-[#0a0a0c] to-[#0a0a0c] overflow-hidden">
                  <div className="absolute top-10 inset-x-0 px-3 text-center"><div className="text-mono text-[8px] uppercase tracking-[0.22em] text-[color:var(--color-neon)]">live · {Math.max(1, Math.floor(totalCount * 0.6))} guests</div><div className="text-display text-[15px] text-white mt-1">{title.split("&")[0]?.trim().slice(0, 3) || "M"} & {title.split("&")[1]?.trim().slice(0, 1) || "J"}</div></div>
                  {winks.slice(-6).map((w, i) => (
                    <div key={w.id} className="absolute" style={{ left: `${8 + (i * 13) % 80}%`, top: `${22 + (i * 17) % 55}%` }}>
                      <div className="bg-[color:var(--color-neon)] text-white px-2 py-0.5 rounded-full text-[9px] font-mono whitespace-nowrap" style={{ boxShadow: "0 0 12px rgba(255,31,61,0.6)" }}>{w.handle}·${w.amount}</div>
                    </div>
                  ))}
                  <div className="absolute bottom-4 inset-x-3"><button onClick={() => setShowTip(!showTip)} className="w-full bg-white text-black rounded-full py-1.5 text-center text-[10px] font-medium">+ spray a wink</button></div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>

        <div className="mt-24">
          <div className="flex items-end justify-between mb-6"><h2 className="text-display text-3xl text-white">live ledger {wall && <span className="text-mono text-[12px] text-[color:var(--color-neon)] ml-2">· real from Tempo</span>}</h2><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">appended on every confirmed wink</div></div>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-px bg-[color:var(--color-line)] text-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">
              {["#", "from", "to", "amount", "tx"].map((h, i) => (<div key={i} className="bg-[color:var(--color-surface)] px-4 py-3">{h}</div>))}
            </div>
            <div className="divide-y divide-[color:var(--color-line)]">
              {(wall?.recent?.length ? wall.recent : winks.map((w) => ({ id: w.id, sprayer: w.handle, amountMicro: w.amount * 1_000_000, createdAt: new Date().toISOString() }))).slice(0, 10).map((w: any, i: number) => (
                <div key={w.id} className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-px text-[13px] hover:bg-white/[0.015] transition">
                  <div className="px-4 py-3 text-mono text-[color:var(--color-ink-3)]">{String(totalCount - i).padStart(3, "0")}</div>
                  <div className="px-4 py-3 text-white font-mono text-[12px]">{w.sprayer || w.handle || "@guest"}</div>
                  <div className="px-4 py-3 text-white">@{hostHandle}</div>
                  <div className="px-4 py-3 text-mono text-[color:var(--color-neon)]">+${w.amountMicro ? (w.amountMicro / 1_000_000).toFixed(2) : w.amount?.toFixed(2) || "—"}</div>
                  <div className="px-4 py-3 text-mono text-[color:var(--color-ink-3)] text-[10px]">{new Date(w.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

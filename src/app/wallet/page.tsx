"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Wallet, ArrowRight, RefreshCw, Globe2, Zap, ShieldCheck, Activity } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { loadDemoWallet, fetchBalance } from "@/lib/demoWallet";

type PortfolioWallet = {
  address: string;
  tempo: { micro: number; formatted: string };
  stranded: { chain: string; chainId: number; usdcMicro: number; usdc: string; eth: string; willForward: boolean }[];
  totalStrandedMicro: number;
  totalMicro: number;
};

type PortfolioData = {
  wallets: PortfolioWallet[];
  totals: { tempoMicro: number; strandedMicro: number; combinedMicro: number; tempoFormatted: string; strandedFormatted: string; combinedFormatted: string };
  guest?: boolean;
};

export default function WalletPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [demoAddr, setDemoAddr] = useState<string | null>(null);
  const [demoTempo, setDemoTempo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState<string | null>(null);

  useEffect(() => {
    const w = loadDemoWallet();
    if (w) {
      setDemoAddr(w.address);
      fetchBalance(w.address as any).then((b) => setDemoTempo(b.toFixed(2))).catch(() => {});
    }
    (async () => {
      try {
        // try with demo address if guest, else session
        const addr = w?.address ? `?address=${w.address}` : "";
        const res = await fetch(`/api/portfolio${addr}`);
        const json = await res.json();
        if (json.wallets) setData(json);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const totals = data?.totals;
  const hasStranded = data?.wallets?.some((w) => w.stranded.length > 0);

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="chip chip-red mb-5"><Wallet size={11} /> /wallet · portfolio · live on tempo</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">Your</span> <em className="italic font-light neon-text">rails</em><br />
              <span className="text-white">everywhere</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              One handle → many chains in, one balance out. We watch Base, Ethereum, Arbitrum, Optimism, Polygon for USDC and auto-forward to pathUSD on Tempo.
            </p>
          </div>
          <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">
            <span className="dot-live" /> {demoAddr ? `${demoAddr.slice(0, 6)}…${demoAddr.slice(-4)} · demo` : "connect wallet to see portfolio"}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-10">
          {[
            { k: "tempo · pathUSD", v: totals ? `$${totals.tempoFormatted}` : demoTempo ? `$${demoTempo}` : loading ? "…" : "$0.00", sub: "settled · verified on-chain" },
            { k: "stranded · other chains", v: totals ? `$${totals.strandedFormatted}` : "—", sub: hasStranded ? "will auto-forward · ~12s" : "no dust · all on tempo" },
            { k: "combined", v: totals ? `$${totals.combinedFormatted}` : demoTempo ? `$${demoTempo}` : "—", sub: "any chain in, tempo out" },
          ].map((s, i) => (
            <motion.div key={s.k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">{s.k}</div>
              <div className="text-display text-3xl text-white">{s.v}</div>
              <div className="text-[11px] text-[color:var(--color-ink-2)] mt-1.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div className="space-y-6">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-line)]">
                <h2 className="text-display text-xl text-white">wallets</h2>
                <button onClick={() => window.location.reload()} className="text-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] hover:text-white flex items-center gap-1.5"><RefreshCw size={12} /> refresh</button>
              </div>
              <div className="divide-y divide-[color:var(--color-line)]">
                {data?.wallets?.length ? data.wallets.map((w) => (
                  <div key={w.address} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[12px] text-white">{w.address.slice(0, 10)}…{w.address.slice(-6)}</div>
                      <div className="text-mono text-[11px] text-[color:var(--color-neon)]">${w.tempo.formatted} pathUSD</div>
                    </div>
                    {w.stranded.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {w.stranded.map((s) => (
                          <div key={s.chainId} className="flex items-center gap-3 text-[13px] bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3">
                            <Globe2 size={12} className="text-[color:var(--color-neon)]" />
                            <span className="text-white">{s.chain}</span>
                            <span className="text-mono text-[11px] text-[color:var(--color-ink-2)]">USDC ${s.usdc}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${s.willForward ? 'border-[color:var(--color-neon)] text-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)]' : 'border-[color:var(--color-line)] text-[color:var(--color-ink-3)]'}">{s.willForward ? "will auto-forward" : "dust"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-mono text-[11px] text-[color:var(--color-ink-3)]">No stranded USDC — all settled on Tempo. Any USDC sent to this address on Base/Eth/Arb/Op/Poly will auto-forward to pathUSD.</div>
                    )}
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <div className="text-display text-xl text-white">No wallets linked yet</div>
                    <p className="mt-2 text-[13px] text-[color:var(--color-ink-2)] max-w-md mx-auto">
                      {demoAddr ? `Demo wallet ${demoAddr.slice(0, 6)}… is local. Connect an injected wallet or claim a handle to link wallets to your account. Any USDC you receive on other chains will be swept to Tempo pathUSD.` : "Connect a wallet on a wink page — we link it automatically. Or claim a handle to start receiving."}
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                      <Link href="/wink/demo" className="btn-primary !py-2.5 !text-[13px]">Try wink demo <ArrowRight size={14} /></Link>
                      <Link href="/claim" className="btn-ghost !py-2.5 !text-[13px]">Claim handle</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">how auto-forward works</div>
              <div className="space-y-3 text-[13px] leading-relaxed text-[color:var(--color-ink-2)]">
                <div className="flex gap-3"><span className="text-[color:var(--color-neon)] font-mono">01</span><span><span className="text-white">User sends USDC</span> to your address on Base (or Eth/Arb/Op/Poly) — normal Transfer, not via Relay.</span></div>
                <div className="flex gap-3"><span className="text-[color:var(--color-neon)] font-mono">02</span><span><span className="text-white">Watcher detects</span> balance &gt; $1. Quotes Base USDC → Tempo pathUSD via Relay (approve + deposit).</span></div>
                <div className="flex gap-3"><span className="text-[color:var(--color-neon)] font-mono">03</span><span><span className="text-white">Solver fills</span> your Tempo address with pathUSD. We verify arrival independently on Tempo — chain is truth.</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="card-red p-6 relative overflow-hidden">
              <div aria-hidden className="absolute -top-20 -right-20 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,31,61,0.4), transparent 70%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4"><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">settlement doctrine</div><Activity size={14} className="text-[color:var(--color-neon)]" /></div>
                <h3 className="text-display text-2xl text-white leading-tight">Any chain in,<br />Tempo out. Always.</h3>
                <p className="mt-3 text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">Pay from anywhere — Base, Ethereum, Arbitrum, Solana (via Relay). Recipient gets pathUSD on Tempo. One name, one balance.</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {["Base", "Ethereum", "Arbitrum", "Optimism", "Polygon", "→", "Tempo"].map((c) => (
                    <span key={c} className={`text-[10px] font-mono px-2 py-1 rounded-full border ${c === "→" ? "border-transparent text-[color:var(--color-neon)]" : c === "Tempo" ? "bg-[color:var(--color-neon)] text-white border-[color:var(--color-neon)]" : "bg-black border-[color:var(--color-line)] text-[color:var(--color-ink-2)]"}`}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">guardrails</div>
              <div className="space-y-2 text-[12px] text-[color:var(--color-ink-2)]">
                <div className="flex justify-between"><span>$1 min / $500 cap per bridge</span><span className="text-white font-mono">Relay</span></div>
                <div className="flex justify-between"><span>fee</span><span className="text-[color:var(--color-neon)] font-mono">~8bps · $0.008</span></div>
                <div className="flex justify-between"><span>verification</span><span className="text-white font-mono">on-chain · Tempo</span></div>
              </div>
              <div className="mt-4 text-[11px] text-[color:var(--color-ink-3)] flex items-start gap-2"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-[color:var(--color-neon)]" /><span>BridgePanel UI parked — engine headless. We never trust solver status alone; we verify arrival on Tempo before marking confirmed.</span></div>
            </div>

            <div className="card p-5">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">live proof</div>
              <div className="text-[13px] text-white">Base 4.99 USDC → 4.962958 pathUSD</div>
              <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">direct 0x20c0…0000 · Tempo mainnet · real funds · verified</div>
              <Link href="/docs" className="mt-4 inline-flex items-center gap-1 text-[12px] text-[color:var(--color-neon)]">Read architecture <ArrowRight size={12} /></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

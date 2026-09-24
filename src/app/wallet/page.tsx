"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Wallet, ArrowRight, RefreshCw, Globe2, ShieldCheck, Activity, ArrowUpDown } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { loadDemoWallet, fetchBalance, walletClientFor, type DemoWallet } from "@/lib/demoWallet";
import { SOURCE_CHAINS } from "@/lib/relay";

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
  const [demoWallet, setDemoWallet] = useState<DemoWallet | null>(null);
  const [demoTempo, setDemoTempo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // swap back state
  const [swapAmount, setSwapAmount] = useState("2");
  const [destChainId, setDestChainId] = useState<number>(8453);
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  useEffect(() => {
    const w = loadDemoWallet();
    if (w) {
      setDemoAddr(w.address);
      setDemoWallet(w);
      fetchBalance(w.address as any).then((b) => setDemoTempo(b.toFixed(2))).catch(() => {});
    }
    (async () => {
      try {
        const addr = w?.address ? `?address=${w.address}` : "";
        const res = await fetch(`/api/portfolio${addr}`);
        const json = await res.json();
        if (json.wallets) setData(json);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const totals = data?.totals;
  const hasStranded = data?.wallets?.some((w) => w.stranded.length > 0);
  const mainWallet = data?.wallets?.[0] || (demoAddr ? { address: demoAddr, tempo: { formatted: demoTempo || "0.00", micro: 0 }, stranded: [], totalStrandedMicro: 0, totalMicro: 0 } as any : null);

  const doQuote = async () => {
    if (!mainWallet) return;
    setQuoting(true);
    setSwapError(null);
    setQuote(null);
    setSwapResult(null);
    try {
      const amountMicro = Math.round(parseFloat(swapAmount) * 1_000_000);
      const res = await fetch("/api/bridge/out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sender: mainWallet.address, destinationChainId: destChainId, amountMicro }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "quote failed");
      setQuote(json);
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : String(e));
    } finally { setQuoting(false); }
  };

  const doSwap = async () => {
    if (!quote || !demoWallet) {
      setSwapError("Connect demo wallet or use injected wallet — for now demo only");
      return;
    }
    setSwapping(true);
    setSwapError(null);
    try {
      const client = walletClientFor(demoWallet);
      const hashes: string[] = [];
      for (const step of quote.steps) {
        for (const item of step.items) {
          const d = item.data as any;
          if (!d?.to) continue;
          const hash = await client.sendTransaction({ to: d.to, data: d.data, value: d.value ? BigInt(d.value) : 0n });
          hashes.push(hash);
        }
      }
      setSwapResult(hashes.join(", "));
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : String(e));
    } finally { setSwapping(false); }
  };

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="chip chip-red mb-5"><Wallet size={11} /> /wallet · portfolio · live on tempo mainnet</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">Your</span> <em className="italic font-light neon-text">rails</em><br />
              <span className="text-white">everywhere</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              One handle → many chains in, one balance out. Auto-forward watches Base/Eth/Arb/Op/Poly for USDC → pathUSD on Tempo. Swap back when you need to spend on Base.
            </p>
          </div>
          <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">
            <span className="dot-live" /> {demoAddr ? `${demoAddr.slice(0, 6)}…${demoAddr.slice(-4)} · ${demoTempo ? `$${demoTempo}` : "demo"}` : "connect wallet to see portfolio"}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-10">
          {[
            { k: "tempo · pathUSD", v: totals ? `$${totals.tempoFormatted}` : demoTempo ? `$${demoTempo}` : loading ? "…" : "$0.00", sub: "settled · verified on-chain · mainnet" },
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
                      <div className="text-mono text-[11px] text-[color:var(--color-neon)]">${w.tempo.formatted} pathUSD · Tempo mainnet</div>
                    </div>
                    {w.stranded.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {w.stranded.map((s) => (
                          <div key={s.chainId} className="flex items-center gap-3 text-[13px] bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3">
                            <Globe2 size={12} className="text-[color:var(--color-neon)]" />
                            <span className="text-white">{s.chain}</span>
                            <span className="text-mono text-[11px] text-[color:var(--color-ink-2)]">USDC ${s.usdc}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-[color:var(--color-neon)] text-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)]">will auto-forward</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-mono text-[11px] text-[color:var(--color-ink-3)]">No stranded USDC — all settled on Tempo mainnet. Send USDC to this address on Base/Eth/Arb/Op/Poly and auto-forwarder sweeps to pathUSD.</div>
                    )}
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <div className="text-display text-xl text-white">No wallets linked yet</div>
                    <p className="mt-2 text-[13px] text-[color:var(--color-ink-2)] max-w-md mx-auto">
                      {demoAddr ? `Demo wallet ${demoAddr.slice(0, 6)}… is local. Any USDC you receive on other chains will be swept to Tempo pathUSD mainnet.` : "Connect a wallet on a wink page — we link it automatically."}
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
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown size={14} className="text-[color:var(--color-neon)]" />
                <h3 className="text-display text-xl text-white">swap back to Base</h3>
                <span className="ml-auto text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">Tempo pathUSD → Base USDC via Relay</span>
              </div>

              <div className="grid sm:grid-cols-[1fr_140px] gap-3">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">amount pathUSD</div>
                  <input value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} className="w-full bg-black border border-[color:var(--color-line)] focus:border-[color:var(--color-neon)] outline-none px-4 py-3 rounded-xl text-sm text-white" placeholder="2.00" />
                </div>
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">to chain</div>
                  <select value={destChainId} onChange={(e) => setDestChainId(Number(e.target.value))} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-3 py-3 text-sm text-white">
                    {SOURCE_CHAINS.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={doQuote} disabled={quoting || !mainWallet} className="btn-ghost flex-1 justify-center !py-3 disabled:opacity-50">{quoting ? "Quoting…" : "Get quote"}</button>
                <button onClick={doSwap} disabled={swapping || !quote} className="btn-primary flex-1 justify-center !py-3 disabled:opacity-50">{swapping ? "Swapping…" : "Swap on Tempo"} <ArrowRight size={14} /></button>
              </div>

              {quote && (
                <div className="mt-4 card p-4 text-[12px] font-mono">
                  <div className="flex justify-between"><span className="text-[color:var(--color-ink-3)] uppercase text-[10px]">requestId</span><span className="text-white">{quote.requestId?.slice(0, 18)}…</span></div>
                  <div className="flex justify-between mt-2"><span className="text-[color:var(--color-ink-3)] uppercase text-[10px]">to</span><span className="text-white">{quote.chainName} USDC</span></div>
                  <div className="flex justify-between mt-2"><span className="text-[color:var(--color-ink-3)] uppercase text-[10px]">steps</span><span className="text-[color:var(--color-neon)]">{quote.steps?.length || 0} txs on Tempo</span></div>
                </div>
              )}
              {swapResult && <div className="mt-3 text-[11px] font-mono text-[color:var(--color-neon)] break-all">txs: {swapResult}</div>}
              {swapError && <div className="mt-3 text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">{swapError}</div>}

              <div className="mt-4 text-[11px] text-[color:var(--color-ink-3)]">Min $1, cap $500. Solver fills Base USDC in ~12-30s. We verify arrival on Base before marking done. Same address works on all chains.</div>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="card-red p-6 relative overflow-hidden">
              <div aria-hidden className="absolute -top-20 -right-20 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,31,61,0.4), transparent 70%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4"><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">settlement doctrine</div><Activity size={14} className="text-[color:var(--color-neon)]" /></div>
                <h3 className="text-display text-2xl text-white leading-tight">Any chain in,<br />Tempo out. Always.<br /><em className="italic font-light text-[color:var(--color-ink-2)]">And back when you need.</em></h3>
                <p className="mt-3 text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">Pay from Base → settles pathUSD on Tempo mainnet. Need to spend on Base? Swap back via Relay. One name, one balance, both directions.</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {["Base", "→", "Tempo", "→", "Base"].map((c) => (
                    <span key={c+Math.random()} className={`text-[10px] font-mono px-2 py-1 rounded-full border ${c === "→" ? "border-transparent text-[color:var(--color-neon)]" : c === "Tempo" ? "bg-[color:var(--color-neon)] text-white border-[color:var(--color-neon)]" : "bg-black border-[color:var(--color-line)] text-[color:var(--color-ink-2)]"}`}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">guardrails</div>
              <div className="space-y-2 text-[12px] text-[color:var(--color-ink-2)]">
                <div className="flex justify-between"><span>$1 min / $500 cap</span><span className="text-white font-mono">Relay</span></div>
                <div className="flex justify-between"><span>fee</span><span className="text-[color:var(--color-neon)] font-mono">~8bps</span></div>
                <div className="flex justify-between"><span>verify</span><span className="text-white font-mono">on-chain both sides</span></div>
              </div>
              <div className="mt-4 text-[11px] text-[color:var(--color-ink-3)] flex items-start gap-2"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-[color:var(--color-neon)]" /><span>Engine headless, verified. Burner 0x9979Df52… auto-forwards mainnet USDC → Tempo pathUSD. Swap back via same Relay route.</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

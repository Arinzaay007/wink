"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Wallet, ArrowRight, RefreshCw, Copy, Check, Send, QrCode, Eye, EyeOff, AlertTriangle, AtSign, Globe2, X, ScanLine } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { loadDemoWallet, fetchBalance, sendWink } from "@/lib/demoWallet";
import { isAddress } from "viem";
import QrScanner from "@/components/QrScanner";

type Me = { handles: string[]; user?: { displayName?: string }; incoming?: any[] } | null;

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
};

export default function WalletPage() {
  const [me, setMe] = useState<Me>(null);
  const [data, setData] = useState<PortfolioData | null>(null);
  const [demoAddr, setDemoAddr] = useState<string | null>(null);
  const [demoPk, setDemoPk] = useState<string | null>(null);
  const [demoTempo, setDemoTempo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // modals
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [sendMode, setSendMode] = useState<"wink" | "address">("wink");

  // send wink
  const [winkHandle, setWinkHandle] = useState("");
  const [winkAmount, setWinkAmount] = useState("3");
  const [winkMemo, setWinkMemo] = useState("");
  // send address
  const [toExternal, setToExternal] = useState("");
  const [amountExternal, setAmountExternal] = useState("1");
  const [msgExternal, setMsgExternal] = useState("");

  const [sending, setSending] = useState(false);
  const [sendStage, setSendStage] = useState<"idle" | "signing" | "confirming" | "done" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);

  // receive
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // export pk
  const [showPk, setShowPk] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [copiedPk, setCopiedPk] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const w = loadDemoWallet();
    if (w) {
      setDemoAddr(w.address);
      setDemoPk(w.privateKey);
      fetchBalance(w.address as any).then((b) => setDemoTempo(b.toFixed(2))).catch(() => {});
    }
    (async () => {
      try {
        const [meRes, portRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/portfolio${w?.address ? `?address=${w.address}` : ""}`).then(r => r.json()).catch(() => null),
        ]);
        if (meRes) setMe(meRes);
        if (portRes?.wallets) {
          // filter out system forwarder if present (0x9979...)
          const filtered = {
            ...portRes,
            wallets: portRes.wallets.filter((x: any) => x.address.toLowerCase() !== "0x9979df521d62d21a62faf46f6badcfc70add573e".toLowerCase()),
          };
          // if after filter totals need recalc, keep original totals but hide burner wallet
          setData(filtered.wallets.length ? filtered : portRes);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const handle = me?.handles?.[0] || null;
  const paymentLink = handle ? `https://www.winkpay.xyz/wink/${handle}` : `https://www.winkpay.xyz/wink/demo`;

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {}
  };

  const handleScan = (text: string) => {
    setShowScanner(false);
    // parse winkpay.xyz/wink/@handle or /pay/@handle or 0x address or @handle
    try {
      const t = text.trim();
      if (isAddress(t as any)) {
        setToExternal(t);
        setSendMode("address");
        setShowSend(true);
        return;
      }
      // try URL
      if (t.includes("winkpay.xyz") || t.includes("/wink/") || t.includes("/pay/")) {
        const url = new URL(t.startsWith("http") ? t : `https://${t}`);
        const parts = url.pathname.split("/").filter(Boolean);
        // /wink/handle or /pay/handle
        const idxWink = parts.indexOf("wink");
        const idxPay = parts.indexOf("pay");
        let h = "";
        if (idxWink >= 0 && parts[idxWink + 1]) h = parts[idxWink + 1];
        else if (idxPay >= 0 && parts[idxPay + 1]) h = parts[idxPay + 1];
        if (h) {
          h = h.replace(/^@/, "").toLowerCase();
          setWinkHandle(h);
          setSendMode("wink");
          // check code param for invoice
          const code = url.searchParams.get("code");
          if (code) {
            // could prefill memo? for now just handle
          }
          setShowSend(true);
          return;
        }
      }
      // plain @handle or handle
      if (t.startsWith("@") || /^[a-z0-9_]{3,20}$/i.test(t)) {
        setWinkHandle(t.replace(/^@/, "").toLowerCase());
        setSendMode("wink");
        setShowSend(true);
        return;
      }
      // fallback: if contains 0x
      const match = t.match(/0x[a-fA-F0-9]{40}/);
      if (match) {
        setToExternal(match[0]);
        setSendMode("address");
        setShowSend(true);
        return;
      }
      // unknown — show as wink handle attempt
      setWinkHandle(t.slice(0, 20).toLowerCase());
      setSendMode("wink");
      setShowSend(true);
    } catch {
      // fallback
      setWinkHandle(text.slice(0, 20).replace(/[^a-z0-9_]/gi, "").toLowerCase());
      setSendMode("wink");
      setShowSend(true);
    }
  };

  const doSendWink = async () => {
    setSendError(null); setSendTxHash(null);
    try {
      const h = winkHandle.replace(/^@/, "").toLowerCase().trim();
      if (!h || h.length < 3) throw new Error("Enter a valid @handle");
      const amountMicro = Math.round(parseFloat(winkAmount) * 1_000_000);
      if (!isFinite(amountMicro) || amountMicro < 100_000) throw new Error("Minimum $0.10");
      const w = loadDemoWallet();
      if (!w) throw new Error("No wallet — claim a handle first");
      const bal = await fetchBalance(w.address as any);
      if (bal * 1_000_000 < amountMicro) throw new Error(`Insufficient — you have $${bal.toFixed(2)} pathUSD`);
      setSending(true); setSendStage("signing");
      const prep = await fetch("/api/wink/prepare", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: h, amountMicro, message: winkMemo || undefined, fromAddress: w.address }),
      }).then(r => r.json());
      if (!prep.transferId) throw new Error(prep.error ?? "prepare failed — handle not found?");
      const hash = await sendWink(w, { to: prep.to as any, amountMicro, memoHex: prep.memoHex as any });
      setSendTxHash(hash); setSendStage("confirming");
      let confirmed = false;
      for (let i = 0; i < 12 && !confirmed; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const c = await fetch("/api/wink/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transferId: prep.transferId, txHash: hash }) }).then(r => r.json());
        if (c.status === "confirmed") confirmed = true;
      }
      if (!confirmed) throw new Error("Broadcast but not verified yet — check dashboard");
      setSendStage("done");
      fetchBalance(w.address as any).then(b => setDemoTempo(b.toFixed(2))).catch(() => {});
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
      setSendStage("error");
    } finally { setSending(false); }
  };

  const doSendAddress = async () => {
    setSendError(null); setSendTxHash(null);
    try {
      if (!isAddress(toExternal as any)) throw new Error("Invalid 0x address");
      const amountMicro = Math.round(parseFloat(amountExternal) * 1_000_000);
      if (!isFinite(amountMicro) || amountMicro < 100_000) throw new Error("Minimum $0.10");
      const w = loadDemoWallet();
      if (!w) throw new Error("No wallet — claim a handle first");
      const bal = await fetchBalance(w.address as any);
      if (bal * 1_000_000 < amountMicro) throw new Error(`Insufficient — you have $${bal.toFixed(2)} pathUSD`);
      setSending(true); setSendStage("signing");
      const prep = await fetch("/api/send/address", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ toAddress: toExternal, amountMicro, message: msgExternal || undefined, fromAddress: w.address }),
      }).then(r => r.json());
      if (!prep.transferId) throw new Error(prep.error ?? "prepare failed");
      const hash = await sendWink(w, { to: prep.to as any, amountMicro, memoHex: prep.memoHex as any });
      setSendTxHash(hash); setSendStage("confirming");
      let confirmed = false;
      for (let i = 0; i < 12 && !confirmed; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const c = await fetch("/api/wink/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transferId: prep.transferId, txHash: hash }) }).then(r => r.json());
        if (c.status === "confirmed") confirmed = true;
      }
      if (!confirmed) throw new Error("Broadcast but not verified yet");
      setSendStage("done");
      fetchBalance(w.address as any).then(b => setDemoTempo(b.toFixed(2))).catch(() => {});
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
      setSendStage("error");
    } finally { setSending(false); }
  };

  const totals = data?.totals;
  const hasStranded = data?.wallets?.some(w => w.stranded.length > 0);

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        {/* header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="chip chip-red mb-4"><Wallet size={11} /> /wallet · {handle ? `@${handle}` : "portfolio"}</div>
            <h1 className="text-display text-[48px] sm:text-[60px] leading-[0.9] tracking-[-0.04em]">
              <span className="text-white">{handle ? `@${handle}` : "Your wallet"}</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-3 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              One handle, any chain in, Tempo out. Send to @handles or 0x addresses. Receive via username or payment link.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowScanner(true)} className="btn-ghost !py-3 !px-4 !text-[13px] border border-[color:var(--color-line)]">
              <ScanLine size={16} /> Scan
            </button>
            <button onClick={() => setShowReceive(true)} className="btn-ghost !py-3 !px-6 !text-[14px] border border-[color:var(--color-line)]">
              <QrCode size={16} /> Receive
            </button>
            <button onClick={() => { setShowSend(true); setSendStage("idle"); setSendError(null); }} className="btn-primary !py-3 !px-7 !text-[14px]">
              <Send size={16} /> Send
            </button>
          </div>
        </div>

        {/* balances */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {[
            { k: "tempo · pathUSD", v: totals ? `$${totals.tempoFormatted}` : demoTempo ? `$${demoTempo}` : loading ? "…" : "$0.00", sub: "settled · verified" },
            { k: "stranded · other chains", v: totals ? `$${totals.strandedFormatted}` : "—", sub: hasStranded ? "will auto-forward" : "all on tempo" },
            { k: "total", v: totals ? `$${totals.combinedFormatted}` : demoTempo ? `$${demoTempo}` : "—", sub: "any chain in, tempo out" },
          ].map((s, i) => (
            <motion.div key={s.k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">{s.k}</div>
              <div className="text-display text-3xl text-white">{s.v}</div>
              <div className="text-[11px] text-[color:var(--color-ink-2)] mt-1.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* transaction history — NEW */}
        <div className="card overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-line)]">
            <h3 className="text-display text-lg text-white">Transaction history</h3>
            <div className="flex items-center gap-2">
              <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">{me?.incoming?.length || 0} payments</span>
              <button onClick={() => window.location.reload()} className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] hover:text-white flex items-center gap-1"><RefreshCw size={10} /> refresh</button>
            </div>
          </div>
          {me?.incoming && me.incoming.length > 0 ? (
            <div className="divide-y divide-[color:var(--color-line)]">
              {me.incoming.slice(0, 20).map((t: any, i: number) => (
                <motion.div key={t.id || i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition">
                  <div className="w-9 h-9 rounded-full bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/20 flex items-center justify-center shrink-0">
                    <span className="text-[color:var(--color-neon)] text-[13px] font-medium">$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[14px] font-medium">+${(t.amountMicro / 1_000_000).toFixed(2)}</span>
                      <span className="text-[11px] text-[color:var(--color-ink-3)] font-mono">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${t.status === "confirmed" ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-amber-500/30 text-amber-300 bg-amber-500/10"}`}>{t.status}</span>
                    </div>
                    <div className="text-[12px] text-[color:var(--color-ink-2)] truncate mt-0.5">{t.message || t.memo || "Payment"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-mono text-[10px] text-[color:var(--color-ink-3)]">{t.fromAddress?.slice(0, 6)}…</div>
                    {t.txHash && <a href={`https://explore.tempo.xyz/tx/${t.txHash}`} target="_blank" className="text-[10px] text-[color:var(--color-neon)] hover:underline">view ↗</a>}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-[color:var(--color-line)] flex items-center justify-center mx-auto mb-3">
                <Wallet size={16} className="text-[color:var(--color-ink-3)]" />
              </div>
              <div className="text-white text-[14px]">No transactions yet</div>
              <div className="text-[12px] text-[color:var(--color-ink-3)] mt-1">Payments you receive will appear here with notification.</div>
            </div>
          )}
        </div>

        {/* actions + info */}
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            {/* quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowSend(true); setSendMode("wink"); }} className="card p-6 text-left hover:border-[color:var(--color-neon)]/40 transition group">
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/20 flex items-center justify-center mb-4 group-hover:bg-[color:var(--color-neon)] transition">
                  <AtSign size={18} className="text-[color:var(--color-neon)] group-hover:text-white" />
                </div>
                <div className="text-display text-[18px] text-white">Wink @handle</div>
                <div className="text-[12px] text-[color:var(--color-ink-2)] mt-1">Send to any username — memo-reconciled on Tempo</div>
              </button>
              <button onClick={() => { setShowSend(true); setSendMode("address"); }} className="card p-6 text-left hover:border-[color:var(--color-line-2)] transition group">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-[color:var(--color-line)] flex items-center justify-center mb-4">
                  <Send size={18} className="text-[color:var(--color-ink-2)]" />
                </div>
                <div className="text-display text-[18px] text-white">To address</div>
                <div className="text-[12px] text-[color:var(--color-ink-2)] mt-1">Send pathUSD to any 0x wallet on Tempo</div>
              </button>
            </div>

            {/* stranded */}
            {hasStranded && (
              <div className="card p-6">
                <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">stranded USDC detected</div>
                {data?.wallets.map(w => w.stranded.length > 0 && (
                  <div key={w.address} className="space-y-2">
                    {w.stranded.map(s => (
                      <div key={s.chainId} className="flex items-center gap-3 text-[13px] bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3">
                        <Globe2 size={12} className="text-[color:var(--color-neon)]" />
                        <span className="text-white">{s.chain}</span>
                        <span className="text-mono text-[11px] text-[color:var(--color-ink-2)]">USDC ${s.usdc}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-[color:var(--color-neon)] text-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)]">will auto-forward</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="mt-3 text-[11px] text-[color:var(--color-ink-3)]">Any USDC sent to your address on Base/Eth/Arb/Op/Poly auto-forwards to pathUSD on Tempo via Relay.</div>
              </div>
            )}

            {/* export */}
            {demoAddr && demoPk && (
              <div className="card p-6 border border-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">self-custody</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1"><AlertTriangle size={10} /> sensitive</span>
                </div>
                <p className="text-[12px] text-[color:var(--color-ink-2)]">Your wallet is stored only in this browser. Export private key and save in password manager.</p>
                {!confirmExport ? (
                  <button onClick={() => setConfirmExport(true)} className="mt-4 btn-ghost !py-2.5 !text-[12px] border border-amber-500/30"><Eye size={12} /> Export private key</button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-200"><strong>WARNING:</strong> Anyone with this key can steal funds on all chains. Never share.</div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmExport(false)} className="btn-ghost !py-2 !text-[11px]">Cancel</button>
                      <button onClick={() => setShowPk(v => !v)} className="btn-ghost !py-2 !text-[11px] border border-[color:var(--color-line)]">{showPk ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Reveal</>}</button>
                    </div>
                    {showPk && (
                      <div className="space-y-2">
                        <div className="bg-black border border-red-500/30 rounded-xl p-3 font-mono text-[11px] text-white break-all select-all">{demoPk}</div>
                        <button onClick={() => copy(demoPk, setCopiedPk)} className="btn-primary !py-2.5 !text-[12px] w-full justify-center"><Copy size={12} /> {copiedPk ? "Copied!" : "Copy private key"}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">receive</div>
              <h3 className="text-display text-xl text-white">Share your handle</h3>
              <p className="text-[12px] text-[color:var(--color-ink-2)] mt-2">Anyone can pay you from any chain — Base, Eth, Arb, Op, Poly → Tempo pathUSD.</p>
              <button onClick={() => setShowReceive(true)} className="mt-4 btn-primary w-full justify-center !py-3"><QrCode size={14} /> Show payment link</button>
            </div>
            <div className="card p-5 text-[11px] text-[color:var(--color-ink-3)]">
              <div className="flex items-center justify-between mb-2"><span>guardrails</span><RefreshCw size={12} /></div>
              <div className="space-y-1.5 text-[12px] text-[color:var(--color-ink-2)]">
                <div className="flex justify-between"><span>min / cap per bridge</span><span className="text-white font-mono">$1 / $500</span></div>
                <div className="flex justify-between"><span>fee</span><span className="text-[color:var(--color-neon)] font-mono">~8bps $0.008</span></div>
                <div className="flex justify-between"><span>verification</span><span className="text-white font-mono">on-chain Tempo</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEND MODAL */}
      <AnimatePresence>
        {showSend && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowSend(false)} />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} className="relative w-full max-w-[480px] card p-0 overflow-hidden border-[color:var(--color-line-2)]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-line)]">
                <h3 className="text-display text-xl text-white">Send</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowScanner(true)} className="h-8 px-3 rounded-full bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/30 text-[color:var(--color-neon)] text-[11px] flex items-center gap-1.5"><ScanLine size={12} /> Scan QR</button>
                  <button onClick={() => setShowSend(false)} className="w-8 h-8 rounded-full bg-white/5 border border-[color:var(--color-line)] flex items-center justify-center"><X size={14} /></button>
                </div>
              </div>

              <div className="p-2 flex gap-2 bg-black/50">
                <button onClick={() => setSendMode("wink")} className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition ${sendMode === "wink" ? "bg-[color:var(--color-neon)] text-white border-[color:var(--color-neon)]" : "bg-white/[0.03] text-[color:var(--color-ink-2)] border-[color:var(--color-line)]"}`}>Wink @handle</button>
                <button onClick={() => setSendMode("address")} className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition ${sendMode === "address" ? "bg-white text-black border-white" : "bg-white/[0.03] text-[color:var(--color-ink-2)] border-[color:var(--color-line)]"}`}>To 0x address</button>
              </div>

              <div className="p-6">
                {sendStage === "done" ? (
                  <div className="text-center py-6">
                    <div className="text-3xl">😉✨</div>
                    <div className="mt-3 text-white font-medium">Sent ${sendMode === "wink" ? winkAmount : amountExternal} pathUSD</div>
                    <div className="text-[11px] text-[color:var(--color-ink-2)] mt-1 break-all">tx {sendTxHash?.slice(0, 20)}…</div>
                    <div className="mt-4 flex gap-2 justify-center">
                      <a href={`https://explore.tempo.xyz/tx/${sendTxHash}`} target="_blank" className="btn-ghost !py-2 !text-[11px]">View Tempo ↗</a>
                      <button onClick={() => { setSendStage("idle"); setSendTxHash(null); }} className="btn-primary !py-2 !text-[11px]">Send again</button>
                    </div>
                  </div>
                ) : sendMode === "wink" ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">to @handle</div>
                      <div className="flex items-center gap-2 bg-black border border-[color:var(--color-line)] focus-within:border-[color:var(--color-neon)] rounded-xl px-4 py-3">
                        <span className="text-[color:var(--color-neon)]">@</span>
                        <input value={winkHandle} onChange={e => setWinkHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0,20))} placeholder="lina" className="flex-1 bg-transparent outline-none text-white text-[14px]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">amount USD</div>
                        <input value={winkAmount} onChange={e => setWinkAmount(e.target.value)} type="number" min="0.1" step="0.1" className="input !text-[14px]" />
                      </div>
                      <div>
                        <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">memo (optional)</div>
                        <input value={winkMemo} onChange={e => setWinkMemo(e.target.value)} maxLength={31} placeholder="thanks!" className="input !text-[14px]" />
                      </div>
                    </div>
                    <button onClick={doSendWink} disabled={sending} className="btn-primary w-full justify-center !py-3.5 disabled:opacity-50">
                      <Send size={14} /> {sending ? (sendStage === "signing" ? "Signing…" : "Confirming…") : `Wink $${winkAmount || "0"}`}
                    </button>
                    {sendError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">{sendError}</div>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">recipient 0x (Tempo)</div>
                      <input value={toExternal} onChange={e => setToExternal(e.target.value)} placeholder="0x..." className="input font-mono !text-[13px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">amount USD</div>
                        <input value={amountExternal} onChange={e => setAmountExternal(e.target.value)} type="number" min="0.1" step="0.1" className="input !text-[14px]" />
                      </div>
                      <div>
                        <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">memo</div>
                        <input value={msgExternal} onChange={e => setMsgExternal(e.target.value)} maxLength={31} placeholder="thanks!" className="input !text-[14px]" />
                      </div>
                    </div>
                    <button onClick={doSendAddress} disabled={sending} className="btn-primary w-full justify-center !py-3.5 disabled:opacity-50">
                      <Send size={14} /> {sending ? (sendStage === "signing" ? "Signing…" : "Confirming…") : `Send $${amountExternal || "0"}`}
                    </button>
                    {sendError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">{sendError}</div>}
                    <div className="text-[10px] text-[color:var(--color-ink-3)]">Fee ~$0.008 · recipient gets full amount · verified on Tempo</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIVE MODAL */}
      <AnimatePresence>
        {showReceive && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowReceive(false)} />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} className="relative w-full max-w-[440px] card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-line)]">
                <h3 className="text-display text-xl text-white">Receive</h3>
                <button onClick={() => setShowReceive(false)} className="w-8 h-8 rounded-full bg-white/5 border border-[color:var(--color-line)] flex items-center justify-center"><X size={14} /></button>
              </div>
              <div className="p-6 space-y-5">
                {handle ? (
                  <>
                    <div className="card p-4 bg-black">
                      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-2">your @handle</div>
                      <div className="flex items-center justify-between">
                        <div className="text-display text-2xl text-white">@{handle}</div>
                        <button onClick={() => copy(`@${handle}`, setCopiedHandle)} className="btn-ghost !py-1.5 !px-3 !text-[12px]"><Copy size={12} /> {copiedHandle ? "Copied" : "Copy"}</button>
                      </div>
                    </div>
                    <div className="card p-4 bg-black">
                      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-2">payment link · works from any chain</div>
                      <div className="font-mono text-[12px] text-white break-all">{paymentLink}</div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => copy(paymentLink, setCopiedLink)} className="btn-primary flex-1 justify-center !py-2.5 !text-[12px]"><Copy size={12} /> {copiedLink ? "Copied!" : "Copy link"}</button>
                        <Link href={paymentLink} className="btn-ghost flex-1 justify-center !py-2.5 !text-[12px]">Open <ArrowRight size={12} /></Link>
                      </div>
                      <div className="mt-3 text-[11px] text-[color:var(--color-ink-2)]">Base, Eth, Arb, Op, Poly USDC → Tempo pathUSD. Sender connects wallet on any chain, you get pathUSD.</div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">wallet address · hidden by default</div>
                        <button onClick={() => setShowAddress(v => !v)} className="text-[11px] text-[color:var(--color-ink-2)] flex items-center gap-1">{showAddress ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}</button>
                      </div>
                      {showAddress ? (
                        <div className="space-y-2">
                          <div className="font-mono text-[11px] text-white break-all bg-black border border-[color:var(--color-line)] rounded-xl p-3">{demoAddr || "—"}</div>
                          <button onClick={() => demoAddr && copy(demoAddr, setCopiedAddr)} className="btn-ghost w-full justify-center !py-2 !text-[11px]"><Copy size={11} /> {copiedAddr ? "Copied!" : "Copy address"}</button>
                          <div className="text-[10px] text-[color:var(--color-ink-3)]">Same address on all EVM chains. Prefer sharing @handle or payment link — address is fallback.</div>
                        </div>
                      ) : (
                        <div className="text-[12px] text-[color:var(--color-ink-3)]">Address hidden — share your @handle instead. Click Show to reveal.</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-display text-xl text-white">No handle yet</div>
                    <p className="text-[13px] text-[color:var(--color-ink-2)] mt-2">Claim a handle to get your payment link.</p>
                    <Link href="/claim" className="mt-4 inline-flex btn-primary !py-2.5 !px-5">Claim @handle <ArrowRight size={14} /></Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCAN MODAL */}
      <AnimatePresence>
        {showScanner && (
          <QrScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

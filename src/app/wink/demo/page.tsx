"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Copy, ShieldCheck, Send, Wallet, AlertCircle } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";

const PRESETS = [1, 3, 5, 10, 25];
const MEMOS = ["thanks for the set 🌹", "bar tab", "loved the talk", "rent (sorry)", "for the coffee"];

export default function WinkDemoPage() {
  const recipientHandle = "lina";
  const [amount, setAmount] = useState(3);
  const [memo, setMemo] = useState(MEMOS[1]);
  const [stage, setStage] = useState<"compose" | "sign" | "confirmed">("compose");
  const txHash = "0x4fe60d47aa22b9f805412fd550aa86945f7770dd12f5284907984932baee1335";

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10"><ArrowLeft size={14} /> back</Link>
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6"><Send size={11} /> /wink/{recipientHandle} · demo</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">Send a <em className="italic font-light neon-text">wink</em><br /> to <span className="text-white">@{recipientHandle}</span><span className="text-[color:var(--color-neon)]">.</span></h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">Demo wallet is faucet-funded on Tempo testnet. On mainnet you&apos;ll connect MetaMask / Rabby / Frame.</p>

            <div className="mt-12 flex items-center gap-3 text-xs text-mono uppercase tracking-[0.18em]">
              {(["compose", "sign", "confirmed"] as const).map((s, i) => {
                const active = stage === s;
                const done = (s === "compose" && stage !== "compose") || (s === "sign" && stage === "confirmed");
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${active ? "border-[color:var(--color-neon)] text-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)]" : done ? "border-[color:var(--color-line-2)] text-[color:var(--color-ink-2)]" : "border-[color:var(--color-line)] text-[color:var(--color-ink-3)]"}`}>{done ? <Check size={11} /> : <span>0{i + 1}</span>}{s}</div>
                    {i < 2 && <div className="w-8 h-px bg-[color:var(--color-line)]" />}
                  </div>
                );
              })}
            </div>

            {stage === "compose" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card p-7">
                <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">amount</div>
                <div className="flex items-baseline gap-2"><span className="text-display text-[64px] text-white leading-none">${amount}</span><span className="text-display text-[28px] text-[color:var(--color-ink-3)] leading-none">.00</span></div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (<button key={p} onClick={() => setAmount(p)} className={`px-4 py-2 rounded-full text-sm font-mono border transition ${amount === p ? "border-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)] text-[color:var(--color-neon)]" : "border-[color:var(--color-line)] text-[color:var(--color-ink-2)] hover:border-[color:var(--color-line-2)]"}`}>${p}</button>))}
                  <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))} className="w-20 bg-transparent border-b border-[color:var(--color-line)] focus:border-[color:var(--color-neon)] outline-none px-2 py-2 text-sm text-white font-mono" />
                </div>
                <div className="mt-9 text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">memo (optional)</div>
                <div className="flex flex-wrap gap-2 mb-3">{MEMOS.map((m) => (<button key={m} onClick={() => setMemo(m)} className={`px-3.5 py-1.5 rounded-full text-xs border transition ${memo === m ? "border-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)] text-white" : "border-[color:var(--color-line)] text-[color:var(--color-ink-2)] hover:border-[color:var(--color-line-2)]"}`}>{m}</button>))}</div>
                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="add a memo…" className="w-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)] focus:border-[color:var(--color-neon)] outline-none px-4 py-3 rounded-xl text-sm text-white" />
                <div className="mt-9 flex items-center justify-between text-[12px] font-mono text-[color:var(--color-ink-3)] border-t border-[color:var(--color-line)] pt-5"><div className="flex flex-col gap-1"><span>network fee · ~8bps</span><span>memo on-chain</span></div><div className="flex flex-col gap-1 text-right"><span className="text-white">$0.008</span><span className="text-[color:var(--color-neon)]">wk_{amount}a31b</span></div></div>
                <button onClick={() => setStage("sign")} className="mt-7 btn-primary w-full justify-center !py-4 !text-base">Continue <ArrowRight size={16} /></button>
              </motion.div>
            )}

            {stage === "sign" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card-red p-7">
                <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center"><Wallet size={16} className="text-white" /></div><div><div className="text-white font-medium">demo wallet</div><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">0x71Ae…F29b · $842.15 pathUSD · faucet</div></div></div>
                <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">you&apos;re about to sign</div>
                <pre className="bg-black/40 border border-[rgba(255,31,61,0.25)] rounded-xl p-4 text-[11px] text-white/90 overflow-x-auto leading-relaxed">{`transferWithMemo(
  to:     0x9aF2…c4D8,
  amount: ${amount}.00 pathUSD,
  memo:   "wk_${amount}a31b"
)`}</pre>
                <div className="mt-5 flex items-center gap-2 text-[12px] text-[color:var(--color-ink-2)]"><ShieldCheck size={13} className="text-[color:var(--color-neon)]" />keys never leave your browser. non-custodial.</div>
                <div className="mt-6 flex gap-2"><button onClick={() => setStage("compose")} className="btn-ghost flex-1 justify-center">Back</button><button onClick={() => setStage("confirmed")} className="btn-primary flex-1 justify-center !py-4">Sign & send <Sparkles size={14} /></button></div>
              </motion.div>
            )}

            {stage === "confirmed" && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 card p-8 text-center relative overflow-hidden">
                <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,31,61,0.25), transparent 70%)" }} />
                <div className="relative">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center neon-glow"><Check size={28} className="text-white" /></motion.div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mt-6">wink sent</div>
                  <div className="text-display text-[44px] text-white mt-2">${amount}.00</div>
                  <div className="text-[color:var(--color-ink-2)] text-sm">to <span className="text-white">@{recipientHandle}</span></div>
                  <div className="mt-7 card p-4 text-left space-y-2 text-[12px] font-mono">
                    <div className="flex justify-between"><span className="text-[color:var(--color-ink-3)] uppercase tracking-[0.16em] text-[10px]">tx</span><span className="text-white">{txHash.slice(0, 18)}…</span></div>
                    <div className="flex justify-between"><span className="text-[color:var(--color-ink-3)] uppercase tracking-[0.16em] text-[10px]">memo</span><span className="text-[color:var(--color-neon)]">wk_{amount}a31b</span></div>
                  </div>
                  <div className="mt-7 flex gap-2 justify-center"><a href="#" className="btn-ghost !py-2.5 !px-4 !text-[13px]"><Copy size={13} /> copy tx</a><Link href="/" className="btn-primary !py-2.5 !px-4 !text-[13px]">Send another <ArrowRight size={14} /></Link></div>
                </div>
              </motion.div>
            )}

            <div className="mt-8 text-[12px] text-[color:var(--color-ink-3)] flex items-start gap-2"><AlertCircle size={13} className="mt-0.5 shrink-0" /><span>Demo wallet is funded by the tempo faucet. On mainnet you&apos;ll connect an injected wallet (MetaMask, Rabby, Frame).</span></div>
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[color:var(--color-neon)] to-[color:var(--color-neon-deep)] flex items-center justify-center text-display text-2xl text-white">l</div>
                <div className="flex-1"><div className="flex items-center gap-2"><span className="text-display text-2xl text-white">@{recipientHandle}</span><span className="w-4 h-4 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center"><Check size={10} className="text-white" /></span></div><div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">0x9aF2…c4D8 · tempo · 42431</div></div>
              </div>
              <p className="text-sm text-[color:var(--color-ink-2)] mt-4 leading-relaxed">live sound · dj · last winked 2h ago</p>
              <div className="mt-5 grid grid-cols-3 gap-px bg-[color:var(--color-line)] rounded-xl overflow-hidden border border-[color:var(--color-line)]">
                {[{ k: "received", v: "$1,284" }, { k: "winks", v: "412" }, { k: "last", v: "2h ago" }].map((s) => (<div key={s.k} className="bg-black px-3 py-3 text-center"><div className="text-display text-lg text-white">{s.v}</div><div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mt-0.5">{s.k}</div></div>))}
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <PhoneFrame width={280} height={580}>
                <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden">
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[color:var(--color-neon)] opacity-25 blur-3xl" />
                  <div className="absolute top-12 inset-x-0 px-5 text-center"><div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-1">to</div><div className="text-display text-3xl text-white">@{recipientHandle}</div></div>
                  <div className="absolute top-32 inset-x-0 flex justify-center"><div className="text-display text-[72px] leading-none neon-text">${amount}</div></div>
                  <div className="absolute top-[200px] inset-x-5 text-center"><div className="text-[11px] text-white/80 italic">&quot;{memo}&quot;</div></div>
                  <div className="absolute bottom-5 inset-x-5 btn-primary w-full justify-center !py-3 !text-[13px]">{stage === "compose" && "Continue"}{stage === "sign" && "Sign in wallet"}{stage === "confirmed" && "Sent ✓"}</div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



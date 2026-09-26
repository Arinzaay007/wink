"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Send, ShieldCheck, X, ArrowRight, Wallet, AtSign, DollarSign, Zap } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";
import TipForm from "@/components/TipForm";

const WIZARD_KEY = "wink_demo_wizard_seen_v2";

const STEPS = [
  {
    icon: AtSign,
    title: "Pay a @username",
    desc: "No address to copy. No chain to pick. Wink is the name layer for money on Tempo. You type @lina, we resolve to her wallet + memo-reconcile on-chain.",
    detail: "Live on Tempo mainnet · pathUSD",
  },
  {
    icon: Send,
    title: "Type any @handle",
    desc: "Try @demo, or after you claim yours, send to yourself to test. Real validation — if handle doesn't exist, prepare returns handle-not-found. That's the real API.",
    detail: "Editable at top · e.g. @daveed",
  },
  {
    icon: DollarSign,
    title: "Pick amount",
    desc: "Presets $1, $3, $5, $10 or custom. Minimum $0.10. Recipient gets full amount — you pay ~$0.008 network fee. No platform fee.",
    detail: "0% Wink fee · ~8bps network",
  },
  {
    icon: Wallet,
    title: "Choose wallet",
    desc: "My wallet = MetaMask / Rabby / Tempo Wallet (injected EIP-1193). Instant demo wallet = generated in-browser, faucet-funded with real pathUSD, non-custodial, keys never leave browser.",
    detail: "Two sources, one flow",
  },
  {
    icon: Zap,
    title: "Sign & confirmed",
    desc: "We call transferWithMemo(to, amount, memoHex) on Tempo. Then POST /api/wink/confirm verifies receipt on-chain, writes ledger, shows tx hash. That's the source of truth.",
    detail: "Verified via viem · ledger entry",
  },
];

function Wizard({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[440px] card p-0 overflow-hidden border-[color:var(--color-neon)]/30 shadow-[0_0_80px_rgba(255,31,61,0.15)]">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[color:var(--color-neon)] opacity-[0.12] blur-3xl pointer-events-none" />
        
        <div className="relative p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-[color:var(--color-neon)]" : i < idx ? "w-4 bg-white/40" : "w-4 bg-white/10"}`} />
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 border border-[color:var(--color-line)] flex items-center justify-center text-[color:var(--color-ink-3)] hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[color:var(--color-neon)] to-[color:var(--color-neon-deep)] flex items-center justify-center mb-5">
            <Icon size={22} className="text-white" />
          </div>

          <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-neon)] mb-2">step {idx + 1} of {STEPS.length} · {step.detail}</div>
          <h3 className="text-display text-[28px] leading-[0.95] text-white mb-3">{step.title}</h3>
          <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-2)]">{step.desc}</p>

          <div className="mt-8 flex items-center gap-2">
            {idx > 0 ? (
              <button onClick={() => setIdx(i => i - 1)} className="btn-ghost !py-3 !px-5">Back</button>
            ) : (
              <button onClick={onClose} className="btn-ghost !py-3 !px-5">Skip</button>
            )}
            <button
              onClick={() => {
                if (idx === STEPS.length - 1) {
                  localStorage.setItem(WIZARD_KEY, "1");
                  onClose();
                } else {
                  setIdx(i => i + 1);
                }
              }}
              className="btn-primary flex-1 justify-center !py-3"
            >
              {idx === STEPS.length - 1 ? "Start winking" : "Next"} <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                localStorage.setItem(WIZARD_KEY, "1");
                onClose();
              }}
              className="text-[11px] text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)] hover:text-white"
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WinkDemoPage() {
  const [recipientHandle, setRecipientHandle] = useState("demo");
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(WIZARD_KEY);
    if (!seen) {
      const t = setTimeout(() => setShowWizard(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="relative">
      <BgFx />
      {showWizard && <Wizard onClose={() => setShowWizard(false)} />}

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition">
            <ArrowLeft size={14} /> back
          </Link>
          <button
            onClick={() => setShowWizard(true)}
            className="text-[11px] font-mono uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] hover:text-[color:var(--color-neon)] border border-[color:var(--color-line)] rounded-full px-3 py-1.5"
          >
            how it works?
          </button>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6">
              <Send size={11} /> /wink/{recipientHandle} · live on tempo mainnet
            </div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              Send a <em className="italic font-light neon-text">wink</em>
              <br /> to <span className="text-white">@{recipientHandle}</span>
              <span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              Real flow — no simulation. Memo-reconciled, settled as pathUSD on Tempo. Recipient gets full amount — sender pays ~$0.008 network fee. Works with any wallet.
            </p>

            <div className="mt-8 card p-4 flex items-center gap-3">
              <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] shrink-0">to @handle</span>
              <div className="flex items-center gap-2 flex-1 bg-black border border-[color:var(--color-line)] rounded-xl px-3 py-2 focus-within:border-[color:var(--color-neon)] transition">
                <span className="text-[color:var(--color-neon)]">@</span>
                <input
                  value={recipientHandle}
                  onChange={(e) => setRecipientHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0,20))}
                  placeholder="demo"
                  className="flex-1 bg-transparent outline-none text-white text-[14px]"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="card p-2">
                <TipForm key={recipientHandle} handle={recipientHandle} recipientName={recipientHandle} />
              </div>
              <div className="mt-4 card p-4 flex items-start gap-3 text-[12px] text-[color:var(--color-ink-2)]">
                <ShieldCheck size={14} className="text-[color:var(--color-neon)] mt-0.5 shrink-0" />
                <span>
                  Non-custodial. Keys never leave browser. <strong className="text-white">Real pathUSD on Tempo mainnet.</strong> Connect MetaMask / Rabby / Tempo Wallet, or use instant demo wallet (faucet-funded). Every transfer verified on-chain via <code className="font-mono">transferWithMemo</code> before confirmed.
                </span>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[color:var(--color-neon)] to-[color:var(--color-neon-deep)] flex items-center justify-center text-display text-2xl text-white">
                  {recipientHandle[0] || "d"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-display text-2xl text-white">@{recipientHandle}</span>
                    <span className="w-4 h-4 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </span>
                  </div>
                  <div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">tempo · pathUSD · verified</div>
                </div>
              </div>
              <p className="text-sm text-[color:var(--color-ink-2)] mt-4 leading-relaxed">
                Real handle. Type any @handle you claimed (e.g. after you claim @daveed, send to @daveed). If handle doesn&apos;t exist, prepare will return handle-not-found — that&apos;s real validation.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-px bg-[color:var(--color-line)] rounded-xl overflow-hidden border border-[color:var(--color-line)]">
                {[
                  { k: "fee", v: "$0.008" },
                  { k: "settles", v: "pathUSD" },
                  { k: "chain", v: "Tempo" },
                ].map((s) => (
                  <div key={s.k} className="bg-black px-3 py-3 text-center">
                    <div className="text-display text-lg text-white">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mt-0.5">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <PhoneFrame width={280} height={580}>
                <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden">
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[color:var(--color-neon)] opacity-25 blur-3xl" />
                  <div className="absolute top-12 inset-x-0 px-5 text-center">
                    <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-1">to</div>
                    <div className="text-display text-3xl text-white">@{recipientHandle}</div>
                    <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">tempo · verified</div>
                  </div>
                  <div className="absolute top-36 inset-x-0 flex justify-center">
                    <div className="text-display text-[64px] leading-none neon-text">
                      $3<span className="text-[28px] text-[color:var(--color-ink-3)]">.00</span>
                    </div>
                  </div>
                  <div className="absolute top-[220px] inset-x-5 space-y-2.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">fee</span>
                      <span className="text-white font-mono">$0.008 · ~8bps</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">memo</span>
                      <span className="text-[color:var(--color-neon)] font-mono">wk_a31b</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">settles</span>
                      <span className="text-white font-mono">pathUSD</span>
                    </div>
                  </div>
                  <div className="absolute bottom-5 inset-x-5 card-red p-3 text-center">
                    <div className="text-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">recipient gets</div>
                    <div className="text-display text-xl text-white mt-1">the full $3.00</div>
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

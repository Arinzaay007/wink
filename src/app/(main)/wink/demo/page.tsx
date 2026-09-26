"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Send, ShieldCheck } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";
import TipForm from "@/components/TipForm";

export default function WinkDemoPage() {
  const [recipientHandle, setRecipientHandle] = useState("demo");

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

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
              <div className="flex items-center gap-2 flex-1 bg-black border border-[color:var(--color-line)] rounded-xl px-3 py-2">
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

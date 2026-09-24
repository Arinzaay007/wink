"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Copy, Download, QrCode, Receipt, Wallet } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function PayHandlePage() {
  const routeParams = useParams() as { handle?: string };
  const handle = (routeParams.handle || "cafe-mira").replace(/^@/, "");
  const code = "INV-042";
  const [amount, setAmount] = useState(2.5);
  const [step, setStep] = useState<"create" | "live" | "paid">("live");

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6"><Receipt size={11} /> /pay/{handle} · {code}</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              Pay <em className="italic font-light neon-text">@{handle}</em><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">Scan to pay {handle} with any wallet. Memo reconciles automatically on Tempo as pathUSD.</p>

            {step !== "paid" ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-10 grid sm:grid-cols-2 gap-4">
                <button onClick={() => setStep("paid")} className="card p-6 text-left hover:border-[color:var(--color-line-2)] transition">
                  <QrCode size={20} className="text-[color:var(--color-neon)] mb-3" />
                  <div className="text-display text-lg text-white">Show QR</div>
                  <div className="text-[12px] text-[color:var(--color-ink-3)] mt-1">Customer scans with any wallet</div>
                </button>
                <div className="card p-6 sm:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">live status</div>
                    <span className="status-pill"><span className="dot-live" /> waiting</span>
                  </div>
                  <div className="text-display text-3xl text-white">${amount.toFixed(2)}</div>
                  <div className="text-[12px] text-[color:var(--color-ink-3)] font-mono mt-1">memo: {handle} · {code}</div>
                </div>
                <button onClick={() => setStep("paid")} className="btn-primary sm:col-span-2 justify-center !py-4">Pay ${amount.toFixed(2)} <Wallet size={16} /></button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-10 card-red p-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center neon-glow"><Check size={26} className="text-white" /></div>
                <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mt-6">reconciled</div>
                <div className="text-display text-[44px] text-white mt-2">${amount.toFixed(2)}</div>
                <div className="text-[color:var(--color-ink-2)] text-sm">to <span className="text-white">@{handle}</span></div>
                <button onClick={() => setStep("live")} className="mt-7 btn-ghost w-full justify-center !py-3">Pay again <ArrowRight size={14} /></button>
              </motion.div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="flex justify-center">
              <PhoneFrame width={300} height={620}>
                <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden flex flex-col items-center justify-center px-6">
                  <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-2">{handle} · {code}</div>
                  <div className="text-display text-2xl text-white mb-1">scan to pay</div>
                  <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mb-6">any wallet · ~$0.008 fee</div>
                  <div className="bg-white p-3 rounded-2xl shadow-[0_0_60px_rgba(255,31,61,0.3)]">
                    <div className="w-44 h-44 grid grid-cols-12 grid-rows-12 gap-px">
                      {Array.from({ length: 144 }).map((_, i) => {
                        const corners = [0,1,2,3,4,5,12,13,18,19,24,25,30,31,36,37,42,43,48,49,54,55,60,61,66,67,72,73,84,85,96,97,102,103,108,109,114,115,120,121,122,123,124,125,126,127,132,133,138,139,142,143];
                        const filled = ((i * 37) % 7) > 2 && !corners.includes(i);
                        return <div key={i} className={filled ? "bg-black" : "bg-white"} />;
                      })}
                    </div>
                  </div>
                  <div className="mt-7 card-red w-full p-4 text-center">
                    <div className="text-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">amount</div>
                    <div className="text-display text-3xl text-white mt-1">${amount.toFixed(2)}</div>
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

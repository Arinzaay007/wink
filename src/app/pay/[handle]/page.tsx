"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Receipt, ShieldCheck } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";
import TipForm from "@/components/TipForm";

export default function PayHandlePage() {
  const routeParams = useParams() as { handle?: string };
  const handle = (routeParams.handle || "cafe-mira").replace(/^@/, "");
  const code = "INV-042";

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6"><Receipt size={11} /> /pay/{handle} · {code} · live</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              Pay <em className="italic font-light neon-text">@{handle}</em><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              Scan to pay {handle} with any wallet. Memo reconciles automatically on Tempo as pathUSD. No middleman, no platform fee.
            </p>

            <div className="mt-10">
              <div className="card p-2">
                <TipForm handle={handle} recipientName={handle} mode="pay" invoiceRef={code} />
              </div>
              <div className="mt-4 card p-4 flex items-start gap-3 text-[12px] text-[color:var(--color-ink-2)]">
                <ShieldCheck size={14} className="text-[color:var(--color-neon)] mt-0.5 shrink-0" />
                <span>Invoice {code} · memo on chain = cafe-mira · {code}. Merchant dashboard reconciles by memo — customer address never exposed.</span>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="flex justify-center">
              <PhoneFrame width={300} height={620}>
                <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden flex flex-col items-center justify-center px-6">
                  <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-2">{handle} · {code}</div>
                  <div className="text-display text-2xl text-white mb-1">scan to pay</div>
                  <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mb-6">any wallet · ~$0.008 fee · live</div>
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
                    <div className="text-display text-3xl text-white mt-1">open</div>
                    <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">pay what you want · or fixed by invoice</div>
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

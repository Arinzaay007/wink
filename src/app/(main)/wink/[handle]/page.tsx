"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Send, ShieldCheck } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { PhoneFrame } from "@/components/PhoneFrame";
import TipForm from "@/components/TipForm";

export default function WinkPage() {
  const routeParams = useParams() as { handle?: string };
  const rawHandle = routeParams.handle || "lina";
  const cleanHandle = rawHandle.replace(/^@/, "").toLowerCase();
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/resolve/${cleanHandle}`, { cache: "no-store" });
        setExists(res.ok);
      } catch {
        setExists(null);
      } finally {
        setChecking(false);
      }
    })();
  }, [cleanHandle]);

  const recipient = useMemo(() => ({
    handle: cleanHandle,
    display: cleanHandle,
    resolvedAt: "tempo · pathUSD",
    wallet: "0x…",
    verified: exists === true,
    bio: exists === true ? "Live on Tempo mainnet · verified handle" : "This handle doesn't exist yet",
  }), [cleanHandle, exists]);

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6"><Send size={11} /> /wink/{recipient.handle} · {exists ? "live on tempo" : checking ? "checking…" : "not found"}</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              Send a <em className="italic font-light neon-text">wink</em><br /> to <span className="text-white">@{recipient.handle}</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              {exists === false
                ? `Handle @${cleanHandle} doesn't exist yet — it was wiped when we reset DB. Claim it to make winkpay.xyz/wink/${cleanHandle} work.`
                : "Memo-reconciled, settled as pathUSD. Recipient gets full amount — sender pays ~$0.008 network fee. Works with any wallet, any chain, all settles on Tempo."}
            </p>

            <div className="mt-10">
              {exists === false ? (
                <div className="card p-8 text-center">
                  <div className="text-display text-2xl text-white">@{cleanHandle} not found</div>
                  <p className="text-[13px] text-[color:var(--color-ink-2)] mt-2">DB was wiped fresh (1 user: test1). Claim @{cleanHandle} to make this link work for everyone — no www needed.</p>
                  <div className="mt-5 flex gap-2 justify-center">
                    <Link href={`/claim?admin=wink-admin-2026`} className="btn-primary !py-2.5 !px-5">Claim @{cleanHandle}</Link>
                    <Link href="/claim?admin=wink-admin-2026" className="btn-ghost !py-2.5 !px-5">Claim any handle</Link>
                  </div>
                  <div className="mt-4 text-[11px] text-[color:var(--color-ink-3)]">Current handles in DB: test1 (1 total). After claim, winkpay.xyz/wink/{cleanHandle} works on apex and www, no www needed.</div>
                </div>
              ) : (
                <>
                  <div className="card p-2">
                    <TipForm handle={recipient.handle} recipientName={recipient.display} />
                  </div>
                  <div className="mt-4 card p-4 flex items-start gap-3 text-[12px] text-[color:var(--color-ink-2)]">
                    <ShieldCheck size={14} className="text-[color:var(--color-neon)] mt-0.5 shrink-0" />
                    <span>Non-custodial. Keys never leave browser. Demo wallet funded with real pathUSD on mainnet. Every transfer verified on-chain before confirmed. Works on winkpay.xyz and www.winkpay.xyz — both 200, no www needed.</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[color:var(--color-neon)] to-[color:var(--color-neon-deep)] flex items-center justify-center text-display text-2xl text-white">{recipient.display[0]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="text-display text-2xl text-white">@{recipient.handle}</span>{recipient.verified && <span className="w-4 h-4 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center"><Check size={10} className="text-white" /></span>}</div>
                  <div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">{exists ? "tempo · pathUSD · verified" : "not found · claim to activate"}</div>
                </div>
              </div>
              <p className="text-sm text-[color:var(--color-ink-2)] mt-4 leading-relaxed">{recipient.bio}</p>
              <div className="mt-5 grid grid-cols-3 gap-px bg-[color:var(--color-line)] rounded-xl overflow-hidden border border-[color:var(--color-line)]">
                {[{ k: "fee", v: "$0.008" }, { k: "settles", v: "pathUSD" }, { k: "chain", v: "Tempo" }].map((s) => (
                  <div key={s.k} className="bg-black px-3 py-3 text-center"><div className="text-display text-lg text-white">{s.v}</div><div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mt-0.5">{s.k}</div></div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <PhoneFrame width={280} height={580}>
                <div className="absolute inset-0 bg-[#0a0a0c] overflow-hidden">
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[color:var(--color-neon)] opacity-25 blur-3xl" />
                  <div className="absolute top-12 inset-x-0 px-5 text-center">
                    <div className="text-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-neon)] mb-1">to</div>
                    <div className="text-display text-3xl text-white">@{recipient.handle}</div>
                    <div className="text-mono text-[10px] text-[color:var(--color-ink-3)] mt-1">{exists ? "tempo · verified" : "not found"}</div>
                  </div>
                  <div className="absolute top-36 inset-x-0 flex justify-center">
                    <div className="text-display text-[64px] leading-none neon-text">$3<span className="text-[28px] text-[color:var(--color-ink-3)]">.00</span></div>
                  </div>
                  <div className="absolute top-[220px] inset-x-5 space-y-2.5">
                    <div className="flex justify-between text-[10px]"><span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">fee</span><span className="text-white font-mono">$0.008 · ~8bps</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">memo</span><span className="text-[color:var(--color-neon)] font-mono">wk_a31b</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-mono uppercase tracking-[0.14em] text-[color:var(--color-ink-3)]">settles</span><span className="text-white font-mono">pathUSD</span></div>
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

"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Wallet, Send, QrCode, Copy, Check } from "lucide-react";
import { BgFx } from "@/components/BgFx";

type Incoming = {
  id: string;
  kind: string;
  amountMicro: number;
  memo?: string | null;
  fromAddress: string;
  message?: string | null;
  createdAt: string;
};

type MeData = {
  handles: string[];
  incoming?: Incoming[];
  user?: { displayName?: string };
};

export default function DashboardPage() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) throw new Error("unauth");
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handle = data?.handles?.[0] || null;
  const incoming = data?.incoming || [];
  const totalMicro = incoming.reduce((s, t) => s + t.amountMicro, 0);
  const totalFormatted = (totalMicro / 1_000_000).toFixed(2);
  const todayMicro = incoming
    .filter(t => {
      const d = new Date(t.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    })
    .reduce((s, t) => s + t.amountMicro, 0);

  const paymentLink = handle ? `https://www.winkpay.xyz/wink/${handle}` : "";

  const copyLink = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="relative">
        <BgFx />
        <div className="max-w-[1000px] mx-auto px-5 md:px-8 py-24 text-center">
          <div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">loading…</div>
        </div>
      </div>
    );
  }

  if (!data || !handle) {
    return (
      <div className="relative">
        <BgFx />
        <div className="max-w-[1000px] mx-auto px-5 md:px-8 py-12">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
            <ArrowLeft size={14} /> back
          </Link>
          <div className="card p-10 text-center">
            <div className="text-display text-3xl text-white">No handle yet</div>
            <p className="mt-3 text-[14px] text-[color:var(--color-ink-2)] max-w-md mx-auto">Claim your @handle to start receiving payments. One name for every payment.</p>
            <Link href="/claim" className="mt-6 inline-flex btn-primary !px-6 !py-3">Claim @handle <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1000px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-display text-[44px] sm:text-[56px] leading-[0.9] tracking-[-0.04em]">
              <span className="text-white">@{handle}</span>
            </h1>
            <p className="mt-2 text-[14px] text-[color:var(--color-ink-2)]">Your payments, one place.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/wallet" className="btn-ghost !py-2.5 !px-4 !text-[13px] border border-[color:var(--color-line)]">
              <Wallet size={14} /> Wallet
            </Link>
            <Link href={`/wink/${handle}`} className="btn-ghost !py-2.5 !px-4 !text-[13px]">
              <QrCode size={14} /> My link
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <div className="card p-6">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">total received</div>
            <div className="text-display text-3xl text-white">${totalFormatted}</div>
            <div className="text-[11px] text-[color:var(--color-ink-2)] mt-1">{incoming.length} payments</div>
          </div>
          <div className="card p-6">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">today</div>
            <div className="text-display text-3xl text-white">${(todayMicro / 1_000_000).toFixed(2)}</div>
            <div className="text-[11px] text-[color:var(--color-ink-2)] mt-1">pathUSD</div>
          </div>
          <div className="card p-6 bg-[color:var(--color-neon-soft)] border-[rgba(255,31,61,0.2)]">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">payment link</div>
            <div className="font-mono text-[12px] text-white truncate">{paymentLink}</div>
            <button onClick={copyLink} className="mt-3 btn-primary !py-2 !px-3 !text-[11px] w-full justify-center">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-display text-xl text-white">Recent payments</h2>
              <Link href="/wallet" className="text-[12px] text-[color:var(--color-ink-3)] hover:text-white">View wallet →</Link>
            </div>

            <div className="card overflow-hidden">
              {incoming.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-[color:var(--color-line)] flex items-center justify-center mx-auto mb-4">
                    <Send size={18} className="text-[color:var(--color-ink-3)]" />
                  </div>
                  <div className="text-white font-medium">No payments yet</div>
                  <p className="text-[13px] text-[color:var(--color-ink-2)] mt-1 max-w-sm mx-auto">Share your link <span className="text-white font-mono">{paymentLink}</span> — anyone can pay you from any chain.</p>
                  <div className="mt-5 flex gap-2 justify-center">
                    <button onClick={copyLink} className="btn-primary !py-2 !text-[12px]"><Copy size={12} /> Copy link</button>
                    <Link href={`/wink/${handle}`} className="btn-ghost !py-2 !text-[12px]">Open my page</Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--color-line)]">
                  {incoming.slice(0, 20).map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition">
                      <div className="w-9 h-9 rounded-full bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/20 flex items-center justify-center shrink-0">
                        <span className="text-[color:var(--color-neon)] text-[13px] font-medium">$</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-[14px] font-medium">+${(t.amountMicro / 1_000_000).toFixed(2)}</span>
                          <span className="text-[11px] text-[color:var(--color-ink-3)] font-mono">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="text-[12px] text-[color:var(--color-ink-2)] truncate mt-0.5">{t.message || t.memo || "Payment"}</div>
                      </div>
                      <div className="text-mono text-[10px] text-[color:var(--color-ink-3)]">{t.fromAddress.slice(0, 6)}…</div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="text-display text-lg text-white mb-1">Get paid</h3>
              <p className="text-[12px] text-[color:var(--color-ink-2)] leading-relaxed">Share your @handle or payment link. Works from Base, Ethereum, Arbitrum, Optimism, Polygon → Tempo.</p>
              <div className="mt-4 space-y-2">
                <Link href={`/wink/${handle}`} className="btn-primary w-full justify-center !py-3 !text-[13px]">Open my pay page</Link>
                <button onClick={copyLink} className="btn-ghost w-full justify-center !py-3 !text-[13px] border border-[color:var(--color-line)]">
                  <Copy size={14} /> {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>

            <div className="card p-5">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">quick actions</div>
              <div className="space-y-2">
                <Link href="/wallet" className="flex items-center justify-between p-3 rounded-xl bg-black border border-[color:var(--color-line)] hover:border-[color:var(--color-line-2)] transition">
                  <span className="text-[13px] text-white flex items-center gap-2"><Send size={14} /> Send payment</span>
                  <ArrowRight size={14} className="text-[color:var(--color-ink-3)]" />
                </Link>
                <Link href="/wallet" className="flex items-center justify-between p-3 rounded-xl bg-black border border-[color:var(--color-line)] hover:border-[color:var(--color-line-2)] transition">
                  <span className="text-[13px] text-white flex items-center gap-2"><QrCode size={14} /> Receive</span>
                  <ArrowRight size={14} className="text-[color:var(--color-ink-3)]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import { useParams } from "next/navigation";

export default function RequestPage() {
  const routeParams = useParams() as { handle?: string };
  const handle = (routeParams.handle || "lina").replace(/^@/, "");

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="chip chip-red mb-6">pay request</div>
            <h1 className="text-display text-[56px] sm:text-[68px] leading-[0.95] tracking-[-0.04em]">
              <span className="text-white">@{handle}</span> asks<br />
              <em className="italic font-light neon-text">$248.00</em><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">Worker initiated. Payer approves. Memo reconciles on Tempo. The hash is the receipt.</p>

            <div className="mt-12 space-y-3">
              {[
                { t: "Request created", sub: `@${handle} · for: hours Oct 1–14`, d: "2 min ago", done: true },
                { t: "Notification sent", sub: "telegram · email · webhook", d: "1 min ago", done: true },
                { t: "Awaiting approval", sub: "approver: @studio-9", d: "now", active: true },
                { t: "On-chain confirmation", sub: "memo: wk_req_a31b · 1 conf", d: "—" },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className={`card p-5 flex items-center gap-4 ${s.active ? "border-[color:var(--color-neon)]" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.done ? "bg-[color:var(--color-neon)]" : s.active ? "bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]" : "bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)]"}`}>
                    {s.done ? <Check size={14} className="text-white" /> : s.active ? <Clock size={14} className="text-[color:var(--color-neon)]" /> : <span className="text-[color:var(--color-ink-3)] text-[10px] font-mono">{i + 1}</span>}
                  </div>
                  <div className="flex-1"><div className="text-white font-medium text-[15px]">{s.t}</div><div className="text-[12px] text-[color:var(--color-ink-3)] mt-0.5">{s.sub}</div></div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">{s.d}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-9 flex gap-2"><button className="btn-primary flex-1 justify-center !py-4">Approve & pay <Check size={16} /></button><button className="btn-ghost !py-4 !px-5"><X size={15} /></button></div>
          </div>

          <div className="space-y-6">
            <div className="card p-7">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[color:var(--color-neon)] to-[color:var(--color-neon-deep)] flex items-center justify-center text-display text-2xl text-white">{handle[0]}</div>
                <div><div className="text-display text-2xl text-white">@{handle}</div><div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">payee · verified · tempo</div></div>
              </div>
              <div className="space-y-3 text-[14px]">
                <Row k="hours" v="62.0 h" />
                <Row k="rate" v="$4.00 / h" />
                <Row k="period" v="Oct 1 — Oct 14" />
                <div className="border-t border-[color:var(--color-line)] my-3" />
                <Row k="subtotal" v="$248.00" bold />
                <Row k="network fee" v="$0.008" muted />
                <div className="border-t border-[color:var(--color-line)] my-3" />
                <Row k="payee gets" v="$248.00" red />
              </div>
            </div>
            <div className="card p-5 text-[12px] text-[color:var(--color-ink-2)]"><span className="text-white font-medium">SLA:</span> requests auto-cancel after 24h. Approvals require 2-of-2 from the workspace multisig on mainnet.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold, muted, red }: { k: string; v: string; bold?: boolean; muted?: boolean; red?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${muted ? "text-[color:var(--color-ink-3)]" : "text-[color:var(--color-ink-2)]"} text-[12px] uppercase tracking-[0.14em] font-mono`}>{k}</span>
      <span className={`${bold ? "text-display text-xl text-white" : red ? "text-display text-xl text-[color:var(--color-neon)]" : muted ? "text-[color:var(--color-ink-3)] font-mono" : "text-white font-mono"}`}>{v}</span>
    </div>
  );
}

"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Activity, TrendingUp, Wallet, Bot, Zap } from "lucide-react";
import { BgFx } from "@/components/BgFx";

const MOCK_TX = [
  { h: "@adaeze", kind: "agent", amt: 0.25, memo: "wk_mpp_a31b", t: "2m", chain: "Tempo" },
  { h: "@cafe-mira", kind: "sale", amt: 2.5, memo: "INV-042", t: "5m", chain: "Tempo" },
  { h: "@nik", kind: "wage", amt: 14, memo: "wk_req_b31c", t: "11m", chain: "Base → Tempo" },
  { h: "@lina", kind: "wink", amt: 3, memo: "wk_a31b8e2c", t: "1h", chain: "Tempo" },
  { h: "@marco", kind: "wink", amt: 5, memo: "wk_29b1ce42", t: "2h", chain: "Tempo" },
  { h: "@eli", kind: "sale", amt: 12, memo: "INV-043", t: "3h", chain: "Optimism → Tempo" },
  { h: "@sami", kind: "wink", amt: 10, memo: "wk_34a92b1d", t: "4h", chain: "Tempo" },
  { h: "@studio-9", kind: "payroll", amt: 1200, memo: "wk_payroll_oct", t: "6h", chain: "Tempo" },
];

type Incoming = {
  id: string;
  kind: string;
  amountMicro: number;
  memo?: string | null;
  fromAddress: string;
  toAddress: string;
  status: string;
  createdAt: string;
  message?: string | null;
  chain?: string;
  txHash?: string | null;
};

export default function DashboardPage() {
  const [real, setReal] = useState<Incoming[] | null>(null);
  const [handles, setHandles] = useState<string[]>([]);
  const [userLabel, setUserLabel] = useState("@adaeze");
  const [balance, setBalance] = useState<string>("$842.15");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("unauth");
        const data = await res.json();
        if (data.handles?.length) {
          setHandles(data.handles);
          setUserLabel(`@${data.handles[0]}`);
        }
        if (data.incoming?.length) {
          const mapped: Incoming[] = data.incoming.map((t: any) => ({
            id: t.id,
            kind: t.kind || "wink",
            amountMicro: t.amountMicro,
            memo: t.memo || t.invoiceRef || null,
            fromAddress: t.fromAddress,
            toAddress: t.toAddress,
            status: t.status,
            createdAt: t.createdAt,
            message: t.message,
            chain: t.chain || "Tempo",
            txHash: t.txHash,
          }));
          setReal(mapped);
          // calc total
          const totalMicro = mapped.filter((m) => m.status === "confirmed").reduce((s, v) => s + v.amountMicro, 0);
          setBalance(`$${(totalMicro / 1_000_000).toFixed(2)}`);
        }
      } catch {
        // stay mock
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const txs = real && real.length > 0 ? real : null;
  const totalToday = txs ? txs.reduce((s, t) => s + t.amountMicro, 0) / 1_000_000 : 284.2;
  const count = txs ? txs.length : 62;

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="chip chip-red mb-5"><Activity size={11} /> /dashboard · {userLabel}</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">Today</span><br />
              <em className="italic font-light text-[color:var(--color-ink-2)]">on your</em> <span className="neon-text italic font-light">rails</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            {handles.length > 0 && <div className="mt-3 text-mono text-[11px] text-[color:var(--color-ink-3)]">handles: {handles.map((h) => `@${h}`).join(" · ")}</div>}
          </div>
          <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]"><span className="dot-live" /> synced · tempo · 42431 · block 1,284,902</div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { label: "received today", v: `$${totalToday.toFixed(2)}`, d: txs ? `${count} confirmed` : "+$42 vs yesterday", trend: "up" },
            { label: "winks", v: `${count}`, d: txs ? "on-chain verified" : "23 unique senders", trend: "up" },
            { label: "balance", v: balance, d: "pathUSD · tempo", trend: "—" },
            { label: "agents paid you", v: txs ? `${txs.filter((t) => t.kind === "agent").length}` : "8", d: "MPP · $0.25 each", trend: "up" },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2.5">{k.label}</div>
              <div className="text-display text-3xl text-white">{k.v}</div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[color:var(--color-ink-2)]">{k.trend === "up" && <TrendingUp size={12} className="text-[color:var(--color-neon)]" />}{k.d}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-display text-2xl text-white">live ledger {loading && <span className="text-mono text-[10px] text-[color:var(--color-ink-3)] ml-2">loading…</span>}</h2>
              <a href="https://explorer.tempo.xyz" target="_blank" className="text-[12px] text-mono uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] hover:text-white inline-flex items-center gap-1">explorer <ArrowUpRight size={11} /></a>
            </div>

            <div className="card overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_110px_130px_90px] gap-px bg-[color:var(--color-line)] text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">
                {["kind", "from", "amount", "memo", "when"].map((h, i) => (<div key={i} className="bg-[color:var(--color-surface)] px-4 py-3">{h}</div>))}
              </div>
              <div className="divide-y divide-[color:var(--color-line)]">
                {txs ? txs.slice(0, 20).map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="grid grid-cols-[80px_1fr_110px_130px_90px] gap-px text-[13px] items-center hover:bg-white/[0.02] transition">
                    <div className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] uppercase tracking-[0.14em] ${t.kind === "wink" ? "bg-[color:var(--color-neon-soft)] text-[color:var(--color-neon)] border border-[rgba(255,31,61,0.3)]" : "bg-white/5 text-white border border-[color:var(--color-line)]"}`}>{t.kind}</span></div>
                    <div className="px-4 py-3"><div className="text-white text-[13px] font-mono text-[11px]">{t.fromAddress.slice(0, 10)}…</div><div className="text-[10px] text-[color:var(--color-ink-3)] font-mono mt-0.5">via {t.chain}</div></div>
                    <div className="px-4 py-3 font-mono text-[color:var(--color-neon)]">+${(t.amountMicro / 1_000_000).toFixed(2)}</div>
                    <div className="px-4 py-3 font-mono text-[11px] text-[color:var(--color-ink-2)] truncate">{t.memo || t.message || "—"}</div>
                    <div className="px-4 py-3 text-mono text-[11px] text-[color:var(--color-ink-3)]">{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </motion.div>
                )) : MOCK_TX.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="grid grid-cols-[80px_1fr_110px_130px_90px] gap-px text-[13px] items-center hover:bg-white/[0.02] transition">
                    <div className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] uppercase tracking-[0.14em] ${t.kind === "wink" ? "bg-[color:var(--color-neon-soft)] text-[color:var(--color-neon)] border border-[rgba(255,31,61,0.3)]" : "bg-white/5 text-white border border-[color:var(--color-line)]"}`}>{t.kind}</span></div>
                    <div className="px-4 py-3"><div className="text-white text-[13px]">{t.h}</div><div className="text-[10px] text-[color:var(--color-ink-3)] font-mono mt-0.5">via {t.chain}</div></div>
                    <div className="px-4 py-3 font-mono text-[color:var(--color-neon)]">+${t.amt.toFixed(2)}</div>
                    <div className="px-4 py-3 font-mono text-[11px] text-[color:var(--color-ink-2)] truncate">{t.memo}</div>
                    <div className="px-4 py-3 text-mono text-[11px] text-[color:var(--color-ink-3)]">{t.t}</div>
                  </motion.div>
                ))}
              </div>
              {!txs && <div className="p-4 text-center text-mono text-[11px] text-[color:var(--color-ink-3)]">Sign in to see your real ledger — showing demo data. <Link href="/claim" className="text-[color:var(--color-neon)]">Claim handle →</Link></div>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-red p-6 relative overflow-hidden">
              <div aria-hidden className="absolute -top-20 -right-20 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,31,61,0.4), transparent 70%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-5"><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">balance</div><Wallet size={14} className="text-[color:var(--color-neon)]" /></div>
                <div className="text-display text-[44px] text-white leading-none">{balance.split(".")[0]}<span className="text-[color:var(--color-ink-3)] text-2xl">.{balance.split(".")[1] || "00"}</span></div>
                <div className="text-mono text-[11px] text-[color:var(--color-ink-3)] mt-2">pathUSD · tempo · live from chain</div>
                <div className="mt-6 grid grid-cols-2 gap-2"><Link href="/wink/demo" className="btn-primary !py-2.5 !text-[12px] text-center">Send</Link><Link href="/pay" className="btn-ghost !py-2.5 !text-[12px] text-center">Receive</Link></div>
              </div>
            </div>

            <div className="card p-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-4">top senders · 7d</div>
              <div className="space-y-3">
                {[
                  { h: "@cafe-mira", amt: "$48.20" },
                  { h: "@nik", amt: "$42.00" },
                  { h: "@studio-9", amt: "$28.50" },
                  { h: "@ada", amt: "$15.00" },
                ].map((s, i) => (
                  <div key={s.h} className="flex items-center gap-3"><div className="text-mono text-[10px] text-[color:var(--color-ink-3)] w-5">0{i + 1}</div><div className="flex-1 text-white text-[13px]">{s.h}</div><div className="text-mono text-[11px] text-[color:var(--color-neon)]">{s.amt}</div></div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4"><div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)]">agent activity</div><Bot size={14} className="text-[color:var(--color-neon)]" /></div>
              <div className="space-y-3">
                {[
                  { h: "gpt-researcher", w: "@adaeze", t: "8m", v: "$0.25" },
                  { h: "scraper-bot", w: "@adaeze", t: "23m", v: "$0.25" },
                  { h: "image-bot", w: "@adaeze", t: "1h", v: "$0.25" },
                ].map((a) => (
                  <div key={a.h} className="flex items-center gap-3 text-[12px]"><Zap size={11} className="text-[color:var(--color-neon)]" /><span className="text-white font-mono">{a.h}</span><ArrowUpRight size={10} className="text-[color:var(--color-ink-3)]" /><span className="text-[color:var(--color-ink-2)]">{a.w}</span><span className="ml-auto text-mono text-[10px] text-[color:var(--color-ink-3)]">{a.v} · {a.t}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

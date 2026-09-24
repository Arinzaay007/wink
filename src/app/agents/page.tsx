"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Play, RotateCcw, Zap } from "lucide-react";
import { BgFx } from "@/components/BgFx";

interface Log {
  t: string;
  body: React.ReactNode;
  kind: "info" | "request" | "challenge" | "sign" | "ok" | "data";
}

const SCRIPT: Omit<Log, "t">[] = [
  { kind: "info", body: <>agent &quot;research-bot&quot; wants to GET <span className="text-white">/api/mpp/analytics/@adaeze</span></> },
  { kind: "request", body: <>GET /api/mpp/analytics/@adaeze</> },
  { kind: "challenge", body: <>← 402 Payment Required<br /><span className="text-[color:var(--color-ink-3)]">WWW-Authenticate: Payment address=&quot;0x9aF2…c4D8&quot;, amount=&quot;250000&quot;, memo=&quot;wk_mpp_a31b&quot;, asset=&quot;pathUSD&quot;</span></> },
  { kind: "info", body: <>quoting tempo network fee · ~8bps · $0.008<br />recipient gets full $0.25</> },
  { kind: "sign", body: <>→ sign transferWithMemo(<br />&nbsp;&nbsp;to: 0x9aF2…c4D8, amount: 0.25, memo: &quot;wk_mpp_a31b&quot;<br />)</> },
  { kind: "info", body: <>broadcast → tx: <span className="text-[color:var(--color-neon)]">0x052cba278294b309acb1664834f116421cdabeae92613ff94b571d108021451e</span></> },
  { kind: "challenge", body: <>→ GET /api/mpp/analytics/@adaeze<br /><span className="text-[color:var(--color-ink-3)]">Authorization: Payment 0x052cba27…</span></> },
  { kind: "data", body: <>← 200 OK<br /><span className="text-[color:var(--color-ink-3)]">{`{`} &quot;handle&quot;: &quot;@adaeze&quot;, &quot;received_24h&quot;: &quot;$284.20&quot;, &quot;winks&quot;: 62{`}`}</span></> },
  { kind: "ok", body: <>Payment-Receipt: verified · $0.25 pathUSD · 1 conf</> },
];

export default function AgentsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [running, setRunning] = useState(false);

  const start = () => { setLogs([]); setRunning(true); };

  useEffect(() => {
    if (!running) return;
    if (logs.length >= SCRIPT.length) { setRunning(false); return; }
    const id = setTimeout(() => {
      const next = SCRIPT[logs.length];
      setLogs((l) => [...l, { ...next, t: new Date().toISOString().split("T")[1].slice(0, 8) }]);
    }, 900);
    return () => clearTimeout(id);
  }, [logs, running]);

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
          <div>
            <div className="chip chip-red mb-6"><Bot size={11} /> /agents · mpp simulator</div>
            <h1 className="text-display text-[52px] sm:text-[68px] leading-[0.95] tracking-[-0.04em]">
              HTTP <em className="italic font-light neon-text">402</em><br />
              <span className="text-white">is now a</span><br />
              <em className="italic font-light text-[color:var(--color-ink-2)]">payment</em> endpoint<span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              MPP is an open standard (Tempo × Stripe, IETF draft) for machine-to-machine payments. An agent gets a 402 challenge, signs a transfer, retries — and unlocks the resource.
            </p>

            <div className="mt-9 grid sm:grid-cols-2 gap-3">
              <button onClick={start} disabled={running} className="btn-primary justify-center !py-4 disabled:opacity-50"><Play size={15} /> Run simulation</button>
              <button onClick={() => { setLogs([]); setRunning(false); }} className="btn-ghost justify-center !py-4"><RotateCcw size={14} /> Reset</button>
            </div>

            <div className="mt-12 space-y-2.5">
              {[
                { n: "01", t: "GET paywalled resource", d: "agent calls a paid API. No credentials, no API key." },
                { n: "02", t: "Server returns 402", d: "with WWW-Authenticate: Payment challenge specifying handle, amount, asset, memo." },
                { n: "03", t: "Agent signs transferWithMemo", d: "pays the @handle. Recipient gets full amount, ~8bps fee." },
                { n: "04", t: "Retry with receipt", d: "Authorization: Payment <txHash> — server verifies on-chain, returns 200." },
              ].map((s) => (
                <div key={s.n} className="card p-5 flex items-start gap-4">
                  <div className="text-mono text-[11px] text-[color:var(--color-neon)] w-8 shrink-0 pt-0.5">{s.n}</div>
                  <div>
                    <div className="text-white font-medium text-[15px]">{s.t}</div>
                    <div className="text-[12.5px] text-[color:var(--color-ink-2)] mt-0.5 leading-relaxed">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="card overflow-hidden bg-black">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[color:var(--color-line)]">
                <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" /></div>
                <div className="ml-3 text-mono text-[11px] text-[color:var(--color-ink-3)] uppercase tracking-[0.16em]">research-bot ⌁ /api/mpp · tempo</div>
                <div className="ml-auto flex items-center gap-2 text-[10px] text-mono text-[color:var(--color-ink-3)]"><Zap size={10} className="text-[color:var(--color-neon)]" />{logs.length}/{SCRIPT.length}</div>
              </div>
              <div className="p-5 h-[560px] overflow-y-auto text-[12.5px] font-mono leading-relaxed text-white">
                {logs.length === 0 && <div className="text-[color:var(--color-ink-3)]"><span className="text-[color:var(--color-neon)]">$</span> press <span className="text-white">run simulation</span> to begin.<br /><span className="text-[color:var(--color-ink-3)]"># the agent will discover, challenge, sign, retry, succeed.</span></div>}
                {logs.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[color:var(--color-ink-3)] text-[10px] uppercase tracking-[0.16em] shrink-0 pt-0.5">{l.t}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.16em] mr-2 align-middle ${l.kind === "info" ? "bg-white/5 text-[color:var(--color-ink-3)]" : l.kind === "request" ? "bg-white/5 text-white" : l.kind === "challenge" ? "bg-[color:var(--color-neon-soft)] text-[color:var(--color-neon)] border border-[rgba(255,31,61,0.3)]" : l.kind === "sign" ? "bg-white/10 text-white" : l.kind === "data" ? "bg-black text-[color:var(--color-neon)] border border-[rgba(255,31,61,0.3)]" : "bg-[color:var(--color-neon)] text-white"}`}>{l.kind === "ok" ? "200" : l.kind}</span>
                        <span className="align-middle">{l.body}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {running && <div className="text-[color:var(--color-ink-3)] inline-flex items-center gap-2"><span className="dot-live" /> resolving on chain…</div>}
                {!running && logs.length >= SCRIPT.length && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 card-red p-4">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-neon)] mb-1">simulation complete</div>
                    <div className="text-white text-[13px]">1 request, 1 transfer, 1 unlock. The agent paid @adaeze $0.25 in pathUSD and got the data it needed.</div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

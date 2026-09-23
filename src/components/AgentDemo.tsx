"use client";
/**
 * Live MPP demo — watch an AI agent pay a @handle over HTTP 402.
 * Runs the real loop: challenge → on-chain payment → credential →
 * receipt, with every step logged like a terminal.
 */
import { useState } from "react";
import {
  loadDemoWallet,
  createDemoWallet,
  fetchBalance,
  sendWink,
  type DemoWallet,
} from "@/lib/demoWallet";
import { encodeMemo } from "@/lib/tempo";
import type { Address } from "viem";

type Step = { text: string; kind: "info" | "send" | "recv" | "ok" | "err" };

export default function AgentDemo({ defaultHandle }: { defaultHandle: string }) {
  const [handle, setHandle] = useState(defaultHandle);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Step[]>([]);

  const push = (text: string, kind: Step["kind"] = "info") =>
    setLog((l) => [...l, { text, kind }]);

  const run = async () => {
    setLog([]);
    setRunning(true);
    const h = handle.replace(/^@/, "").toLowerCase();
    const url = `/api/mpp/analytics/${h}`;
    try {
      push(`agent@wink:~$ GET ${url}`, "send");
      const first = await fetch(url);
      const wwwAuth = first.headers.get("www-authenticate") ?? "(none)";
      const body = await first.json();
      push(`← HTTP ${first.status} Payment Required`, "recv");
      push(`← WWW-Authenticate: ${wwwAuth}`, "recv");
      if (first.status !== 402 || !body.challenge) {
        push(`unexpected response: ${JSON.stringify(body)}`, "err");
        return;
      }
      const { recipient, amountMicro, currency } = body.challenge;
      push(
        `challenge parsed: pay ${(amountMicro / 1_000_000).toFixed(2)} ${currency} → ${recipient.slice(0, 10)}… (@${h})`,
        "info",
      );

      // agent's wallet: instant, in-browser, faucet-funded
      let w = loadDemoWallet() ?? createDemoWallet();
      push(`agent wallet: ${w.address}`, "info");
      const bal = await fetchBalance(w.address);
      if (bal * 1_000_000 < amountMicro + 100_000) {
        push("insufficient funds → requesting faucet…", "info");
        await fetch("/api/fund", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address: w.address }),
        });
        await new Promise((r) => setTimeout(r, 2500));
      }

      // settle exactly the challenged amount, with a machine memo
      const memoHex = encodeMemo(`mpp-agent:${h}`);
      push(`signing transferWithMemo(${(amountMicro / 1_000_000).toFixed(2)} ${currency})…`, "info");
      const txHash = await sendWink(w, {
        to: recipient as Address,
        amountMicro,
        memoHex,
      });
      push(`tx broadcast: ${txHash.slice(0, 22)}…`, "ok");

      // retry with the credential
      push(`agent@wink:~$ GET ${url}  [Authorization: Payment ${txHash.slice(0, 14)}…]`, "send");
      let unlocked: { status: number; receipt: string | null; body: unknown } | null = null;
      for (let i = 0; i < 12 && !unlocked; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const res = await fetch(url, {
          headers: { Authorization: `Payment ${txHash}` },
        });
        const j = await res.json();
        if (res.status === 200) {
          unlocked = { status: 200, receipt: res.headers.get("payment-receipt"), body: j };
        } else if (j.reason && j.reason !== "receipt-not-found") {
          push(`verification failed: ${j.reason}`, "err");
          return;
        }
      }
      if (!unlocked) {
        push("timed out waiting for chain verification", "err");
        return;
      }
      push(`← HTTP 200 OK`, "ok");
      push(`← Payment-Receipt: ${unlocked.receipt}`, "recv");
      push(`resource unlocked:`, "ok");
      push(JSON.stringify(unlocked.body, null, 2), "info");
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), "err");
    } finally {
      setRunning(false);
    }
  };

  const color = (k: Step["kind"]) =>
    k === "send"
      ? "text-wink"
      : k === "recv"
        ? "text-ink-300"
        : k === "ok"
          ? "text-mint"
          : k === "err"
            ? "text-red-300"
            : "text-ink-400";

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="label">Agent buys analytics for</label>
          <input
            className="input"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle"
            disabled={running}
          />
        </div>
        <button className="btn-primary" onClick={run} disabled={running}>
          {running ? "Agent working…" : "🤖 Run the agent"}
        </button>
      </div>

      {(log.length > 0 || running) && (
        <div className="mono mt-4 max-h-96 space-y-1 overflow-y-auto rounded-xl border border-ink-700 bg-ink-950 p-4 text-[11px] leading-relaxed">
          {log.length === 0 && <div className="text-ink-500">booting agent…</div>}
          {log.map((s, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${color(s.kind)}`}>
              {s.text}
            </div>
          ))}
          {running && <div className="animate-pulse text-ink-500">▋</div>}
        </div>
      )}
    </div>
  );
}

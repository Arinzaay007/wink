"use client";
/**
 * Bridge watch card — the recipient's view of "any chain in, Tempo out".
 * Lists tracked cross-chain transfers and polls them until each one is
 * independently confirmed on Tempo (or fails/expires). Includes a manual
 * tracker for transfers executed directly on relay.link.
 */
import { useCallback, useEffect, useState } from "react";
import { EXPLORER_URL, formatMicro } from "@/lib/tempo";

interface Watch {
  id: string;
  requestId: string | null;
  handle: string | null;
  receiver: string;
  sourceChain: string;
  sourceChainLabel: string;
  amountMicro: number;
  currency: string;
  status: "watching" | "verifying" | "confirmed" | "failed";
  progress: string | null;
  destTxHash: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

const CHAINS = ["Base", "Ethereum", "Arbitrum", "Optimism", "Polygon"];

const chip: Record<Watch["status"], string> = {
  watching: "bg-amber-500/15 text-amber-300",
  verifying: "bg-sky-500/15 text-sky-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
};

const label: Record<Watch["status"], string> = {
  watching: "bridging…",
  verifying: "verifying on Tempo…",
  confirmed: "settled ✓",
  failed: "failed",
};

export default function BridgeWatchCard({ defaultReceiver }: { defaultReceiver?: string }) {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("Base");
  const [receiver, setReceiver] = useState(defaultReceiver ?? "");
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bridge/watches");
      if (!res.ok) return;
      const j = await res.json();
      setWatches(j.watches ?? []);
      setLoaded(true);
    } catch {
      /* server blip — retry on next tick */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const anyActive = watches.some((w) => w.status === "watching" || w.status === "verifying");

  useEffect(() => {
    if (!loaded || !anyActive) return;
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [loaded, anyActive, load]);

  useEffect(() => {
    if (!receiver && defaultReceiver) setReceiver(defaultReceiver);
  }, [defaultReceiver, receiver]);

  const track = async () => {
    const amountMicro = Math.round(parseFloat(amount) * 1_000_000);
    if (!Number.isFinite(amountMicro) || amountMicro <= 0) return setNote("Enter an amount first");
    if (!/^0x[a-fA-F0-9]{40}$/.test(receiver)) return setNote("Receiver must be a Tempo address");
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/bridge/watches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: requestId.trim() || undefined,
        receiver,
        sourceChain: chain,
        amountMicro,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setNote("Could not start tracking that transfer");
      return;
    }
    setAmount("");
    setRequestId("");
    setShowTrack(false);
    load();
  };

  const dismiss = async (id: string) => {
    await fetch(`/api/bridge/watches/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">🌉 Bridge</h2>
        <span className="text-[11px] text-ink-500">any chain in → Tempo out</span>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Cross-chain transfers to your wallets, confirmed only when the chain confirms — never on an
        API&apos;s word.
      </p>

      {watches.length === 0 && loaded && (
        <p className="mt-4 text-sm text-ink-300">No cross-chain transfers tracked yet.</p>
      )}

      <div className="mt-3 space-y-2">
        {watches.map((w) => (
          <div key={w.id} className="rounded-xl border border-line p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">
                {w.sourceChainLabel} <span className="text-ink-500">→</span> Tempo
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip[w.status]}`}>
                {label[w.status]}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs text-ink-300">
              <span className="mono">${formatMicro(w.amountMicro)} {w.currency}</span>
              {w.destTxHash && (
                <a
                  className="mono text-wink underline-offset-2 hover:underline"
                  href={`${EXPLORER_URL}/tx/${w.destTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {w.destTxHash.slice(0, 10)}…
                </a>
              )}
            </div>
            {w.progress && w.status !== "confirmed" && (
              <p className="mt-1 text-[11px] text-ink-500">{w.progress}</p>
            )}
            {(w.status === "failed" || (w.status === "confirmed" && w.confirmedAt)) && (
              <button
                onClick={() => dismiss(w.id)}
                className="mt-2 text-[11px] text-ink-500 underline-offset-2 hover:text-ink-300 hover:underline"
              >
                dismiss
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowTrack((v) => !v)}
        className="btn-ghost mt-4"
      >
        {showTrack ? "Hide tracker" : "➕ Track a transfer (relay.link)"}
      </button>

      {showTrack && (
        <div className="mt-3 space-y-2 rounded-xl border border-line p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Amount (USD)"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select className="input" value={chain} onChange={(e) => setChain(e.target.value)}>
              {CHAINS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            className="input mono"
            placeholder="Your Tempo address receiving the funds"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <input
            className="input mono"
            placeholder="Relay requestId (optional — speeds up tracking)"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
          />
          {note && <p className="text-xs text-red-400">{note}</p>}
          <button onClick={track} disabled={busy} className="btn-primary">
            {busy ? "Starting watch…" : "Watch this transfer"}
          </button>
        </div>
      )}
    </section>
  );
}

"use client";
/**
 * Worker-side: ask a @handle to pay you. Signed-in users only —
 * money requests need an identity on both ends.
 */
import { useState } from "react";

const PRESETS = [10, 25, 50, 100];

export default function RequestForm({ handle }: { handle: string }) {
  const [dollars, setDollars] = useState("25");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    const amountMicro = Math.round(parseFloat(dollars) * 1_000_000);
    if (!isFinite(amountMicro) || amountMicro < 100_000) {
      setError("minimum request is $0.10");
      return;
    }
    setStage("sending");
    const res = await fetch("/api/pay-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle, amountMicro, note: note || undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "request failed");
      setStage("error");
      return;
    }
    setStage("done");
  };

  if (stage === "done") {
    return (
      <div className="card animate-wink-in p-6 text-center">
        <div className="text-4xl">📨✅</div>
        <h3 className="mt-3 text-lg font-bold">
          Request sent to @{handle}
        </h3>
        <p className="mt-1 text-sm text-ink-300">
          They&apos;ll see it in their dashboard — one tap pays it, straight to your wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold">
        Request payment from <span className="text-wink">@{handle}</span>
      </h3>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setDollars(String(p))}
            className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
              dollars === String(p)
                ? "border-wink bg-wink/15 text-wink"
                : "border-ink-700 text-ink-300 hover:border-ink-500"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      <input
        className="input mt-3"
        type="number"
        min="0.1"
        step="0.5"
        value={dollars}
        onChange={(e) => setDollars(e.target.value)}
        placeholder="Amount (USD)"
      />

      <input
        className="input mt-3"
        maxLength={140}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder='What is it for? e.g. "Logo design — final delivery"'
      />

      <button
        className="btn-primary mt-5 w-full text-base"
        onClick={send}
        disabled={stage === "sending"}
      >
        {stage === "sending" ? "Sending request…" : `📨 Request $${dollars || "0"}`}
      </button>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

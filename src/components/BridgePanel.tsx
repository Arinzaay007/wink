"use client";
/**
 * Cross-chain pay (doctrine #5 — any chain in, Tempo out).
 *
 * The payer stays on their own chain (Base, Ethereum, Arbitrum…). They
 * sign ONE deposit; a Relay solver fills @handle's Tempo address in
 * seconds; we verify the arrival on-chain before declaring success.
 * Honest latency UX throughout — never pretend cross-chain is 500ms.
 */
import { useEffect, useRef, useState } from "react";
import { hasInjectedWallet } from "@/lib/connectedWallet";
import type { Address } from "viem";

const SOURCE_CHAINS = [
  { id: 8453, name: "Base", hex: "0x2105", rpc: "https://mainnet.base.org" },
  { id: 1, name: "Ethereum", hex: "0x1", rpc: "https://eth.llamarpc.com" },
  { id: 42161, name: "Arbitrum", hex: "0xa4b1", rpc: "https://arb1.arbitrum.io/rpc" },
  { id: 10, name: "Optimism", hex: "0xa", rpc: "https://mainnet.optimism.io" },
  { id: 137, name: "Polygon", hex: "0x89", rpc: "https://polygon-rpc.com" },
];

type Stage =
  | "idle"
  | "connecting"
  | "quoting"
  | "ready"
  | "depositing"
  | "bridging"
  | "verifying"
  | "confirmed"
  | "error";

interface Quote {
  requestId: string | null;
  receiver: string;
  chainName: string;
  steps: {
    kind: string;
    items: { data?: { to: string; data: string; value: string } }[];
  }[];
  details?: { estimatedTime?: number; totalImpact?: string };
}

export default function BridgePanel({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [hasOwn, setHasOwn] = useState(false);
  const [addr, setAddr] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number>(8453);
  const [dollars, setDollars] = useState("25");
  const [stage, setStage] = useState<Stage>("idle");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [destTx, setDestTx] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    setHasOwn(hasInjectedWallet());
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const connect = async () => {
    setError(null);
    setStage("connecting");
    try {
      if (!window.ethereum) throw new Error("Install MetaMask, Rabby, or another wallet first");
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as `0x${string}`[];
      if (!accounts?.length) throw new Error("No account authorized");
      setAddr(accounts[0]);
      setStage("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "connection failed");
      setStage("error");
    }
  };

  const switchToSource = async () => {
    const target = SOURCE_CHAINS.find((c) => c.id === chainId);
    if (!target || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: target.hex }],
      });
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: target.hex,
              chainName: target.name,
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [target.rpc],
            },
          ],
        });
      } else {
        throw new Error(`Please switch your wallet to ${target.name}`);
      }
    }
  };

  const getQuote = async () => {
    setError(null);
    setStage("quoting");
    const amountMicro = Math.round(parseFloat(dollars) * 1_000_000);
    try {
      const res = await fetch("/api/bridge/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle, sender: addr, sourceChainId: chainId, amountMicro }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "no route available");
      setQuote(j as Quote);
      setStage("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "quote failed");
      setStage("error");
    }
  };

  const pay = async () => {
    setError(null);
    setStage("depositing");
    try {
      if (!quote?.requestId) throw new Error("this route didn't return a trackable request");
      await switchToSource();
      setProgress("Confirm the deposit in your wallet…");

      // execute each source-chain step Relay returned (approve + deposit)
      for (const step of quote.steps) {
        for (const item of step.items) {
          const d = item.data;
          if (!d) continue;
          await window.ethereum!.request({
            method: "eth_sendTransaction",
            params: [
              {
                from: addr,
                to: d.to,
                data: d.data,
                value: d.value && d.value !== "0" ? d.value : "0x0",
              },
            ],
          });
        }
      }

      setStage("bridging");
      setProgress("Deposit sent. A solver is filling @".concat(handle, " on Tempo — usually seconds, sometimes a couple of minutes."));
      poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "deposit failed");
      setStage("error");
    }
  };

  const poll = () => {
    if (!quote?.requestId) return;
    const amountMicro = Math.round(parseFloat(dollars) * 1_000_000);
    let tries = 0;
    pollRef.current = window.setInterval(async () => {
      tries++;
      try {
        const res = await fetch(
          `/api/bridge/status?requestId=${encodeURIComponent(quote.requestId!)}&handle=${encodeURIComponent(handle)}&receiver=${quote.receiver}&amountMicro=${amountMicro}&chainName=${quote.chainName}`,
        );
        const j = await res.json();
        if (j.progress) setProgress(j.progress);
        if (j.status === "verifying") setStage("verifying");
        if (j.status === "confirmed") {
          window.clearInterval(pollRef.current!);
          setDestTx(j.txHash ?? null);
          setStage("confirmed");
        } else if (j.status === "failure") {
          window.clearInterval(pollRef.current!);
          setError("The bridge could not complete — your deposit was refunded on the source chain.");
          setStage("error");
        } else if (tries > 180) {
          // ~6 minutes of polling
          window.clearInterval(pollRef.current!);
          setError("Still settling. Check your wallet — the funds will arrive or refund automatically.");
          setStage("error");
        }
      } catch {
        /* transient network blip — keep polling */
      }
    }, 2000);
  };

  const busy = ["quoting", "depositing", "bridging", "verifying", "connecting"].includes(stage);

  if (!open) {
    return (
      <button
        className="mt-4 w-full rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-400 transition hover:border-wink/50 hover:text-ink-200"
        onClick={() => setOpen(true)}
      >
        🌉 Paying from another chain? <span className="text-wink">Bridge in →</span>
      </button>
    );
  }

  return (
    <div className="card mt-4 p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">🌉 Bridge from another chain</h4>
        <button className="text-xs text-ink-500 hover:text-ink-300" onClick={() => setOpen(false)}>
          close ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Send USDC from your chain — @{handle} receives stablecoins on Tempo. Any chain in, Tempo out.
      </p>

      {stage === "confirmed" ? (
        <div className="mt-4 rounded-xl border border-mint/40 bg-mint/10 p-4 text-center">
          <div className="text-2xl">🎉</div>
          <div className="mt-2 text-sm font-semibold text-mint">
            ${dollars} landed in @{handle}&apos;s Tempo balance
          </div>
          {destTx && (
            <div className="mono mt-1 break-all text-[11px] text-ink-500">tempo tx {destTx.slice(0, 20)}…</div>
          )}
        </div>
      ) : (
        <>
          {!addr && (
            <button className="btn-primary mt-4 w-full" onClick={connect} disabled={busy}>
              {hasOwn ? "Connect your wallet" : "Install a wallet (MetaMask, Rabby…)"}
            </button>
          )}

          {addr && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <select
                  className="input"
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  disabled={busy}
                >
                  {SOURCE_CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (USDC)
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min="5"
                  step="1"
                  value={dollars}
                  onChange={(e) => setDollars(e.target.value)}
                  placeholder="Amount (min $5)"
                  disabled={busy}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-500">
                Min $5 cross-chain · capped at $500 while we&apos;re launching.
              </p>

              {stage === "ready" && quote ? (
                <button className="btn-primary mt-4 w-full" onClick={pay} disabled={busy}>
                  Confirm &amp; deposit ${dollars} on {quote.chainName}
                </button>
              ) : (
                <button className="btn-primary mt-4 w-full" onClick={getQuote} disabled={busy || !addr}>
                  {stage === "quoting" ? "Finding a route…" : `Bridge $${dollars || "0"} to @${handle}`}
                </button>
              )}
            </>
          )}

          {progress && (
            <p className="mt-3 rounded-lg border border-wink/30 bg-wink/10 px-3 py-2 text-xs text-wink">
              ⏳ {progress}
            </p>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

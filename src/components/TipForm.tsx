"use client";
/**
 * The wink sender — lives on every public /@handle page.
 *
 * Two funding sources, one flow:
 *   👛 My own wallet  — any injected EIP-1193 wallet (MetaMask, Rabby, Tempo Wallet…)
 *   ⚡ Instant demo wallet — generated in-browser, faucet-funded (zero setup)
 * Guests can use either; no registration required.
 */
import { useEffect, useState } from "react";
import {
  loadDemoWallet,
  createDemoWallet,
  fetchBalance,
  sendWink,
  type DemoWallet,
} from "@/lib/demoWallet";
import {
  hasInjectedWallet,
  connectInjectedWallet,
  injectedWalletClient,
} from "@/lib/connectedWallet";
import { PATH_USD, TIP20_ABI } from "@/lib/tempo";
import type { Address } from "viem";

const PRESETS = [1, 3, 5, 10];

type Stage =
  | "idle"
  | "wallet"
  | "funding"
  | "signing"
  | "confirming"
  | "done"
  | "error";

export default function TipForm({
  handle,
  recipientName,
}: {
  handle: string;
  recipientName: string;
}) {
  const [hasOwn, setHasOwn] = useState(false);
  const [useOwn, setUseOwn] = useState(false);
  const [ownAddr, setOwnAddr] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [dollars, setDollars] = useState<string>("3");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    setHasOwn(hasInjectedWallet());
    const w = loadDemoWallet();
    if (w) {
      setWallet(w);
      fetchBalance(w.address).then(setBalance).catch(() => setBalance(null));
    }
  }, []);

  const connectOwn = async () => {
    setError(null);
    setConnecting(true);
    try {
      const addr = await connectInjectedWallet();
      setOwnAddr(addr);
      setUseOwn(true);
      setBalance(await fetchBalance(addr));
      // if signed in, associate this wallet with the account
      fetch("/api/wallet/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: addr, kind: "connected", label: "my wallet" }),
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  };

  const ensureDemoWallet = async (): Promise<DemoWallet | null> => {
    if (wallet) return wallet;
    const w = createDemoWallet();
    setWallet(w);
    fetch("/api/wallet/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: w.address, kind: "inapp", label: "demo wallet" }),
    }).catch(() => {});
    return w;
  };

  const fundDemoWallet = async (w: DemoWallet) => {
    setStage("funding");
    const res = await fetch("/api/fund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: w.address }),
    });
    if (!res.ok) throw new Error("faucet failed — try again in a moment");
    await new Promise((r) => setTimeout(r, 1500));
    setBalance(await fetchBalance(w.address));
  };

  const wink = async () => {
    setError(null);
    try {
      const amountMicro = Math.round(parseFloat(dollars) * 1_000_000);
      if (!isFinite(amountMicro) || amountMicro < 100_000)
        throw new Error("minimum wink is $0.10");

      // which wallet is paying?
      const fromAddress = useOwn ? ownAddr : (await ensureDemoWallet())?.address;
      if (!fromAddress) throw new Error("connect a wallet first");

      const bal = balance ?? (await fetchBalance(fromAddress as Address));
      if (useOwn && bal * 1_000_000 < amountMicro)
        throw new Error(`insufficient pathUSD — your wallet holds $${bal.toFixed(2)}`);
      if (!useOwn && bal * 1_000_000 < amountMicro + 100_000)
        await fundDemoWallet(await ensureDemoWallet() as DemoWallet);

      setStage("signing");
      const prep = await fetch("/api/wink/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          amountMicro,
          message: message || undefined,
          anonymous,
          fromAddress,
        }),
      }).then((r) => r.json());
      if (!prep.transferId) throw new Error(prep.error ?? "prepare failed");

      // sign with the chosen wallet
      let hash: `0x${string}`;
      if (useOwn && ownAddr) {
        const client = injectedWalletClient(ownAddr);
        hash = await client.writeContract({
          address: PATH_USD,
          abi: TIP20_ABI,
          functionName: "transferWithMemo",
          args: [prep.to as Address, BigInt(amountMicro), prep.memoHex as `0x${string}`],
        });
      } else {
        hash = await sendWink(wallet as DemoWallet, {
          to: prep.to as Address,
          amountMicro,
          memoHex: prep.memoHex,
        });
      }
      setTxHash(hash);

      setStage("confirming");
      let confirmed = false;
      for (let i = 0; i < 12 && !confirmed; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const c = await fetch("/api/wink/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transferId: prep.transferId, txHash: hash }),
        }).then((r) => r.json());
        if (c.status === "confirmed") confirmed = true;
      }
      if (!confirmed) throw new Error("broadcast but not verified yet — check the dashboard");
      setStage("done");
      setBalance(await fetchBalance(fromAddress as Address));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("User rejected") ? "Signature rejected in your wallet" : msg);
      setStage("error");
    }
  };

  if (stage === "done") {
    return (
      <div className="card animate-wink-in p-6 text-center">
        <div className="text-4xl">😉✨</div>
        <h3 className="mt-3 text-lg font-bold">
          You winked ${dollars} to @{handle}
        </h3>
        <p className="mt-1 text-sm text-ink-300">
          Settled on Tempo{txHash ? ` · tx ${txHash.slice(0, 10)}…` : ""}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <a href="/claim" className="btn-primary">
            😍 Claim your own @handle — start receiving winks
          </a>
          <button className="btn-ghost" onClick={() => setStage("idle")}>
            Wink again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold">
        Wink <span className="text-wink">@{handle}</span>
      </h3>

      {/* wallet source */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {hasOwn && (
          <button
            onClick={() => (ownAddr ? setUseOwn(true) : connectOwn())}
            disabled={connecting}
            className={`rounded-xl border px-2 py-2.5 font-semibold transition ${
              useOwn
                ? "border-wink bg-wink/15 text-wink"
                : "border-ink-700 text-ink-300 hover:border-ink-500"
            }`}
          >
            {connecting ? "Connecting…" : ownAddr ? "👛 My wallet" : "👛 Connect wallet"}
          </button>
        )}
        <button
          onClick={() => setUseOwn(false)}
          className={`rounded-xl border px-2 py-2.5 font-semibold transition ${
            !useOwn
              ? "border-wink bg-wink/15 text-wink"
              : "border-ink-700 text-ink-300 hover:border-ink-500"
          } ${hasOwn ? "" : "col-span-2"}`}
        >
          ⚡ Instant demo wallet
        </button>
      </div>

      {useOwn && ownAddr && (
        <p className="mt-2 break-all text-center text-[11px] text-ink-500">
          {ownAddr.slice(0, 10)}…{ownAddr.slice(-6)}
          {balance !== null && (
            <> · <span className="mono text-ink-300">${balance.toFixed(2)}</span> pathUSD</>
          )}
        </p>
      )}

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
        placeholder="Custom amount (USD)"
      />

      <input
        className="input mt-3"
        maxLength={140}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Say something nice to ${recipientName}… (optional)`}
      />

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-300">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="h-4 w-4 accent-wink"
        />
        Wink incognito 🕶️ <span className="text-ink-500">(your name stays hidden)</span>
      </label>

      <button
        className="btn-primary mt-5 w-full text-base"
        onClick={wink}
        disabled={["signing", "confirming", "funding"].includes(stage) || (useOwn && !ownAddr)}
      >
        {stage === "funding" && "Funding demo wallet…"}
        {stage === "signing" && (useOwn ? "Confirm in your wallet…" : "Sending on-chain…")}
        {stage === "confirming" && "Confirming on Tempo…"}
        {!["funding", "signing", "confirming"].includes(stage) &&
          `😉 Wink $${dollars || "0"}`}
      </button>

      {!useOwn && !wallet && (
        <p className="mt-3 text-center text-xs text-ink-500">
          First wink? We&apos;ll create an instant demo wallet in your browser —
          no signup, no seed phrase.
        </p>
      )}
      {!useOwn && wallet && balance !== null && (
        <p className="mt-3 text-center text-xs text-ink-500">
          demo wallet balance: <span className="mono text-ink-300">${balance.toFixed(2)}</span> pathUSD
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";
/**
 * The wink sender — lives on every public /@handle page.
 * Real business: supports Tempo direct + any chain via Relay
 *
 * Two funding sources, two rails:
 *   👛 My own wallet — any injected EIP-1193 (MetaMask, Rabby) on any chain
 *   ⚡ Instant demo wallet — Tempo only, faucet-funded real pathUSD
 *
 * Rails:
 *   - Tempo (42431): transferWithMemo pathUSD direct, ~$0.008 fee
 *   - Base/Eth/Arb/Op/Poly: USDC → Tempo pathUSD via Relay (approve+deposit)
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
  connectWalletAnyChain,
  injectedWalletClient,
} from "@/lib/connectedWallet";
import { PATH_USD, TIP20_ABI } from "@/lib/tempo";
import type { Address } from "viem";

const PRESETS = [1, 3, 5, 10];

const CHAINS = [
  { id: 42431, name: "Tempo", symbol: "pathUSD", isTempo: true },
  { id: 8453, name: "Base", symbol: "USDC", isTempo: false },
  { id: 1, name: "Ethereum", symbol: "USDC", isTempo: false },
  { id: 42161, name: "Arbitrum", symbol: "USDC", isTempo: false },
  { id: 10, name: "Optimism", symbol: "USDC", isTempo: false },
  { id: 137, name: "Polygon", symbol: "USDC", isTempo: false },
];

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
  eventSlug,
  mode = "wink",
  payCodeSlug,
  payRequestId,
  fixedAmountMicro,
  invoiceRef,
}: {
  handle: string;
  recipientName: string;
  eventSlug?: string;
  mode?: "wink" | "pay";
  payCodeSlug?: string;
  payRequestId?: string;
  fixedAmountMicro?: number;
  invoiceRef?: string;
}) {
  const isPay = mode === "pay";
  const [hasOwn, setHasOwn] = useState(false);
  const [useOwn, setUseOwn] = useState(false);
  const [ownAddr, setOwnAddr] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [chainId, setChainId] = useState(42431); // default Tempo

  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [dollars, setDollars] = useState<string>(
    fixedAmountMicro ? String(fixedAmountMicro / 1_000_000) : "3",
  );
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [bridgeQuote, setBridgeQuote] = useState<any>(null);
  const [bridgeTxs, setBridgeTxs] = useState<string[]>([]);

  const currentChain = CHAINS.find(c => c.id === chainId) || CHAINS[0];
  const isTempo = currentChain.isTempo;

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
      // for Tempo direct, force switch to Tempo; for any-chain, connect without switch
      const addr = isTempo ? await connectInjectedWallet() : await connectWalletAnyChain();
      setOwnAddr(addr);
      setUseOwn(true);
      setBalance(await fetchBalance(addr));
      fetch("/api/wallet/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: addr, kind: "connected", label: "my wallet" }),
      }).catch(() => {});
      // try to detect chain and set selector
      try {
        const eth = (window as any).ethereum;
        const chainHex = await eth.request({ method: "eth_chainId" });
        const cid = parseInt(chainHex, 16);
        if (CHAINS.some(c => c.id === cid)) setChainId(cid);
      } catch {}
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
    setBridgeQuote(null);
    setBridgeTxs([]);
    try {
      const amountMicro = Math.round(parseFloat(dollars) * 1_000_000);
      if (!isFinite(amountMicro) || amountMicro < 100_000)
        throw new Error("minimum wink is $0.10");

      // chain selection logic
      if (!isTempo) {
        // ANY CHAIN FLOW: need own wallet (demo only works on Tempo)
        if (!useOwn || !ownAddr) throw new Error(`To pay with ${currentChain.name} USDC, connect your wallet first — demo wallet only works on Tempo`);
        const eth = (window as any).ethereum;
        if (!eth) throw new Error("No injected wallet found");
        // switch chain if needed
        try {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
        } catch (e: any) {
          // ignore if user rejects, will fail on quote
        }
        setStage("signing");
        setError(null);
        const quoteRes = await fetch("/api/bridge/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ handle, sender: ownAddr, sourceChainId: chainId, amountMicro }),
        }).then(r => r.json());
        if (!quoteRes.steps) throw new Error(quoteRes.error || "quote failed — check handle exists and you have USDC on that chain");
        setBridgeQuote(quoteRes);
        setStage("signing");
        const hashes: string[] = [];
        for (const step of quoteRes.steps) {
          for (const item of step.items) {
            const d = item.data as any;
            if (!d?.to) continue;
            const hash = await eth.request({
              method: "eth_sendTransaction",
              params: [{ from: ownAddr, to: d.to, data: d.data, value: d.value || "0x0" }],
            });
            hashes.push(hash);
            setBridgeTxs([...hashes]);
            await new Promise(r => setTimeout(r, 1500));
          }
        }
        setTxHash(hashes[0] || null);
        setStage("done");
        return;
      }

      // TEMPO DIRECT FLOW (original)
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
          eventSlug,
          payCodeSlug,
          payRequestId,
        }),
      }).then((r) => r.json());
      if (!prep.transferId) throw new Error(prep.error ?? "prepare failed — handle not found?");

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
        <div className="text-4xl">{isPay ? "💸✅" : "😉✨"}</div>
        <h3 className="mt-3 text-lg font-bold">
          {isPay
            ? `You paid $${dollars} to @${handle}`
            : `You winked $${dollars} to @${handle}`}
        </h3>
        <p className="mt-1 text-sm text-ink-300">
          {isTempo ? "Settled on Tempo" : `Sent on ${currentChain.name} → Tempo via Relay`}
          {txHash ? ` · tx ${txHash.slice(0, 10)}…` : ""}
          {invoiceRef ? ` · ${invoiceRef}` : ""}
          {bridgeQuote?.requestId ? ` · req ${bridgeQuote.requestId.slice(0, 8)}…` : ""}
        </p>
        {bridgeTxs.length > 0 && (
          <div className="mt-3 text-[10px] font-mono text-ink-500 break-all">Txs: {bridgeTxs.join(", ").slice(0, 80)}…</div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <a href="/claim" className="btn-primary">
            😍 Claim your own @handle — start receiving winks
          </a>
          <button className="btn-ghost" onClick={() => { setStage("idle"); setError(null); setBridgeQuote(null); }}>
            Wink again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold">
        {isPay ? "Pay" : "Wink"} <span className="text-wink">@{handle}</span>
        {invoiceRef && (
          <span className="ml-2 rounded-md bg-wink/15 px-2 py-0.5 text-xs font-semibold text-wink">
            {invoiceRef}
          </span>
        )}
      </h3>

      {/* chain selector — NEW */}
      <div className="mt-4">
        <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-ink-500 mb-1.5">pay with — any chain in, Tempo out</div>
        <select
          value={chainId}
          onChange={e => setChainId(Number(e.target.value))}
          className="w-full bg-black border border-line rounded-xl px-3 py-2.5 text-[13px] text-white"
        >
          {CHAINS.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.symbol} {c.isTempo ? "(direct, ~$0.008)" : "(via Relay, auto-forward)"}</option>
          ))}
        </select>
        {!isTempo && (
          <div className="mt-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
            You selected <strong>{currentChain.name}</strong>. You have USDC on {currentChain.name}? Connect wallet, we quote via Relay, you sign approve+deposit, solver fills @{handle} with pathUSD on Tempo in ~12s. No need to switch to Tempo.
          </div>
        )}
      </div>

      {/* wallet source */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {hasOwn && (
          <button
            onClick={() => (ownAddr ? setUseOwn(true) : connectOwn())}
            disabled={connecting}
            className={`rounded-xl border px-2 py-2.5 font-semibold transition ${
              useOwn
                ? "border-wink bg-wink/15 text-wink"
                : "border-line text-ink-300 hover:border-ink-500"
            }`}
          >
            {connecting ? "Connecting…" : ownAddr ? "👛 My wallet" : "👛 Connect wallet"}
          </button>
        )}
        <button
          onClick={() => { if (isTempo) setUseOwn(false); else setError("Demo wallet only works on Tempo — switch to Tempo chain or connect wallet"); }}
          className={`rounded-xl border px-2 py-2.5 font-semibold transition ${
            !useOwn
              ? "border-wink bg-wink/15 text-wink"
              : "border-line text-ink-300 hover:border-ink-500"
          } ${hasOwn ? "" : "col-span-2"} ${!isTempo ? "opacity-50" : ""}`}
        >
          ⚡ Instant demo wallet {isTempo ? "" : "(Tempo only)"}
        </button>
      </div>

      {useOwn && ownAddr && (
        <p className="mt-2 break-all text-center text-[11px] text-ink-500">
          {ownAddr.slice(0, 10)}…{ownAddr.slice(-6)} · on {currentChain.name}
          {balance !== null && isTempo && (
            <> · <span className="mono text-ink-300">${balance.toFixed(2)}</span> pathUSD</>
          )}
        </p>
      )}

      {fixedAmountMicro ? (
        <div className="mt-4 rounded-xl border border-wink/40 bg-wink/10 py-4 text-center">
          <div className="text-3xl font-bold text-wink">
            ${(fixedAmountMicro / 1_000_000).toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-ink-400">
            fixed by this pay code — {isTempo ? "no gas, no fees" : `via ${currentChain.name} Relay`}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setDollars(String(p))}
                className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                  dollars === String(p)
                    ? "border-wink bg-wink/15 text-wink"
                    : "border-line text-ink-300 hover:border-ink-500"
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
        </>
      )}

      <input
        className="input mt-3"
        maxLength={140}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={
          isPay
            ? `Note for ${recipientName}… (optional)`
            : `Say something nice to ${recipientName}… (optional)`
        }
      />

      {!isPay && isTempo && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 accent-wink"
          />
          Wink incognito 🕶️ <span className="text-ink-500">(your name stays hidden)</span>
        </label>
      )}

      <button
        className="btn-primary mt-5 w-full text-base"
        onClick={wink}
        disabled={["signing", "confirming", "funding"].includes(stage) || (useOwn && !ownAddr)}
      >
        {stage === "funding" && "Funding demo wallet…"}
        {stage === "signing" && (isTempo ? (useOwn ? "Confirm in your wallet…" : "Sending on-chain…") : `Quoting + signing on ${currentChain.name}…`)}
        {stage === "confirming" && "Confirming on Tempo…"}
        {![ "funding", "signing", "confirming" ].includes(stage) &&
          (isTempo ? (isPay ? `💸 Pay $${dollars || "0"} on Tempo` : `😉 Wink $${dollars || "0"} on Tempo`) : `💸 Pay $${dollars || "0"} with ${currentChain.name} USDC → Tempo`)}
      </button>

      {!useOwn && !wallet && isTempo && (
        <p className="mt-3 text-center text-xs text-ink-500">
          First wink? We&apos;ll create an instant demo wallet in your browser —
          no signup, no seed phrase.
        </p>
      )}
      {!useOwn && wallet && balance !== null && isTempo && (
        <p className="mt-3 text-center text-xs text-ink-500">
          demo wallet balance: <span className="mono text-ink-300">${balance.toFixed(2)}</span> pathUSD
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {bridgeQuote && (
        <div className="mt-3 rounded-xl bg-black border border-line p-3 text-[11px] font-mono">
          <div className="flex justify-between"><span className="text-ink-500">receiver Tempo</span><span className="text-white">{bridgeQuote.receiver?.slice(0, 10)}…</span></div>
          <div className="flex justify-between mt-1"><span className="text-ink-500">requestId</span><span className="text-white">{bridgeQuote.requestId?.slice(0, 12)}…</span></div>
        </div>
      )}
    </div>
  );
}

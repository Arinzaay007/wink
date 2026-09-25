"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Wallet, ArrowRight } from "lucide-react";
import { BgFx } from "@/components/BgFx";

const BASE_CHAIN_ID = 8453;
const BASE_HEX = "0x2105";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function BasePayTestPage() {
  const [handle, setHandle] = useState("demo");
  const [amount, setAmount] = useState("1");
  const [sender, setSender] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  const connect = async () => {
    setError(null);
    try {
      if (!window.ethereum) throw new Error("No MetaMask found");
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts[0];
      setSender(addr);
      // switch to Base
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_HEX }],
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: BASE_HEX, chainName: "Base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"] }],
          });
        }
      }
      setStatus(`Connected ${addr.slice(0, 6)}…${addr.slice(-4)} on Base`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const getQuote = async () => {
    setError(null);
    setQuote(null);
    setTxHashes([]);
    if (!sender) {
      setError("Connect wallet first");
      return;
    }
    try {
      setStatus("Quoting Base USDC → Tempo pathUSD via Relay...");
      const amountMicro = Math.round(parseFloat(amount) * 1_000_000);
      const res = await fetch("/api/bridge/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), sender, sourceChainId: BASE_CHAIN_ID, amountMicro }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "quote failed");
      setQuote(json);
      setStatus(`Quote ready: ${json.chainName} → Tempo pathUSD · requestId ${json.requestId?.slice(0, 12)}… · ${json.steps?.length} txs`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    }
  };

  const pay = async () => {
    if (!quote || !sender) return;
    setError(null);
    setStatus("Signing on Base via MetaMask...");
    try {
      const hashes: string[] = [];
      for (const step of quote.steps) {
        for (const item of step.items) {
          const d = item.data as any;
          if (!d?.to) continue;
          const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [{ from: sender, to: d.to, data: d.data, value: d.value || "0x0" }],
          });
          hashes.push(hash);
          setStatus(`Sent tx ${hash.slice(0, 10)}… waiting for confirmation...`);
          // wait a bit
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      setTxHashes(hashes);
      setStatus(`✅ Sent ${hashes.length} txs on Base. Solver will fill ${quote.receiver} on Tempo with pathUSD in ~12-30s. requestId ${quote.requestId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="relative">
      <BgFx variant="tight" />
      <div className="max-w-[800px] mx-auto px-5 md:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white mb-8">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="chip chip-red mb-6"><Zap size={11} /> /test/base-pay · pay with Base USDC via MetaMask · mainnet</div>
        <h1 className="text-display text-[48px] leading-[0.95] text-white">Pay <em className="italic font-light neon-text">@handle</em> with Base USDC</h1>
        <p className="mt-4 text-[color:var(--color-ink-2)] leading-relaxed">Connect MetaMask on Base mainnet, enter a @handle that exists, quote via Relay, sign approve + deposit on Base. Recipient gets pathUSD on Tempo mainnet. Live funds.</p>

        <div className="mt-10 card p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">recipient @handle</div>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3 text-sm text-white" placeholder="demo" />
            </div>
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">amount USDC on Base</div>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3 text-sm text-white" placeholder="1" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={connect} className="btn-ghost flex-1 justify-center !py-3"><Wallet size={14} /> {sender ? `${sender.slice(0, 6)}…${sender.slice(-4)}` : "Connect MetaMask"}</button>
            <button onClick={getQuote} disabled={!sender} className="btn-ghost flex-1 justify-center !py-3 disabled:opacity-50">Get Quote</button>
          </div>

          {quote && (
            <div className="bg-black border border-[color:var(--color-line)] rounded-xl p-4 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-[color:var(--color-ink-3)]">receiver Tempo</span><span className="text-white">{quote.receiver.slice(0, 10)}…</span></div>
              <div className="flex justify-between mt-2"><span className="text-[color:var(--color-ink-3)]">requestId</span><span className="text-white">{quote.requestId?.slice(0, 18)}…</span></div>
              <div className="flex justify-between mt-2"><span className="text-[color:var(--color-ink-3)]">steps</span><span className="text-[color:var(--color-neon)]">{quote.steps?.length} txs on Base</span></div>
              <div className="mt-2 text-[10px] text-[color:var(--color-ink-3)] break-all">{JSON.stringify(quote.fees)?.slice(0, 120)}</div>
            </div>
          )}

          <button onClick={pay} disabled={!quote} className="btn-primary w-full justify-center !py-3 disabled:opacity-50">Pay with Base USDC <ArrowRight size={14} /></button>

          {status && <div className="text-[12px] text-white bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/30 rounded-xl px-4 py-3">{status}</div>}
          {txHashes.length > 0 && <div className="text-[11px] font-mono text-[color:var(--color-ink-2)] break-all">Base txs: {txHashes.join(", ")}</div>}
          {error && <div className="text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}

          <div className="text-[11px] text-[color:var(--color-ink-3)] leading-relaxed">
            Payment link format: <span className="text-white font-mono">/pay/@handle?chain=base&amount=1</span> — this test page uses same engine. To generate a shareable link: create a handle at /claim, then share <span className="text-white">/pay/@yourhandle</span> — payer can choose Base USDC via Relay (coming soon to TipForm) or use this test page.
          </div>
        </div>

        <div className="mt-8 card p-5">
          <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">how it works</div>
          <div className="space-y-2 text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">
            <div><span className="text-white">01</span> Payer connects MetaMask on Base, has USDC + a little ETH gas</div>
            <div><span className="text-white">02</span> Quote Base USDC → Tempo pathUSD via Relay API (approve + deposit steps)</div>
            <div><span className="text-white">03</span> Payer signs on Base, solver fills recipient on Tempo with pathUSD, verified on-chain</div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Wallet, ArrowRight } from "lucide-react";
import { BgFx } from "@/components/BgFx";

const CHAINS = [
  { id: 8453, name: "Base", hex: "0x2105", rpc: "https://mainnet.base.org", explorer: "https://basescan.org" },
  { id: 1, name: "Ethereum", hex: "0x1", rpc: "https://eth.llamarpc.com", explorer: "https://etherscan.io" },
  { id: 42161, name: "Arbitrum", hex: "0xa4b1", rpc: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io" },
  { id: 10, name: "Optimism", hex: "0xa", rpc: "https://mainnet.optimism.io", explorer: "https://optimistic.etherscan.io" },
  { id: 137, name: "Polygon", hex: "0x89", rpc: "https://polygon-rpc.com", explorer: "https://polygonscan.com" },
];

export default function BasePayTestPage() {
  const [handle, setHandle] = useState("demo");
  const [amount, setAmount] = useState("1");
  const [chainId, setChainId] = useState(8453);
  const [sender, setSender] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  const currentChain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  const connect = async () => {
    setError(null);
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("No MetaMask found");
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts[0];
      setSender(addr);
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: currentChain.hex }],
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: currentChain.hex, chainName: currentChain.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [currentChain.rpc], blockExplorerUrls: [currentChain.explorer] }],
          });
        }
      }
      setStatus(`Connected ${addr.slice(0, 6)}…${addr.slice(-4)} on ${currentChain.name}`);
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
      setStatus(`Quoting ${currentChain.name} USDC → Tempo pathUSD via Relay...`);
      const amountMicro = Math.round(parseFloat(amount) * 1_000_000);
      const res = await fetch("/api/bridge/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), sender, sourceChainId: chainId, amountMicro }),
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
    setStatus(`Signing on ${currentChain.name} via MetaMask...`);
    try {
      const eth = (window as any).ethereum;
      const hashes: string[] = [];
      for (const step of quote.steps) {
        for (const item of step.items) {
          const d = item.data as any;
          if (!d?.to) continue;
          const hash = await eth.request({
            method: "eth_sendTransaction",
            params: [{ from: sender, to: d.to, data: d.data, value: d.value || "0x0" }],
          });
          hashes.push(hash);
          setStatus(`Sent tx ${hash.slice(0, 10)}… waiting...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      setTxHashes(hashes);
      setStatus(`✅ Sent ${hashes.length} txs on ${currentChain.name}. Solver will fill ${quote.receiver} on Tempo with pathUSD in ~12-30s. requestId ${quote.requestId}`);
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

        <div className="chip chip-red mb-6"><Zap size={11} /> /test/base-pay · pay with any chain USDC via MetaMask · mainnet</div>
        <h1 className="text-display text-[48px] leading-[0.95] text-white">Pay <em className="italic font-light neon-text">@handle</em> with any chain</h1>
        <p className="mt-4 text-[color:var(--color-ink-2)] leading-relaxed">Connect MetaMask on Base/Eth/Arb/Op/Poly, enter a @handle that exists, quote via Relay, sign approve + deposit. Recipient gets pathUSD on Tempo mainnet. This is the payment link flow: wink user generates link, sender connects wallet and sends.</p>

        <div className="mt-10 card p-6 space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">recipient @handle</div>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3 text-sm text-white" placeholder="demo" />
            </div>
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">amount USDC</div>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3 text-sm text-white" placeholder="1" />
            </div>
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">sender chain</div>
              <select value={chainId} onChange={(e) => setChainId(Number(e.target.value))} className="w-full bg-black border border-[color:var(--color-line)] rounded-xl px-4 py-3 text-sm text-white">
                {CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={connect} className="btn-ghost flex-1 justify-center !py-3"><Wallet size={14} /> {sender ? `${sender.slice(0, 6)}…${sender.slice(-4)}` : `Connect on ${currentChain.name}`}</button>
            <button onClick={getQuote} disabled={!sender} className="btn-ghost flex-1 justify-center !py-3 disabled:opacity-50">Get Quote</button>
          </div>

          {quote && (
            <div className="bg-black border border-[color:var(--color-line)] rounded-xl p-4 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-[color:var(--color-ink-3)]">receiver Tempo</span><span className="text-white">{quote.receiver.slice(0, 10)}…</span></div>
              <div className="flex justify-between mt-2"><span className="text-[color:var(--color-ink-3)]">requestId</span><span className="text-white">{quote.requestId?.slice(0, 18)}…</span></div>
              <div className="flex justify-between mt-2"><span className="text-[color:var(--color-ink-3)]">steps</span><span className="text-[color:var(--color-neon)]">{quote.steps?.length} txs on {currentChain.name}</span></div>
            </div>
          )}

          <button onClick={pay} disabled={!quote} className="btn-primary w-full justify-center !py-3 disabled:opacity-50">Pay with {currentChain.name} USDC <ArrowRight size={14} /></button>

          {status && <div className="text-[12px] text-white bg-[color:var(--color-neon-soft)] border border-[color:var(--color-neon)]/30 rounded-xl px-4 py-3">{status}</div>}
          {txHashes.length > 0 && <div className="text-[11px] font-mono text-[color:var(--color-ink-2)] break-all">Txs: {txHashes.join(", ")} — <a href={`${currentChain.explorer}/tx/${txHashes[0]}`} target="_blank" className="text-[color:var(--color-neon)]">View on {currentChain.name}Scan ↗</a></div>}
          {error && <div className="text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}

          <div className="text-[11px] text-[color:var(--color-ink-3)] leading-relaxed">
            This IS the payment link flow you described: wink user shares <span className="text-white font-mono">/wink/@handle</span>, sender connects wallet on any chain (Base/Eth/Arb/Op/Poly), pays USDC, recipient gets pathUSD on Tempo.
          </div>
        </div>
      </div>
    </div>
  );
}

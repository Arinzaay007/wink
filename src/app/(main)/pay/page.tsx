"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Receipt, Plus, Copy, Check, QrCode, ScanLine } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import QRCode from "qrcode";
import QrScanner from "@/components/QrScanner";
import { useRouter } from "next/navigation";

type PayCode = {
  id: string;
  slug: string;
  kind: "tip" | "invoice";
  amountMicro: number | null;
  memo: string | null;
  note: string | null;
  createdAt: string;
};

function QrImg({ text, size = 180 }: { text: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setUrl)
      .catch(() => setUrl(null));
  }, [text, size]);
  if (!url) return <div className="w-[180px] h-[180px] bg-white/5 animate-pulse rounded-xl" />;
  return <img src={url} alt="QR" width={size} height={size} className="rounded-xl bg-white p-2" />;
}

export default function PayPage() {
  const [me, setMe] = useState<{ handles: string[] } | null>(null);
  const [codes, setCodes] = useState<PayCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("25");
  const [memo, setMemo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [meRes, codesRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
          fetch("/api/pay-codes", { cache: "no-store" }).then(r => r.ok ? r.json() : { payCodes: [] }),
        ]);
        if (meRes) setMe(meRes);
        if (codesRes?.payCodes) setCodes(codesRes.payCodes);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const handle = me?.handles?.[0] || null;
  const baseLink = handle ? `https://winkpay.xyz/wink/${handle}` : "https://winkpay.xyz/wink/demo";
  const payLink = handle ? `https://winkpay.xyz/pay/${handle}` : "https://winkpay.xyz/pay/demo";

  const createCode = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/pay-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "invoice",
          amountDollars: parseFloat(amount),
          memo: memo || undefined,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setCodes(prev => [json.payCode, ...prev]);
      setMemo("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleScan = (text: string) => {
    setShowScanner(false);
    try {
      if (text.includes("winkpay.xyz")) {
        const u = new URL(text.startsWith("http") ? text : `https://${text}`);
        router.push(u.pathname + u.search);
        return;
      }
      const h = text.replace(/^@/, "").trim();
      if (h) router.push(`/pay/${h}`);
    } catch {
      router.push(`/pay/${text.replace(/^@/, "")}`);
    }
  };

  return (
    <div className="relative">
      <BgFx />
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition">
            <ArrowLeft size={14} /> back
          </Link>
          <button onClick={() => setShowScanner(true)} className="text-[11px] font-mono uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] hover:text-[color:var(--color-neon)] border border-[color:var(--color-line)] rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <ScanLine size={12} /> Scan QR
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="chip chip-red mb-4"><Receipt size={11} /> /pay · merchant QR · real</div>
            <h1 className="text-display text-[48px] sm:text-[60px] leading-[0.9] tracking-[-0.04em]">
              <span className="text-white">Your QR</span><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-3 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              Every handle gets its own unique QR. Customers scan with any wallet — Base, Eth, Arb, Op, Poly USDC → Tempo pathUSD. Real payCodes API, not mock.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-mono text-[11px] text-[color:var(--color-ink-3)]">loading…</div>
        ) : !handle ? (
          <div className="card p-8 text-center">
            <div className="text-display text-xl text-white">No handle yet</div>
            <p className="text-[13px] text-[color:var(--color-ink-2)] mt-2">Claim a handle to get your unique merchant QR.</p>
            <Link href="/claim" className="mt-4 inline-flex btn-primary !py-2.5 !px-5">Claim @handle</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
            <div className="space-y-6">
              <div className="card p-6 text-center">
                <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-4">your unique QR · @{handle}</div>
                <div className="flex justify-center">
                  <QrImg text={payLink} size={220} />
                </div>
                <div className="mt-4 font-mono text-[11px] text-white break-all">{payLink}</div>
                <div className="mt-3 flex gap-2 justify-center">
                  <button onClick={() => copy(payLink, "main")} className="btn-ghost !py-2 !text-[11px]"><Copy size={12} /> {copied === "main" ? "Copied" : "Copy link"}</button>
                  <Link href={payLink} className="btn-primary !py-2 !text-[11px]">Open pay page</Link>
                </div>
                <div className="mt-4 text-[11px] text-[color:var(--color-ink-2)]">Any wallet scans → pays @{handle} with pathUSD on Tempo. Memo reconciles automatically.</div>
              </div>

              <div className="card p-6">
                <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">also works</div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-[color:var(--color-ink-2)]">Wink link</span><span className="font-mono text-white">{baseLink}</span></div>
                  <div className="flex justify-between"><span className="text-[color:var(--color-ink-2)]">Pay link</span><span className="font-mono text-white">{payLink}</span></div>
                  <div className="text-[11px] text-[color:var(--color-ink-3)] mt-2">Both resolve to your Tempo wallet. Pay link shows invoice UI, wink link shows tip UI — same rails.</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-display text-xl text-white">Create invoice QR</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-[color:var(--color-line)] text-[color:var(--color-ink-2)]">real API</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">amount USD (fixed)</div>
                    <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0.5" step="0.5" className="input !text-[14px]" placeholder="25" />
                  </div>
                  <div>
                    <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">invoice # / memo</div>
                    <input value={memo} onChange={e => setMemo(e.target.value)} maxLength={31} className="input !text-[14px]" placeholder="INV-042" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-1.5">note to payer (optional)</div>
                  <input value={note} onChange={e => setNote(e.target.value)} maxLength={140} className="input !text-[14px]" placeholder="Coffee + croissant" />
                </div>
                <button onClick={createCode} disabled={creating} className="mt-4 btn-primary w-full justify-center !py-3 disabled:opacity-50">
                  <Plus size={14} /> {creating ? "Creating…" : `Create $${amount || "0"} invoice QR`}
                </button>
                {error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">{error}</div>}
              </div>

              <div>
                <h3 className="text-display text-lg text-white mb-3">Your invoice QRS · {codes.length}</h3>
                {codes.length === 0 ? (
                  <div className="card p-6 text-center text-[13px] text-[color:var(--color-ink-3)]">No invoice codes yet — create one above. Each gets its own unique QR and slug.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {codes.map(c => {
                      const link = `https://winkpay.xyz/pay/${handle}?code=${c.slug}&amount=${c.amountMicro ? (c.amountMicro/1_000_000).toFixed(2) : ""}`;
                      return (
                        <div key={c.id} className="card p-4">
                          <div className="flex justify-center mb-3">
                            <QrImg text={link} size={140} />
                          </div>
                          <div className="text-mono text-[10px] text-[color:var(--color-ink-3)]">{c.kind} · {c.slug}</div>
                          <div className="text-white font-medium text-[14px] mt-1">
                            {c.amountMicro ? `$${(c.amountMicro/1_000_000).toFixed(2)}` : "Open amount"} {c.memo ? `· ${c.memo}` : ""}
                          </div>
                          {c.note && <div className="text-[11px] text-[color:var(--color-ink-2)] mt-1">{c.note}</div>}
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => copy(link, c.id)} className="btn-ghost flex-1 justify-center !py-1.5 !text-[10px]"><Copy size={10} /> {copied === c.id ? "Copied" : "Copy"}</button>
                            <Link href={`/pay/${handle}?code=${c.slug}`} className="btn-ghost flex-1 justify-center !py-1.5 !text-[10px]">Open</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

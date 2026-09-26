"use client";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Receipt, ShieldCheck, Copy, Check, ScanLine } from "lucide-react";
import { BgFx } from "@/components/BgFx";
import TipForm from "@/components/TipForm";
import QRCode from "qrcode";
import QrScanner from "@/components/QrScanner";

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

export default function PayHandlePage() {
  const routeParams = useParams() as { handle?: string };
  const search = useSearchParams();
  const router = useRouter();
  const rawHandle = (routeParams.handle || "cafe-mira").replace(/^@/, "");
  const handle = rawHandle.toLowerCase();
  const code = search.get("code") || undefined;
  const amountParam = search.get("amount");

  const [copied, setCopied] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const payLink = `https://www.winkpay.xyz/pay/${handle}${code ? `?code=${code}` : ""}`;
  const winkLink = `https://www.winkpay.xyz/wink/${handle}`;

  const copy = async () => {
    await navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScan = (text: string) => {
    setShowScanner(false);
    // if scanned link is winkpay URL, navigate to it
    try {
      if (text.includes("winkpay.xyz")) {
        const u = new URL(text.startsWith("http") ? text : `https://${text}`);
        router.push(u.pathname + u.search);
        return;
      }
      // if 0x address, go to wallet send? for now go to wallet
      if (text.startsWith("0x") && text.length === 42) {
        router.push(`/wallet?scan=${text}`);
        return;
      }
      // handle
      const h = text.replace(/^@/, "").trim();
      if (h) router.push(`/pay/${h}`);
    } catch {
      router.push(`/pay/${text.replace(/^@/, "")}`);
    }
  };

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition">
            <ArrowLeft size={14} /> back
          </Link>
          <button onClick={() => setShowScanner(true)} className="text-[11px] font-mono uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] hover:text-[color:var(--color-neon)] border border-[color:var(--color-line)] rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <ScanLine size={12} /> Scan QR
          </button>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="chip chip-red mb-6"><Receipt size={11} /> /pay/{handle} {code ? `· ${code}` : "· unique QR"} · real</div>
            <h1 className="text-display text-[48px] sm:text-[60px] leading-[0.9] tracking-[-0.04em]">
              Pay <em className="italic font-light neon-text">@{handle}</em><span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-4 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              Unique QR for @{handle}. Scan with any wallet — Base, Eth, Arb, Op, Poly USDC → Tempo pathUSD. Real payCodes API, memo reconciles on-chain.
              {code && <span className="text-white"> · Invoice {code} {amountParam ? `$${amountParam}` : ""}</span>}
            </p>

            <div className="mt-8">
              <div className="card p-2">
                <TipForm
                  handle={handle}
                  recipientName={handle}
                  mode="pay"
                  payCodeSlug={code}
                  fixedAmountMicro={amountParam ? Math.round(parseFloat(amountParam) * 1_000_000) : undefined}
                  invoiceRef={code}
                />
              </div>
              <div className="mt-3 card p-4 flex items-start gap-3 text-[12px] text-[color:var(--color-ink-2)]">
                <ShieldCheck size={14} className="text-[color:var(--color-neon)] mt-0.5 shrink-0" />
                <span>
                  Real flow — <code className="font-mono text-white">transferWithMemo</code> on Tempo. {code ? `Memo = ${code} for reconciliation.` : "Memo on chain reconciles payment."} Merchant never sees customer address.
                </span>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="card p-6 text-center">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-3">unique QR · @{handle} {code ? `· ${code}` : ""}</div>
              <div className="flex justify-center">
                <QrImg text={payLink} size={220} />
              </div>
              <div className="mt-3 font-mono text-[11px] text-white break-all">{payLink}</div>
              <div className="mt-3 flex gap-2 justify-center">
                <button onClick={copy} className="btn-ghost !py-2 !text-[11px]"><Copy size={12} /> {copied ? "Copied" : "Copy link"}</button>
                <Link href={winkLink} className="btn-ghost !py-2 !text-[11px]">Wink link →</Link>
              </div>
              <div className="mt-3 text-[11px] text-[color:var(--color-ink-2)]">Scan → any wallet pays @{handle}. 0% Wink fee, ~$0.008 network.</div>
            </div>

            <div className="card p-4">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">how it works</div>
              <div className="space-y-2 text-[12px] text-[color:var(--color-ink-2)] leading-relaxed">
                <div><span className="text-white">1.</span> Merchant @{handle} has unique QR → encodes {payLink}</div>
                <div><span className="text-white">2.</span> Customer scans, connects wallet on any chain, pays USDC</div>
                <div><span className="text-white">3.</span> Relay quotes → solver fills pathUSD on Tempo → verified on-chain</div>
                <div><span className="text-white">4.</span> Dashboard shows payment by memo {code || "wk_..."} — no address exposed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

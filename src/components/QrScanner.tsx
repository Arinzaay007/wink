"use client";
import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";

type Props = {
  onScan: (text: string) => void;
  onClose: () => void;
};

export default function QrScanner({ onScan, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !ref.current) return;
        const id = "qr-reader";
        // ensure div exists
        const html5QrCode = new Html5Qrcode(id);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (!mounted) return;
            html5QrCode.stop().catch(() => {});
            onScan(decoded);
          },
          () => {}
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      mounted = false;
      try {
        scannerRef.current?.stop().catch(() => {});
        scannerRef.current?.clear().catch(() => {});
      } catch {}
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[420px] card p-0 overflow-hidden border-[color:var(--color-neon)]/30">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[color:var(--color-line)]">
          <div className="flex items-center gap-2 text-white text-[13px]"><Camera size={14} className="text-[color:var(--color-neon)]" /> Scan QR</div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 border border-[color:var(--color-line)] flex items-center justify-center"><X size={14} /></button>
        </div>
        <div className="p-4">
          <div id="qr-reader" ref={ref} className="w-full rounded-xl overflow-hidden bg-black" />
          {error && <div className="mt-3 text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl p-3">{error} — allow camera permission, or type handle manually.</div>}
          <div className="mt-3 text-[11px] text-[color:var(--color-ink-3)] text-center">Point camera at merchant QR — winkpay.xyz/wink/@handle or 0x address. Works from any chain.</div>
        </div>
      </div>
    </div>
  );
}

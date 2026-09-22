import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TEMPO_NETWORK } from "@/lib/tempo";

export const metadata: Metadata = {
  title: "Wink — anyone, anywhere, paid with a wink",
  description:
    "The name layer for payments. Wink tips, sales and wages to @usernames — settled on Tempo in under a second.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/80 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="text-xl" aria-hidden>
                😉
              </span>
              <span>
                wink<span className="text-wink">.cash</span>
              </span>
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {TEMPO_NETWORK === "testnet" && (
                <span className="hidden rounded-full border border-wink/40 bg-wink/10 px-2.5 py-1 text-xs font-medium text-wink sm:inline-block">
                  Tempo testnet · Moderato
                </span>
              )}
              <Link href="/dashboard" className="text-ink-300 hover:text-ink-100">
                Dashboard
              </Link>
              <Link href="/claim" className="btn-primary !py-2 text-xs">
                Claim your handle
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4">{children}</main>
        <footer className="mt-16 border-t border-ink-800 py-8 text-center text-xs text-ink-500">
          Wink — the name layer for payments · Built on{" "}
          <span className="text-ink-300">Tempo</span> · pathUSD stablecoin ·
          #Colosseum Crypto World&apos;s Fair
        </footer>
      </body>
    </html>
  );
}

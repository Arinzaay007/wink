import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { TEMPO_NETWORK } from "@/lib/tempo";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz"],
  style: ["normal", "italic"],
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Wink — anyone, anywhere, paid with a wink",
  description:
    "The name layer for payments. Wink tips, sales and wages to @usernames — settled on Tempo in under a second.",
};

/** The wink mark — one eye open, one closed. Drawn, not emoji. */
function WinkMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      {/* open eye */}
      <circle cx="10.5" cy="14" r="3" fill="currentColor" />
      {/* winking eye — the closed arc */}
      <path
        d="M18.5 14.5c1.8-2.6 5.2-2.6 7 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* the smile */}
      <path
        d="M10 22.5c3.6 2.8 8.4 2.8 12 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="text-ink-950 transition-transform duration-200 group-hover:rotate-6">
                <WinkMark className="h-7 w-7" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-ink-950">
                wink<span className="italic text-wink-deep">.cash</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {TEMPO_NETWORK === "testnet" && (
                <span className="hidden items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-500 sm:inline-flex">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-mint" />
                  Tempo testnet
                </span>
              )}
              <Link
                href="/dashboard"
                className="font-medium text-ink-400 transition-colors hover:text-ink-950"
              >
                Dashboard
              </Link>
              <Link
                href="/agents"
                className="hidden font-medium text-ink-400 transition-colors hover:text-ink-950 sm:inline"
              >
                Agents
              </Link>
              <Link href="/claim" className="btn-primary !py-2 text-xs">
                Claim your handle
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4">{children}</main>
        <footer className="mt-20 border-t border-line py-10 text-center text-xs text-ink-500">
          <span className="font-display text-sm italic text-ink-300">
            wink.cash
          </span>{" "}
          — the name layer for payments · built on{" "}
          <span className="font-medium text-ink-300">Tempo</span> · settled in
          pathUSD · #Colosseum Crypto World&apos;s Fair
        </footer>
      </body>
    </html>
  );
}

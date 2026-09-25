"use client";
import Link from "next/link";
import { WinkLogo } from "./Logo";
import { Twitter, Send } from "lucide-react";

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-4">
        {title}
      </div>
      <div className="flex flex-col gap-2.5 text-sm text-[color:var(--color-ink-2)]">{children}</div>
    </div>
  );
}
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link href={to} className="hover:text-white transition">
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-[color:var(--color-line)] bg-black">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[color:var(--color-neon)] to-transparent opacity-50" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-16">
        <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-12">
          <div>
            <div className="flex items-center gap-2.5">
              <WinkLogo size={36} />
              <span className="text-display text-[22px]">
                <span className="text-white">wink</span>
                <span className="text-[color:var(--color-neon)]">.</span>
              </span>
            </div>
            <p className="mt-5 text-[color:var(--color-ink-2)] text-sm max-w-xs leading-relaxed">
              The name layer for payments. One primitive —{" "}
              <span className="text-[color:var(--color-neon)] font-medium">pay a @username</span> — settled as
              stablecoins on Tempo.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: Twitter, href: "#" },
                { Icon: Send, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-lg border border-[color:var(--color-line)] flex items-center justify-center text-[color:var(--color-ink-2)] hover:text-white hover:border-[color:var(--color-line-2)] transition"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Pay">
            <FooterLink to="/wink/demo">Send a wink</FooterLink>
            <FooterLink to="/wall/wedding">Spray a wall</FooterLink>
            <FooterLink to="/pay">Merchant checkout</FooterLink>
          </FooterCol>
          <FooterCol title="Work">
            <FooterLink to="/request/lina">Pay request</FooterLink>
            <FooterLink to="/payroll">Batch payroll</FooterLink>
            <FooterLink to="/dashboard">Dashboard</FooterLink>
          </FooterCol>
          <FooterCol title="Agents">
            <FooterLink to="/agents">MPP simulator</FooterLink>
            <FooterLink to="/docs">Protocol</FooterLink>
            <FooterLink to="/docs">Tempo SDK</FooterLink>
          </FooterCol>
          <FooterCol title="Chain">
            <FooterLink to="/docs">Tempo Moderato</FooterLink>
            <FooterLink to="/docs">pathUSD TIP-20</FooterLink>
            <FooterLink to="/docs">Cross-chain relay</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 pt-6 border-t border-[color:var(--color-line)] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="text-xs text-mono text-[color:var(--color-ink-3)]">
            © 2026 wink — anyone, anywhere, paid with a wink.
          </div>
          <div className="flex items-center gap-5 text-xs text-mono text-[color:var(--color-ink-3)]">
            <span className="flex items-center gap-2">
              <span className="dot-live" /> tempo · mainnet · 42431
            </span>
            <span>v0.4.2</span>
            <span className="text-[color:var(--color-neon)]">0% platform fee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

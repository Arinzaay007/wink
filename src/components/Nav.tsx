"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WinkLogo } from "./Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight, LogOut } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/wink/demo", label: "Wink" },
  { to: "/wall/wedding", label: "Wall" },
  { to: "/pay", label: "Pay" },
  { to: "/wallet", label: "Wallet" },
  { to: "/request/lina", label: "Request" },
  { to: "/payroll", label: "Payroll" },
  { to: "/agents", label: "Agents" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/docs", label: "Docs" },
];

type Me = { handles?: string[]; user?: { displayName?: string } } | null;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) throw new Error("no session");
        const data = await res.json();
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handle = me?.handles?.[0];
  const isAuthed = !!me && !!handle;

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setMe(null);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-[color:var(--color-line)]"
      >
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <WinkLogo size={32} />
            <span className="text-display text-[19px] tracking-tight">
              <span className="text-white">wink</span>
              <span className="text-[color:var(--color-neon)]">.</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-[13px] text-[color:var(--color-ink-2)]">
            {NAV.slice(0, 8).map((n) => {
              const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  href={n.to}
                  className={`px-3 py-2 rounded-lg transition-all hover:text-white ${
                    active ? "text-white bg-white/5 border border-[color:var(--color-line)]" : ""
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/docs" className="hidden md:inline-flex btn-ghost !py-2 !px-3 text-[13px] !rounded-lg">
              Docs <ArrowUpRight size={14} />
            </Link>

            {!loading && (
              <>
                {isAuthed ? (
                  <>
                    <Link
                      href={`/wink/${handle}`}
                      className="hidden md:inline-flex btn-ghost !py-2 !px-3 text-[13px] !rounded-lg border border-[color:var(--color-neon)]/30 text-[color:var(--color-neon)]"
                    >
                      @{handle} · live
                    </Link>
                    <Link href="/dashboard" className="btn-primary !py-2 !px-3 text-[13px] !rounded-lg">
                      Dashboard
                    </Link>
                    <button
                      onClick={signOut}
                      className="hidden md:inline-flex w-8 h-8 rounded-lg border border-[color:var(--color-line)] items-center justify-center text-[color:var(--color-ink-2)] hover:text-white"
                      title="Sign out"
                    >
                      <LogOut size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="hidden md:inline-flex btn-ghost !py-2 !px-3 text-[13px] !rounded-lg">
                      Sign in
                    </Link>
                    <Link href="/claim" className="btn-primary !py-2 !px-3 text-[13px] !rounded-lg">
                      Sign up
                    </Link>
                  </>
                )}
              </>
            )}

            <button
              aria-label="Menu"
              className="lg:hidden ml-1 p-2 rounded-lg border border-[color:var(--color-line)] text-white"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="lg:hidden border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]/95 backdrop-blur"
          >
            <div className="px-5 py-3 grid grid-cols-2 gap-2">
              {NAV.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    href={n.to}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-sm border ${
                      active
                        ? "bg-white/5 text-white border-[color:var(--color-line-2)]"
                        : "border-transparent text-[color:var(--color-ink-2)]"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <div className="col-span-2 mt-2 grid grid-cols-2 gap-2">
                {isAuthed ? (
                  <>
                    <Link
                      href={`/wink/${handle}`}
                      onClick={() => setOpen(false)}
                      className="btn-ghost justify-center !py-3 border border-[color:var(--color-neon)]/30 text-[color:var(--color-neon)]"
                    >
                      @{handle} · live
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        signOut();
                      }}
                      className="btn-ghost justify-center !py-3"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost justify-center !py-3">
                      Sign in
                    </Link>
                    <Link href="/claim" onClick={() => setOpen(false)} className="btn-primary justify-center !py-3">
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";
/**
 * Recipient dashboard — unified money-in feed, handles, wallet,
 * privacy controls, and printable wink codes.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadDemoWallet, createDemoWallet, fetchBalance } from "@/lib/demoWallet";
import { formatMicro } from "@/lib/tempo";

interface Me {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    privacy: { amountsPublic: boolean; feedPublic: boolean };
  };
  handles: string[];
  wallets: { address: string; kind: string; label: string | null }[];
  incoming: {
    id: string;
    kind: string;
    amountMicro: number;
    message: string | null;
    tipperVisibility: "named" | "anonymous";
    status: string;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unauthed" | "nodb">("loading");
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [funding, setFunding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/me");
    if (res.status === 503) return setState("nodb");
    if (res.status === 401) return setState("unauthed");
    setMe(await res.json());
    setState("ok");
  }, []);

  useEffect(() => {
    load();
    const w = loadDemoWallet();
    if (w) {
      setWalletAddr(w.address);
      fetchBalance(w.address).then(setBalance).catch(() => {});
    }
  }, [load]);

  const makeWallet = async () => {
    const w = createDemoWallet();
    setWalletAddr(w.address);
    await fetch("/api/wallet/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: w.address, kind: "inapp", label: "demo wallet" }),
    });
    setBalance(await fetchBalance(w.address));
    load();
  };

  const fund = async () => {
    if (!walletAddr) return;
    setFunding(true);
    await fetch("/api/fund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: walletAddr }),
    });
    setTimeout(async () => {
      setBalance(await fetchBalance(walletAddr as `0x${string}`));
      setFunding(false);
    }, 1500);
  };

  const setPrivacy = async (patch: Record<string, boolean>) => {
    if (!me) return;
    setMe({ ...me, user: { ...me.user, privacy: { ...me.user.privacy, ...patch } } });
    await fetch("/api/privacy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  if (state === "loading")
    return <div className="py-24 text-center text-ink-500">Loading…</div>;

  if (state === "nodb")
    return (
      <div className="py-24 text-center text-ink-300">
        ⚠️ Database not configured — add DATABASE_URL and run <code>npm run db:push</code>.
      </div>
    );

  if (state === "unauthed")
    return (
      <div className="py-24 text-center">
        <div className="text-5xl">🔑</div>
        <h1 className="mt-4 text-2xl font-bold">You&apos;re not signed in</h1>
        <p className="mt-2 text-ink-300">Claim a handle or sign in with your email.</p>
        <Link href="/claim" className="btn-primary mt-6">
          Claim your handle
        </Link>
      </div>
    );

  const m = me!;
  const confirmed = m.incoming.filter((t) => t.status === "confirmed");
  const totalMicro = confirmed.reduce((s, t) => s + t.amountMicro, 0);

  return (
    <div className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hey, {m.user.displayName ?? "you"} 👋</h1>
          <p className="mt-1 text-sm text-ink-300">{m.user.email}</p>
        </div>
        <div className="card px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wider text-ink-300">total winked</div>
          <div className="mono text-xl font-bold text-mint">${formatMicro(totalMicro)}</div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* handles + QR */}
        <section className="card p-6">
          <h2 className="font-semibold">Your handles</h2>
          {m.handles.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              No handles yet —{" "}
              <Link href="/claim" className="text-wink">
                claim one
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {m.handles.map((h) => (
                <li key={h} className="flex items-center gap-3 rounded-xl border border-ink-700 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/qr?h=${h}`}
                    alt={`QR for @${h}`}
                    className="h-16 w-16 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/@${h}`} className="font-semibold text-wink hover:underline">
                      @{h}
                    </Link>
                    <p className="text-xs text-ink-500">
                      print the code · share the link · get winked
                    </p>
                  </div>
                  <a
                    href={`/api/qr?h=${h}`}
                    download={`wink-${h}.png`}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    QR ↓
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* wallet */}
        <section className="card p-6">
          <h2 className="font-semibold">Wallet</h2>
          {!walletAddr && m.wallets.length === 0 ? (
            <>
              <p className="mt-3 text-sm text-ink-300">
                Create your in-app wallet to start receiving winks on-chain.
              </p>
              <button onClick={makeWallet} className="btn-primary mt-4">
                Create my wallet
              </button>
            </>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              {(walletAddr ? [walletAddr, ...m.wallets.map((w) => w.address)] : m.wallets.map((w) => w.address))
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((addr) => (
                  <div key={addr} className="rounded-xl border border-ink-700 p-3">
                    <div className="mono break-all text-xs text-ink-300">{addr}</div>
                  </div>
                ))}
              {balance !== null && (
                <p className="text-ink-300">
                  balance: <span className="mono font-semibold text-ink-100">${balance.toFixed(2)}</span>{" "}
                  pathUSD
                </p>
              )}
              <button onClick={fund} disabled={funding} className="btn-ghost">
                {funding ? "Funding…" : "⛲ Top up from testnet faucet"}
              </button>
            </div>
          )}
        </section>

        {/* privacy */}
        <section className="card p-6">
          <h2 className="font-semibold">🔒 Privacy</h2>
          <p className="mt-1 text-xs text-ink-500">
            Private where it matters — your numbers are yours.
          </p>
          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>Show amounts on my public page</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-wink"
              checked={m.user.privacy.amountsPublic}
              onChange={(e) => setPrivacy({ amountsPublic: e.target.checked })}
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span>Show my wink feed publicly</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-wink"
              checked={m.user.privacy.feedPublic}
              onChange={(e) => setPrivacy({ feedPublic: e.target.checked })}
            />
          </label>
        </section>

        {/* feed */}
        <section className="card p-6">
          <h2 className="font-semibold">Money in</h2>
          {confirmed.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              No winks yet. Share your handle and let the winks rain. 😉
            </p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {confirmed.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-ink-700 px-3 py-2.5 text-sm">
                  <span>{t.tipperVisibility === "anonymous" ? "🕶️" : "😉"}</span>
                  <span className="flex-1 truncate text-ink-300">
                    {t.message ?? (t.kind === "wink" ? "wink" : t.kind)}
                  </span>
                  <span className="mono font-semibold text-mint">
                    +${formatMicro(t.amountMicro)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

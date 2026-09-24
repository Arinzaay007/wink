"use client";
/**
 * Recipient dashboard — unified money-in feed, handles, wallet,
 * privacy controls, and printable wink codes.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadDemoWallet, createDemoWallet, fetchBalance } from "@/lib/demoWallet";
import { fetchPortfolio, type Portfolio } from "@/lib/portfolio";
import { formatMicro } from "@/lib/tempo";
import BridgeWatchCard from "@/components/BridgeWatchCard";
import TipForm from "@/components/TipForm";
import TelegramCard from "@/components/TelegramCard";

interface MyEvent {
  slug: string;
  title: string;
  emoji: string;
  live: boolean;
}

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
    invoiceRef: string | null;
    tipperVisibility: "named" | "anonymous";
    status: string;
    createdAt: string;
  }[];
}

type PayCode = {
  id: string;
  slug: string;
  kind: "tip" | "invoice";
  amountMicro: number | null;
  memo: string | null;
  note: string | null;
};

type PayReq = {
  id: string;
  amountMicro: number;
  note: string | null;
  status: "open" | "paid" | "declined" | "expired";
  createdAt: string;
  counterpartyHandle: string | null;
  counterpartyName: string | null;
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unauthed" | "nodb">("loading");
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [funding, setFunding] = useState(false);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventEmoji, setEventEmoji] = useState("🎉");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [myPayCodes, setMyPayCodes] = useState<PayCode[]>([]);
  const [pcKind, setPcKind] = useState<"tip" | "invoice">("tip");
  const [pcAmount, setPcAmount] = useState("");
  const [pcMemo, setPcMemo] = useState("");
  const [pcNote, setPcNote] = useState("");
  const [creatingPayCode, setCreatingPayCode] = useState(false);
  const [incomingReqs, setIncomingReqs] = useState<PayReq[]>([]);
  const [sentReqs, setSentReqs] = useState<PayReq[]>([]);
  const [payingReqId, setPayingReqId] = useState<string | null>(null);
  const [reqTarget, setReqTarget] = useState("");

  const refreshPortfolio = useCallback((addr: string) => {
    fetchPortfolio(addr as `0x${string}`)
      .then(setPortfolio)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/me");
    if (res.status === 503) return setState("nodb");
    if (res.status === 401) return setState("unauthed");
    setMe(await res.json());
    setState("ok");
  }, []);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) setMyEvents((await res.json()).events ?? []);
  }, []);

  const loadPayCodes = useCallback(async () => {
    const res = await fetch("/api/pay-codes");
    if (res.ok) setMyPayCodes((await res.json()).payCodes ?? []);
  }, []);

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/pay-requests");
    if (res.ok) {
      const j = await res.json();
      setIncomingReqs(j.incoming ?? []);
      setSentReqs(j.sent ?? []);
    }
  }, []);

  const declineRequest = async (id: string) => {
    await fetch(`/api/pay-requests/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    loadRequests();
  };

  useEffect(() => {
    load();
    loadEvents();
    loadPayCodes();
    loadRequests();
    const w = loadDemoWallet();
    if (w) {
      setWalletAddr(w.address);
      fetchBalance(w.address).then(setBalance).catch(() => {});
      refreshPortfolio(w.address);
    }
  }, [load, loadEvents, loadPayCodes, loadRequests, refreshPortfolio]);

  const createEvent = async () => {
    if (!eventTitle.trim()) return;
    setCreatingEvent(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: eventTitle.trim(), emoji: eventEmoji }),
    });
    setEventTitle("");
    setCreatingEvent(false);
    loadEvents();
  };

  const createPayCode = async () => {
    if (pcKind === "invoice" && (!pcAmount || parseFloat(pcAmount) <= 0)) return;
    setCreatingPayCode(true);
    const res = await fetch("/api/pay-codes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: pcKind,
        amountDollars: pcAmount ? parseFloat(pcAmount) : undefined,
        memo: pcMemo || undefined,
        note: pcNote || undefined,
      }),
    });
    if (res.ok) {
      setPcAmount("");
      setPcMemo("");
      setPcNote("");
      loadPayCodes();
    }
    setCreatingPayCode(false);
  };

  const makeWallet = async () => {
    const w = createDemoWallet();
    setWalletAddr(w.address);
    await fetch("/api/wallet/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: w.address, kind: "inapp", label: "demo wallet" }),
    });
    setBalance(await fetchBalance(w.address));
    refreshPortfolio(w.address);
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
      refreshPortfolio(walletAddr);
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
                <li key={h} className="flex items-center gap-3 rounded-xl border border-line p-3">
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
                  <div key={addr} className="rounded-xl border border-line p-3">
                    <div className="mono break-all text-xs text-ink-300">{addr}</div>
                  </div>
                ))}
              {portfolio && portfolio.assets.length > 0 ? (
                <div className="rounded-xl border border-line p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-ink-500">Portfolio</span>
                    <span className="mono text-base font-bold text-ink-100">
                      ${portfolio.totalUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 border-t border-line pt-2">
                    {portfolio.assets.map((a) => (
                      <div key={a.address} className="flex justify-between text-xs text-ink-300">
                        <span>{a.symbol}</span>
                        <span className="mono">${a.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                balance !== null && (
                  <p className="text-ink-300">
                    balance: <span className="mono font-semibold text-ink-100">${balance.toFixed(2)}</span>{" "}
                    pathUSD
                  </p>
                )
              )}
              <button onClick={fund} disabled={funding} className="btn-ghost">
                {funding ? "Funding…" : "⛲ Top up from testnet faucet"}
              </button>
            </div>
          )}
        </section>

        {/* bridge watcher */}
        <BridgeWatchCard defaultReceiver={walletAddr ?? undefined} />

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

        {/* telegram notifications */}
        <TelegramCard />

        {/* spray walls */}
        <section className="card p-6">
          <h2 className="font-semibold">🎉 Spray walls</h2>
          <p className="mt-1 text-xs text-ink-500">
            One QR for the whole party — winks rain on a live big screen.
          </p>
          <div className="mt-4 flex gap-2">
            <select
              className="input !w-16 text-center"
              value={eventEmoji}
              onChange={(e) => setEventEmoji(e.target.value)}
            >
              {["🎉", "💍", "🎂", "🎤", "⚽", "🙏", "🏆"].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
            <input
              className="input flex-1"
              placeholder='e.g. "Adaeze & Chidi&apos;s Wedding"'
              value={eventTitle}
              maxLength={60}
              onChange={(e) => setEventTitle(e.target.value)}
            />
            <button className="btn-primary !px-3" disabled={creatingEvent} onClick={createEvent}>
              Create
            </button>
          </div>
          {myEvents.length > 0 && (
            <ul className="mt-4 space-y-2">
              {myEvents.map((ev) => (
                <li key={ev.slug} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/qr?p=/wall/${ev.slug}`} alt="QR" className="h-12 w-12 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {ev.emoji} {ev.title}
                    </div>
                    <div className="text-xs text-ink-500">/wall/{ev.slug}</div>
                  </div>
                  <Link href={`/wall/${ev.slug}`} className="btn-ghost !px-3 !py-1.5 text-xs">
                    Open wall →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* merchant pay codes */}
        <section className="card p-6">
          <h2 className="font-semibold">🏪 Pay codes</h2>
          <p className="mt-1 text-xs text-ink-500">
            Print a QR, put it on the counter, get paid. Invoices carry a
            reference so every sale reconciles itself.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              className="input !w-32"
              value={pcKind}
              onChange={(e) => setPcKind(e.target.value as "tip" | "invoice")}
            >
              <option value="tip">Tip jar</option>
              <option value="invoice">Invoice</option>
            </select>
            {pcKind === "invoice" && (
              <input
                className="input !w-28"
                type="number"
                min="0.1"
                step="0.5"
                placeholder="$ amount"
                value={pcAmount}
                onChange={(e) => setPcAmount(e.target.value)}
              />
            )}
            {pcKind === "invoice" && (
              <input
                className="input !w-32"
                placeholder="INV-001"
                maxLength={31}
                value={pcMemo}
                onChange={(e) => setPcMemo(e.target.value)}
              />
            )}
            <input
              className="input flex-1"
              placeholder='What is it for? e.g. "Haircut + beard"'
              maxLength={140}
              value={pcNote}
              onChange={(e) => setPcNote(e.target.value)}
            />
            <button className="btn-primary !px-3" disabled={creatingPayCode} onClick={createPayCode}>
              Create
            </button>
          </div>

          {myPayCodes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {myPayCodes.map((pc) => {
                const path = `/pay/${me?.handles[0] ?? ""}?code=${pc.slug}`;
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}${path}`
                    : path;
                return (
                  <li key={pc.slug} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/qr?p=${encodeURIComponent(path)}`} alt="QR" className="h-12 w-12 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {pc.kind === "invoice" ? "🧾" : "🫙"}{" "}
                        {pc.note ?? (pc.kind === "invoice" ? "Invoice" : "Tip jar")}
                        {pc.amountMicro != null && (
                          <span className="mono ml-2 text-mint">${formatMicro(pc.amountMicro)}</span>
                        )}
                        {pc.memo && <span className="mono ml-2 text-xs text-ink-400">{pc.memo}</span>}
                      </div>
                      <div className="truncate text-xs text-ink-500">{path}</div>
                    </div>
                    <button
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                      onClick={() => navigator.clipboard?.writeText(url)}
                    >
                      Copy link
                    </button>
                    <a href={`/api/qr?p=${encodeURIComponent(path)}`} download={`wink-pay-${pc.slug}.png`} className="btn-ghost !px-3 !py-1.5 text-xs">
                      QR ↓
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* pay requests (payouts wedge) */}
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">💸 Pay requests</h2>
            <Link href="/payroll" className="btn-ghost !px-3 !py-1.5 text-xs">
              💼 Run batch payroll →
            </Link>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Workers ask, you approve — one tap pays them on-chain. Or send
            your own request to anyone with a handle.
          </p>

          {/* send a request */}
          <div className="mt-4 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Request from @handle…"
              maxLength={30}
              value={reqTarget}
              onChange={(e) => setReqTarget(e.target.value.replace(/^@/, ""))}
            />
            <Link
              href={reqTarget.trim() ? `/request/${reqTarget.trim()}` : "#"}
              aria-disabled={!reqTarget.trim()}
              className={`btn-primary !px-3 ${reqTarget.trim() ? "" : "pointer-events-none opacity-40"}`}
            >
              Request →
            </Link>
          </div>

          {/* incoming requests */}
          {incomingReqs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">
                People asking you
              </h3>
              <ul className="mt-2 space-y-2">
                {incomingReqs.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span>📨</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          @{r.counterpartyHandle ?? "someone"}
                          <span className="mono ml-2 text-mint">${formatMicro(r.amountMicro)}</span>
                        </div>
                        {r.note && <div className="truncate text-xs text-ink-500">{r.note}</div>}
                      </div>
                      {r.status === "open" ? (
                        <>
                          <button
                            className="btn-primary !px-3 !py-1.5 text-xs"
                            onClick={() => setPayingReqId(payingReqId === r.id ? null : r.id)}
                          >
                            {payingReqId === r.id ? "Close" : "Pay now"}
                          </button>
                          <button
                            className="btn-ghost !px-3 !py-1.5 text-xs"
                            onClick={() => declineRequest(r.id)}
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <span className="rounded-md bg-paper-dim px-2 py-1 text-xs text-ink-400">
                          {r.status}
                        </span>
                      )}
                    </div>
                    {payingReqId === r.id && r.counterpartyHandle && (
                      <div className="mt-3">
                        <TipForm
                          handle={r.counterpartyHandle}
                          recipientName={r.counterpartyName ?? r.counterpartyHandle}
                          mode="pay"
                          payRequestId={r.id}
                          fixedAmountMicro={r.amountMicro}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* requests I sent */}
          {sentReqs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">
                Your requests
              </h3>
              <ul className="mt-2 space-y-2">
                {sentReqs.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                    <span>
                      {r.status === "paid" ? "✅" : r.status === "declined" ? "🚫" : "⏳"}
                    </span>
                    <span className="flex-1 truncate text-ink-300">
                      to @{r.counterpartyHandle ?? "?"}
                      {r.note ? <> · {r.note}</> : null}
                    </span>
                    <span className="mono font-semibold text-ink-300">
                      ${formatMicro(r.amountMicro)}
                    </span>
                    <span className="rounded-md bg-paper-dim px-2 py-1 text-xs text-ink-400">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                  <span>
                    {t.kind === "sale"
                      ? "🧾"
                      : t.kind === "wage"
                        ? "💸"
                        : t.tipperVisibility === "anonymous"
                          ? "🕶️"
                          : "😉"}
                  </span>
                  <span className="flex-1 truncate text-ink-300">
                    {t.kind === "sale"
                      ? `sale${t.invoiceRef ? ` · ${t.invoiceRef}` : ""}${t.message ? ` · “${t.message}”` : ""}`
                      : t.kind === "wage"
                        ? `payout${t.message ? ` · “${t.message}”` : ""}`
                        : t.message ?? "wink"}
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

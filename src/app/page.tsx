import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { transfers, usernames, events } from "@/db/schema";
import { formatMicro, EXPLORER_URL } from "@/lib/tempo";

export const dynamic = "force-dynamic";

const WEDGES = [
  {
    emoji: "🎉",
    title: "Spray at events",
    body: "Guests scan one QR and winks rain onto a live wall. The bride sees every single one — appreciation, not competition.",
  },
  {
    emoji: "🏪",
    title: "Get paid at the counter",
    body: "Print a pay code. Customers scan, pay, and invoice numbers reconcile the sale automatically.",
  },
  {
    emoji: "💸",
    title: "Pay your remote team",
    body: "Workers request, payers approve with one tap, wages land in a @username — no bank details, no borders.",
  },
];

const LAWS = [
  ["Names over addresses", "Nobody pays 0x7f3a… — they pay @adaeze."],
  ["The chain is truth", "Every wink is verified on Tempo before it counts."],
  ["The send is the onboarding", "Anyone can pay in seconds. No signup, no seed phrase."],
  ["Private where it matters", "Hide amounts, wink incognito. Your numbers are yours."],
  ["Any chain in, Tempo out", "Pay from anywhere — it all settles as stablecoins on Tempo."],
];

const RAILS = [
  ["~500ms", "settlement finality"],
  ["<$0.01", "fee per wink"],
  ["0%", "platform fee"],
  ["0 gas", "sponsored for users"],
];

export default async function Home() {
  const db = getDb();

  // live proof of work — real numbers from the network
  let stats: {
    totalDollars: string;
    count: number;
    handles: number;
    walls: number;
    lastTx: string | null;
    lastMessage: string | null;
  } | null = null;

  if (db) {
    const confirmed = await db.query.transfers.findMany({
      where: eq(transfers.status, "confirmed"),
      orderBy: desc(transfers.createdAt),
      limit: 200,
    });
    const [handleCount] = await db
      .select({ n: sql<number>`count(*)` })
      .from(usernames);
    const [wallCount] = await db.select({ n: sql<number>`count(*)` }).from(events);
    const total = confirmed.reduce((s, t) => s + t.amountMicro, 0);
    stats = {
      totalDollars: formatMicro(total),
      count: confirmed.length,
      handles: Number(handleCount?.n ?? 0),
      walls: Number(wallCount?.n ?? 0),
      lastTx: confirmed[0]?.txHash ?? null,
      lastMessage: confirmed[0]?.message ?? null,
    };
  }

  return (
    <div className="py-14">
      {/* hero */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="animate-float text-6xl">😉</div>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Anyone, anywhere,{" "}
          <span className="bg-gradient-to-r from-wink to-wink-deep bg-clip-text text-transparent">
            paid with a wink
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-300">
          Wink is the <strong className="text-ink-100">name layer for payments</strong>.
          Claim your @handle and receive tips, shop sales, and wages in
          stablecoins — settled on Tempo in under a second. No wallet
          addresses. No fees. Just a wink.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/claim" className="btn-primary text-base">
            Claim your handle
          </Link>
          <Link href="/wink/adaeze" className="btn-ghost text-base">
            Try a live wink →
          </Link>
        </div>
      </section>

      {/* live proof of work */}
      <section className="mx-auto mt-14 max-w-3xl">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-300">
              Settling live on Tempo
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-mint">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />
              live
            </span>
          </div>
          {stats ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="text-center">
                  <div className="mono text-2xl font-bold text-wink">${stats.totalDollars}</div>
                  <div className="mt-1 text-xs text-ink-400">settled in stablecoins</div>
                </div>
                <div className="text-center">
                  <div className="mono text-2xl font-bold text-ink-100">{stats.count}</div>
                  <div className="mt-1 text-xs text-ink-400">on-chain payments</div>
                </div>
                <div className="text-center">
                  <div className="mono text-2xl font-bold text-ink-100">{stats.handles}</div>
                  <div className="mt-1 text-xs text-ink-400">handles claimed</div>
                </div>
                <div className="text-center">
                  <div className="mono text-2xl font-bold text-ink-100">{stats.walls}</div>
                  <div className="mt-1 text-xs text-ink-400">spray walls live</div>
                </div>
              </div>
              {stats.lastTx && (
                <a
                  href={`${EXPLORER_URL}/tx/${stats.lastTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block truncate rounded-lg border border-ink-700 px-3 py-2 text-center font-mono text-[11px] text-ink-400 transition hover:border-wink/50 hover:text-ink-300"
                >
                  last wink on-chain: {stats.lastTx.slice(0, 22)}…
                  {stats.lastMessage ? ` — “${stats.lastMessage}”` : ""} · verify in
                  explorer ↗
                </a>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-500">
              Connecting to the ledger…
            </p>
          )}
        </div>
      </section>

      {/* rails */}
      <section className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {RAILS.map(([v, l]) => (
          <div key={l} className="card px-4 py-5 text-center">
            <div className="mono text-2xl font-bold text-wink">{v}</div>
            <div className="mt-1 text-xs text-ink-300">{l}</div>
          </div>
        ))}
      </section>

      {/* wedges */}
      <section className="mt-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-ink-300">
          One handle. Every payment.
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {WEDGES.map((w) => (
            <div key={w.title} className="card p-6">
              <div className="text-3xl">{w.emoji}</div>
              <h3 className="mt-3 font-semibold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* any chain in, tempo out */}
      <section className="mx-auto mt-16 max-w-3xl">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold">
            Pay from <span className="text-wink">any chain</span>. Settle on{" "}
            <span className="text-wink">Tempo</span>. Always.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-300">
            Send USDC from Base, SOL from anywhere — Wink routes it through
            Tempo&apos;s first-party corridors and your recipient gets
            stablecoins in their balance. One name. Any chain. One balance.
          </p>
          <div className="mono mt-5 text-xs text-ink-500">
            Base · Ethereum · Arbitrum · Solana&hellip; → pathUSD on Tempo
          </div>
        </div>
      </section>

      {/* the laws */}
      <section className="mt-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-ink-300">
          Five laws we build by
        </h2>
        <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
          {LAWS.map(([t, b], i) => (
            <div key={t} className={`card p-5 ${i === 4 ? "sm:col-span-2" : ""}`}>
              <h3 className="text-sm font-semibold text-ink-100">{i + 1}. {t}</h3>
              <p className="mt-1 text-sm text-ink-400">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* closing CTA */}
      <section className="mx-auto mt-16 max-w-xl text-center">
        <h2 className="text-2xl font-extrabold">
          The rails are free. <span className="text-wink">The names are the business.</span>
        </h2>
        <p className="mt-3 text-sm text-ink-300">
          Your @handle is your storefront, your tip jar, and your payroll
          address. Claim it before someone else does.
        </p>
        <Link href="/claim" className="btn-primary mt-6 text-base">
          Claim your handle →
        </Link>
      </section>
    </div>
  );
}

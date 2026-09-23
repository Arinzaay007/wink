import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { transfers, usernames, events } from "@/db/schema";
import { formatMicro, EXPLORER_URL } from "@/lib/tempo";

export const dynamic = "force-dynamic";

const WEDGES = [
  {
    n: "01",
    title: "Spray at events",
    body: "Guests scan one QR and winks rain onto a live wall. The bride sees every single one — appreciation, not competition.",
  },
  {
    n: "02",
    title: "Get paid at the counter",
    body: "Print a pay code. Customers scan, pay, and invoice numbers reconcile the sale automatically.",
  },
  {
    n: "03",
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
    <div className="pb-10">
      {/* ── hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl pt-20 text-center sm:pt-28">
        <p className="eyebrow">The name layer for payments</p>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink-950 sm:text-6xl md:text-7xl">
          Anyone, anywhere,
          <br />
          paid with a{" "}
          <em className="italic text-wink-deep">
            wink<span className="text-wink">.</span>
          </em>
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-300">
          Claim your <strong className="font-semibold text-ink-900">@handle</strong>{" "}
          and receive tips, shop sales, and wages in stablecoins — settled on
          Tempo in under a second. No wallet addresses. No platform fee.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/claim" className="btn-primary px-6 text-base">
            Claim your handle
          </Link>
          <Link href="/wink/adaeze" className="btn-ghost px-6 text-base">
            Try a live wink →
          </Link>
        </div>
      </section>

      {/* ── live proof of work ───────────────────────────────────── */}
      <section className="mx-auto mt-20 max-w-3xl">
        <div className="card p-7 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg italic text-ink-900">
              Settling live on Tempo
            </h2>
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-mint">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />
              live
            </span>
          </div>
          {stats ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
                {(
                  [
                    [`$${stats.totalDollars}`, "settled in stablecoins", true],
                    [String(stats.count), "on-chain payments", false],
                    [String(stats.handles), "handles claimed", false],
                    [String(stats.walls), "spray walls live", false],
                  ] as [string, string, boolean][]
                ).map(([v, l, gold]) => (
                  <div key={l} className="text-center">
                    <div
                      className={`mono text-3xl font-bold ${
                        gold ? "text-wink-deep" : "text-ink-950"
                      }`}
                    >
                      {v}
                    </div>
                    <div className="mt-1.5 text-xs text-ink-500">{l}</div>
                  </div>
                ))}
              </div>
              {stats.lastTx && (
                <a
                  href={`${EXPLORER_URL}/tx/${stats.lastTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 block truncate rounded-xl border border-line bg-paper px-4 py-3 text-center font-mono text-[11px] text-ink-500 transition hover:border-wink hover:text-ink-900"
                >
                  last wink on-chain: {stats.lastTx.slice(0, 22)}…
                  {stats.lastMessage ? ` — “${stats.lastMessage}”` : ""} · verify
                  in explorer ↗
                </a>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-500">Connecting to the ledger…</p>
          )}
        </div>
      </section>

      {/* ── rails ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-14 max-w-3xl">
        <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          {RAILS.map(([v, l]) => (
            <div key={l} className="px-4 py-6 text-center">
              <div className="mono text-2xl font-bold text-ink-950">{v}</div>
              <div className="mt-1 text-xs text-ink-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── wedges ───────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-3xl">
        <p className="eyebrow text-center">One handle · every payment</p>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {WEDGES.map((w) => (
            <div key={w.n} className="grid gap-2 py-8 sm:grid-cols-[80px_1fr] sm:gap-6">
              <div className="font-display text-2xl italic text-wink-deep">{w.n}</div>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink-950">
                  {w.title}
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-300">
                  {w.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── any chain in, tempo out ──────────────────────────────── */}
      <section className="mx-auto mt-20 max-w-3xl">
        <div className="card bg-ink-950 p-9 text-center shadow-lift">
          <p className="eyebrow !text-wink-soft">The settlement doctrine</p>
          <h2 className="mt-4 font-display text-2xl font-semibold leading-snug text-paper sm:text-3xl">
            Pay from <em className="italic text-wink-soft">any chain</em>.
            <br className="hidden sm:block" /> Settle on{" "}
            <em className="italic text-wink-soft">Tempo</em>. Always.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-paper/70">
            Send USDC from Base, SOL from anywhere — Wink routes it through
            Tempo&apos;s first-party corridors and your recipient gets
            stablecoins in their balance. One name. Any chain. One balance.
          </p>
          <div className="mono mt-6 text-xs text-wink-soft/80">
            Base · Ethereum · Arbitrum · Solana&hellip; → pathUSD on Tempo
          </div>
        </div>
      </section>

      {/* ── the laws ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-3xl">
        <p className="eyebrow text-center">Five laws we build by</p>
        <div className="mt-8 space-y-4">
          {LAWS.map(([t, b], i) => (
            <div key={t} className="card flex items-baseline gap-5 p-5">
              <div className="font-display text-lg italic text-wink-deep">
                {i + 1}
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink-950">
                  {t}
                </h3>
                <p className="mt-0.5 text-sm text-ink-400">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── closing CTA ──────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-2xl pb-6 text-center">
        <h2 className="font-display text-3xl font-semibold leading-snug text-ink-950 sm:text-4xl">
          The rails are free.
          <br />
          <em className="italic text-wink-deep">The names are the business.</em>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-300">
          Your @handle is your storefront, your tip jar, and your payroll
          address. Claim it before someone else does.
        </p>
        <Link href="/claim" className="btn-primary mt-8 px-8 text-base">
          Claim your handle →
        </Link>
      </section>
    </div>
  );
}

import Link from "next/link";

const WEDGES = [
  {
    emoji: "🎉",
    title: "Spray at events",
    body: "Guests scan one QR and winks rain onto a live wall. The bride sees every single one.",
  },
  {
    emoji: "🏪",
    title: "Get paid at the counter",
    body: "Print a wink code. Customers scan, pay, and the sale reconciles itself by memo.",
  },
  {
    emoji: "💼",
    title: "Pay your remote team",
    body: "Workers request, projects approve, wages land in a @username — no bank details.",
  },
];

const RAILS = [
  ["~500ms", "settlement finality"],
  ["<$0.01", "fee per wink"],
  ["0%", "platform fee"],
  ["0 gas", "sponsored for users"],
];

export default function Home() {
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
          <Link href="/wink/demo" className="btn-ghost text-base">
            Try a live wink →
          </Link>
        </div>
      </section>

      {/* rails */}
      <section className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* privacy + how it works */}
      <section className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold">🔒 Private where it matters</h3>
          <p className="mt-2 text-sm text-ink-300">
            Hide amounts, wink incognito, or go fully private. Transparency
            where it must — settlement on Tempo. Privacy where it matters —
            your numbers are yours.
          </p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold">⚡ How a wink settles</h3>
          <p className="mt-2 text-sm text-ink-300">
            @you → pathUSD transfer with a 32-byte memo → confirmed on Tempo
            in ~500ms → the wink lands on their live feed. Gas is sponsored:
            they receive exactly what you sent.
          </p>
        </div>
      </section>
    </div>
  );
}

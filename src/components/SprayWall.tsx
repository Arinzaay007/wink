"use client";
/**
 * The spray wall 🎉 — big-screen live feed for events.
 * Guests scan the event QR and their winks rain down in real time.
 * Privacy-aware: if the host hides amounts, the wall ranks by wink count.
 */
import { useEffect, useRef, useState } from "react";
import TipForm from "@/components/TipForm";

interface WallData {
  event: { slug: string; title: string; emoji: string; live: boolean };
  host: { handle: string | null; displayName: string | null };
  totals: { micro: number | null; winks: number };
  recent: {
    id: string;
    amountMicro: number | null;
    message: string | null;
    anonymous: boolean;
    sprayer: string | null;
    createdAt: string;
  }[];
  leaderboard: { name: string; count: number; amountMicro: number | null }[];
}

interface Drop {
  key: string;
  emoji: string;
  label: string | null;
  left: number; // vw
  duration: number; // s
  size: number; // rem
}

function fmtMicro(micro: number): string {
  return (micro / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SprayWall({ slug }: { slug: string }) {
  const [data, setData] = useState<WallData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [showTip, setShowTip] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/wall/${slug}`);
        if (res.status === 404) return setError("This spray wall doesn't exist (yet).");
        const d: WallData = await res.json();
        setData(d);

        // new confirmed winks → make it rain (skip the initial backfill flood)
        if (!firstLoad.current) {
          const fresh = d.recent.filter((w) => !seen.current.has(w.id));
          if (fresh.length) {
            const newDrops: Drop[] = fresh.map((w) => ({
              key: w.id,
              emoji: d.event.emoji,
              label:
                w.amountMicro != null
                  ? `$${fmtMicro(w.amountMicro)}`
                  : w.anonymous
                    ? "🕶️"
                    : null,
              left: 4 + Math.random() * 90,
              duration: 3 + Math.random() * 2.5,
              size: 1.4 + Math.random() * 2.2,
            }));
            setDrops((prev) => [...prev.slice(-40), ...newDrops]);
          }
        }
        for (const w of d.recent) seen.current.add(w.id);
        firstLoad.current = false;
      } catch {
        /* keep polling through hiccups */
      }
    };

    poll();
    timer = setInterval(poll, 1500);
    return () => clearInterval(timer);
  }, [slug]);

  if (error)
    return (
      <div className="py-24 text-center text-ink-300">
        <div className="text-5xl">🤔</div>
        <p className="mt-4">{error}</p>
      </div>
    );

  if (!data)
    return <div className="py-24 text-center text-ink-500">Opening the wall…</div>;

  const amountsVisible = data.totals.micro !== null;

  return (
    <div className="relative -mx-4 min-h-[calc(100vh-3.5rem)] overflow-hidden px-4 pb-24">
      {/* rain layer */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {drops.map((d) => (
          <div
            key={d.key}
            className="spray-drop absolute top-0"
            style={{
              left: `${d.left}vw`,
              fontSize: `${d.size}rem`,
              animationDuration: `${d.duration}s`,
            }}
            onAnimationEnd={() =>
              setDrops((prev) => prev.filter((x) => x.key !== d.key))
            }
          >
            <span>{d.emoji}</span>
            {d.label && (
              <span className="ml-1 align-middle text-wink-soft">{d.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* stage */}
      <div className="relative z-0 mx-auto max-w-5xl pt-10">
        <div className="text-center">
          <div className="text-6xl">{data.event.emoji}</div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{data.event.title}</h1>
          <p className="mt-2 text-ink-300">
            spraying <span className="text-wink">@{data.host.handle}</span>
            {data.host.displayName ? ` · ${data.host.displayName}` : ""}
          </p>
        </div>

        {/* totals */}
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-wink/30 bg-wink/10 px-8 py-5 text-center">
          {amountsVisible ? (
            <>
              <div className="mono text-4xl font-black text-wink">
                ${fmtMicro(data.totals.micro ?? 0)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-ink-300">
                sprayed so far · {data.totals.winks} winks
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl font-black text-wink">
                {data.totals.winks} 🎉
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-ink-300">
                winks so far · amounts kept private 🔒
              </div>
            </>
          )}
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          {/* live feed — the heart of the wall */}
          <section>
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-ink-300">
              Live from the floor
            </h2>
            {data.recent.length === 0 ? (
              <p className="mt-6 text-center text-sm text-ink-500">
                The wall is waiting for its first wink… be the one who starts it. 😉
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.recent.slice(0, 12).map((w) => (
                  <li
                    key={w.id}
                    className="card animate-wink-in flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span className="text-lg">{w.anonymous ? "🕶️" : data.event.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-300">
                      <strong className="text-ink-100">
                        {w.anonymous ? "Someone special" : w.sprayer}
                      </strong>
                      {w.message ? <> · “{w.message}”</> : " sent a wink"}
                    </span>
                    <span className="mono font-semibold text-mint">
                      {w.amountMicro != null ? `$${fmtMicro(w.amountMicro)}` : "🔒"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button
            className="btn-primary mt-8 w-full text-lg"
            onClick={() => setShowTip((v) => !v)}
          >
            🎉 {showTip ? "Close" : "SPRAY NOW"}
          </button>
        </div>

        {/* spray panel */}
        {showTip && (
          <div className="mx-auto mt-8 max-w-md animate-wink-in">
            <TipForm
              handle={data.host.handle ?? ""}
              recipientName={data.host.displayName ?? data.host.handle ?? "the host"}
              eventSlug={slug}
            />
          </div>
        )}
      </div>
    </div>
  );
}

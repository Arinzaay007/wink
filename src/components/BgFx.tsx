"use client";
/**
 * Atmospheric background — noise grid + corner glows
 */
export function BgFx({ variant = "default" }: { variant?: "default" | "tight" | "raw" }) {
  const cls = variant === "tight" ? "bg-grid" : variant === "raw" ? "bg-noise" : "bg-noise";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${cls}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
    </div>
  );
}

export function Marquee({
  items,
}: {
  items: { left: React.ReactNode; right: React.ReactNode }[];
}) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden fade-x">
      <div className="flex gap-12 marquee-track whitespace-nowrap py-3">
        {doubled.map((it, i) => (
          <div key={i} className="flex items-center gap-4 text-sm text-mono">
            <span className="text-white">{it.left}</span>
            <span className="text-[color:var(--color-ink-3)]">·</span>
            <span className="text-[color:var(--color-ink-2)]">{it.right}</span>
            <span className="text-[color:var(--color-neon)] mx-4">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}

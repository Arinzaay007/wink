import { NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { events, transfers, users, usernames } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live spray-wall data feed (polled every ~1.5s by the wall).
 * Privacy-aware: if the host hides amounts, the wall ranks by wink
 * count and never shows numbers.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const { slug } = await ctx.params;
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const host = await db.query.users.findFirst({ where: eq(users.id, event.ownerId) });
  if (!host) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const hostHandle = await db.query.usernames.findFirst({
    where: eq(usernames.userId, host.id),
  });

  const amountsPublic = host.privacyAmountsPublic;

  const wallWinks = await db.query.transfers.findMany({
    where: and(eq(transfers.eventId, event.id), eq(transfers.status, "confirmed")),
    orderBy: desc(transfers.createdAt),
    limit: 200,
  });

  // resolve sprayer display names (registered users only; guests & anonymous stay masked)
  const fromUserIds = [
    ...new Set(wallWinks.map((w) => w.fromUserId).filter(Boolean) as string[]),
  ];
  const sprayerNames = new Map<string, string>();
  if (fromUserIds.length) {
    const rows = await db
      .select({ id: users.id, name: users.displayName })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(
        fromUserIds.map((id) => sql`${id}`),
        sql`, `
      )})`);
    for (const r of rows) sprayerNames.set(r.id, r.name ?? "Guest");
  }

  const totalMicro = wallWinks.reduce((s, w) => s + w.amountMicro, 0);

  const recent = wallWinks.slice(0, 30).map((w) => ({
    id: w.id,
    amountMicro: amountsPublic ? w.amountMicro : null,
    message: w.message,
    anonymous: w.tipperVisibility === "anonymous",
    sprayer:
      w.tipperVisibility === "anonymous"
        ? null
        : (w.fromUserId && sprayerNames.get(w.fromUserId)) || "Guest",
    createdAt: w.createdAt,
  }));

  // leaderboard — anonymous winks opted out, so they're excluded
  const board = new Map<string, { count: number; micro: number }>();
  for (const w of wallWinks) {
    if (w.tipperVisibility === "anonymous") continue;
    const key = (w.fromUserId && sprayerNames.get(w.fromUserId)) || "Guest";
    const cur = board.get(key) ?? { count: 0, micro: 0 };
    cur.count += 1;
    cur.micro += w.amountMicro;
    board.set(key, cur);
  }
  const leaderboard = [...board.entries()]
    .map(([name, v]) => ({
      name,
      count: v.count,
      amountMicro: amountsPublic ? v.micro : null,
    }))
    .sort((a, b) => b.count - a.count || b.amountMicro! - a.amountMicro!)
    .slice(0, 8);

  return NextResponse.json({
    event: {
      slug: event.slug,
      title: event.title,
      emoji: event.emoji,
      live: event.live,
    },
    host: { handle: hostHandle?.handle, displayName: host.displayName },
    totals: {
      micro: amountsPublic ? totalMicro : null,
      winks: wallWinks.length,
    },
    recent,
    leaderboard,
  });
}

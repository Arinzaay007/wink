import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames, users, transfers } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Public resolution — Privacy L2 by design:
 * returns profile + privacy-aware recent winks, NEVER the wallet address.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const { handle: raw } = await ctx.params;
  const handle = normalizeHandle(raw);

  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });
  if (!name) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const user = await db.query.users.findFirst({ where: eq(users.id, name.userId) });
  if (!user) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const amountsPublic = user.privacyAmountsPublic;
  const feedPublic = user.privacyFeedPublic;

  const recent = feedPublic
    ? await db.query.transfers.findMany({
        where: eq(transfers.toUserId, user.id),
        orderBy: desc(transfers.createdAt),
        limit: 8,
      })
    : [];

  return NextResponse.json({
    handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    privacy: { amountsPublic, feedPublic },
    recent: recent
      .filter((t) => t.status === "confirmed")
      .map((t) => ({
        id: t.id,
        amountMicro: amountsPublic ? t.amountMicro : null,
        message: t.message,
        anonymous: t.tipperVisibility === "anonymous",
        createdAt: t.createdAt,
      })),
  });
}

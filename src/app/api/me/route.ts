import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, usernames, wallets, transfers } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const handles = await db.query.usernames.findMany({
    where: eq(usernames.userId, userId),
  });
  const myWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
  });
  const incoming = await db.query.transfers.findMany({
    where: eq(transfers.toUserId, userId),
    orderBy: desc(transfers.createdAt),
    limit: 25,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      privacy: {
        amountsPublic: user.privacyAmountsPublic,
        feedPublic: user.privacyFeedPublic,
      },
    },
    handles: handles.map((h) => h.handle),
    wallets: myWallets.map((w) => ({
      address: w.address,
      kind: w.kind,
      label: w.label,
    })),
    incoming,
  });
}

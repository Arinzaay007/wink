import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  amountsPublic: z.boolean().optional(),
  feedPublic: z.boolean().optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const patch: Record<string, boolean> = {};
  if (parsed.data.amountsPublic !== undefined)
    patch.privacyAmountsPublic = parsed.data.amountsPublic;
  if (parsed.data.feedPublic !== undefined)
    patch.privacyFeedPublic = parsed.data.feedPublic;

  if (Object.keys(patch).length) {
    await db.update(users).set(patch).where(eq(users.id, userId));
  }
  return NextResponse.json({ ok: true, ...patch });
}

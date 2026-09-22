import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { normalizeHandle, validateHandleFormat } from "@/lib/handles";

export const runtime = "nodejs";

const Body = z.object({ handle: z.string().min(1).max(30) });

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const handle = normalizeHandle(parsed.data.handle);
  const check = validateHandleFormat(handle);
  if (!check.ok)
    return NextResponse.json({ error: `handle-${check.reason}` }, { status: 400 });

  const taken = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });
  if (taken) return NextResponse.json({ error: "handle-taken" }, { status: 409 });

  // first-come-first-served; insert relies on the unique index as the
  // final arbiter against races
  try {
    const [row] = await db
      .insert(usernames)
      .values({ userId, handle })
      .returning();
    return NextResponse.json({ handle: row.handle, url: `/@${row.handle}` });
  } catch {
    return NextResponse.json({ error: "handle-taken" }, { status: 409 });
  }
}

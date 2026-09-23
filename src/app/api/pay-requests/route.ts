import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { payRequests, usernames, users } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { normalizeHandle } from "@/lib/handles";

export const runtime = "nodejs";

const Create = z.object({
  handle: z.string().min(1).max(30), // who we're asking to pay
  amountMicro: z.number().int().min(100_000).max(1_000_000_000_000),
  note: z.string().max(140).nullish(),
});

export async function GET() {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [incoming, sent] = await Promise.all([
    db
      .select()
      .from(payRequests)
      .where(eq(payRequests.toUserId, userId))
      .orderBy(desc(payRequests.createdAt))
      .limit(25),
    db
      .select()
      .from(payRequests)
      .where(eq(payRequests.fromUserId, userId))
      .orderBy(desc(payRequests.createdAt))
      .limit(25),
  ]);

  // resolve display handles for the counterparties
  const ids = [
    ...new Set([...incoming.map((r) => r.fromUserId), ...sent.map((r) => r.toUserId)]),
  ];
  const names = ids.length
    ? await db.select().from(usernames).where(inArray(usernames.userId, ids))
    : [];
  const people = ids.length
    ? await db.select().from(users).where(inArray(users.id, ids))
    : [];
  const handleByUser = new Map<string, string>();
  for (const n of names) if (!handleByUser.has(n.userId)) handleByUser.set(n.userId, n.handle);
  const nameByUser = new Map(people.map((p) => [p.id, p.displayName]));

  const decorate = (rows: typeof incoming, counterpartyKey: "fromUserId" | "toUserId") =>
    rows.map((r) => ({
      ...r,
      counterpartyHandle: handleByUser.get(r[counterpartyKey]) ?? null,
      counterpartyName: nameByUser.get(r[counterpartyKey]) ?? null,
    }));

  return NextResponse.json({
    incoming: decorate(incoming, "fromUserId"),
    sent: decorate(sent, "toUserId"),
  });
}

export async function POST(req: Request) {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const handle = normalizeHandle(parsed.data.handle);
  const payerName = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });
  if (!payerName)
    return NextResponse.json({ error: "handle-not-found" }, { status: 404 });
  if (payerName.userId === userId)
    return NextResponse.json({ error: "you-cant-request-yourself" }, { status: 400 });

  const [request] = await db
    .insert(payRequests)
    .values({
      fromUserId: userId,
      toUserId: payerName.userId,
      amountMicro: parsed.data.amountMicro,
      note: parsed.data.note?.trim() || null,
      status: "open",
    })
    .returning();

  return NextResponse.json({ payRequest: request }, { status: 201 });
}

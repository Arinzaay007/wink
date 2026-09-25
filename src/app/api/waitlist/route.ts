import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { waitlist } from "@/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(120),
  handle: z.string().max(30).optional(),
  chain: z.string().max(20).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-email" }, { status: 400 });

  const { email, handle, chain, source } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedHandle = handle?.toLowerCase().replace(/^@/, "").trim() || null;

  try {
    const existing = await db.query.waitlist.findFirst({ where: eq(waitlist.email, normalizedEmail) });
    if (existing) {
      return NextResponse.json({ ok: true, already: true, id: existing.id });
    }

    const [row] = await db.insert(waitlist).values({
      email: normalizedEmail,
      handle: normalizedHandle,
      chain: chain || "base",
      source: source || "landing",
    }).returning();

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    // unique violation
    return NextResponse.json({ ok: true, already: true });
  }
}

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  const count = await db.query.waitlist.findMany();
  return NextResponse.json({ count: count.length });
}

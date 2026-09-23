import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(3).max(60),
  emoji: z.string().max(8).optional(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const slug = `${slugify(parsed.data.title) || "event"}-${nanoid(6).toLowerCase()}`;
  const [event] = await db
    .insert(events)
    .values({
      ownerId: userId,
      slug,
      title: parsed.data.title.trim(),
      emoji: parsed.data.emoji ?? "🎉",
    })
    .returning();

  return NextResponse.json({
    slug: event.slug,
    url: `/wall/${event.slug}`,
  });
}

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const mine = await db.query.events.findMany({
    where: eq(events.ownerId, userId),
  });
  return NextResponse.json({
    events: mine.map((e) => ({
      slug: e.slug,
      title: e.title,
      emoji: e.emoji,
      live: e.live,
    })),
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * HACKATHON AUTH: email-only, no password — zero friction for the demo.
 * Post-hackathon: email OTP / passkeys behind the same session contract.
 */
const Body = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(40).optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  const user =
    existing ??
    (
      await db
        .insert(users)
        .values({ email, displayName: parsed.data.displayName ?? email.split("@")[0] })
        .returning()
    )[0];

  if (parsed.data.displayName && !user.displayName) {
    await db
      .update(users)
      .set({ displayName: parsed.data.displayName })
      .where(eq(users.id, user.id));
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ userId: user.id, email: user.email });
}

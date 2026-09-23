import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authCodes, users } from "@/db/schema";
import { evaluateOtp, isValidCodeFormat, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Auth step 2 — verify the emailed code, then (and only then) issue the
 * session cookie. Same session contract as before; nothing downstream
 * changes.
 */
const Body = z.object({
  email: z.string().email(),
  code: z.string(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db)
    return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  if (!isValidCodeFormat(parsed.data.code))
    return NextResponse.json({ error: "invalid-code" }, { status: 400 });

  const row = await db.query.authCodes.findFirst({
    where: eq(authCodes.email, email),
    orderBy: desc(authCodes.createdAt),
  });
  if (!row)
    return NextResponse.json({ error: "code-not-found" }, { status: 400 });

  const verdict = evaluateOtp(row, parsed.data.code);
  if (!verdict.ok) {
    if (verdict.reason === "wrong-code") {
      // burn an attempt even on mismatch (cap enforced by evaluateOtp)
      await db
        .update(authCodes)
        .set({ attempts: Math.min(row.attempts + 1, OTP_MAX_ATTEMPTS) })
        .where(eq(authCodes.id, row.id));
    }
    return NextResponse.json({ error: verdict.reason }, { status: 400 });
  }

  // single-use: consume immediately, before issuing anything
  await db
    .update(authCodes)
    .set({ consumedAt: new Date() })
    .where(eq(authCodes.id, row.id));

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user)
    return NextResponse.json({ error: "user-not-found" }, { status: 400 });

  await setSessionCookie(user.id);
  return NextResponse.json({ userId: user.id, email: user.email });
}

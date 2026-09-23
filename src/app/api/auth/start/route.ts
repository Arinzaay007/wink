import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authCodes, users } from "@/db/schema";
import {
  generateCode,
  hashCode,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mailer";

export const runtime = "nodejs";

/**
 * Auth step 1 — find-or-create the user, send a one-time code.
 * NO session is issued here; /api/auth/verify does that after the code
 * round-trips through the user's inbox.
 */
const Body = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(40).optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db)
    return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  const user =
    existing ??
    (
      await db
        .insert(users)
        .values({
          email,
          displayName: parsed.data.displayName ?? email.split("@")[0],
        })
        .returning()
    )[0];

  if (parsed.data.displayName && !user.displayName) {
    await db
      .update(users)
      .set({ displayName: parsed.data.displayName })
      .where(eq(users.id, user.id));
  }

  // resend cooldown — don't let anyone spam an inbox (or our provider bill)
  const last = await db.query.authCodes.findFirst({
    where: eq(authCodes.email, email),
    orderBy: desc(authCodes.createdAt),
  });
  if (
    last &&
    Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return NextResponse.json(
      { error: "rate-limited", retryInMs: OTP_RESEND_COOLDOWN_MS },
      { status: 429 }
    );
  }

  const code = generateCode();
  await db.insert(authCodes).values({
    email,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const mail = await sendOtpEmail(email, code);
  if (mail.mode === "unconfigured") {
    return NextResponse.json({ error: "mailer-not-configured" }, { status: 503 });
  }

  return NextResponse.json({
    sent: true,
    expiresMs: OTP_TTL_MS,
    // dev-only convenience: surfaces the code in the UI when no mail
    // provider is configured. Never present in production builds.
    devCode: mail.mode === "dev" ? mail.devCode : undefined,
  });
}

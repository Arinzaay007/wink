import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { waitlist } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(120),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-email" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const existing = await db.query.waitlist.findFirst({ where: eq(waitlist.email, email) });
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }

    await db.insert(waitlist).values({ email, source: "waitlist.winkpay.xyz" });

    const key = process.env.RESEND_API_KEY;
    const from = process.env.WINK_MAIL_FROM || "Wink <noreply@winkpay.xyz>";
    if (key) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: email,
          subject: "You're on the Wink waitlist 😉",
          html: `<p style="font-family:Georgia,serif;font-size:16px">You're in.</p><p style="color:#777;font-size:13px">Wink is the name layer for payments — pay a @username, any chain in, Tempo out. We'll email you when your invite is ready.</p><p style="color:#777;font-size:12px">— Wink Team<br/>https://www.winkpay.xyz</p>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true, already: true });
  }
}

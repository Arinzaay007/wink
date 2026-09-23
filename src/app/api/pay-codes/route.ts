import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payCodes } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

const Create = z.object({
  kind: z.enum(["tip", "invoice"]).default("tip"),
  amountDollars: z.number().positive().max(1_000_000).optional(), // invoices are fixed-amount
  memo: z.string().max(31).nullish(), // invoice number → reconciliation
  note: z.string().max(140).nullish(), // shown to the payer, e.g. "Haircut + beard"
});

function codeSlug(): string {
  return `pc_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET() {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(payCodes)
    .where(eq(payCodes.ownerId, userId))
    .orderBy(desc(payCodes.createdAt));
  return NextResponse.json({ payCodes: rows });
}

export async function POST(req: Request) {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { kind, amountDollars, memo, note } = parsed.data;

  if (kind === "invoice" && !amountDollars)
    return NextResponse.json(
      { error: "invoice-codes-need-an-amount" },
      { status: 400 },
    );

  const [code] = await db
    .insert(payCodes)
    .values({
      ownerId: userId,
      slug: codeSlug(),
      kind,
      amountMicro:
        amountDollars != null ? Math.round(amountDollars * 1_000_000) : null,
      memo: memo?.trim() || null,
      note: note?.trim() || null,
    })
    .returning();

  return NextResponse.json({ payCode: code }, { status: 201 });
}

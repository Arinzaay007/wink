import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { wallets } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { isAddress, getAddress } from "viem";

export const runtime = "nodejs";

const Body = z.object({
  address: z.string().refine((v) => isAddress(v), "bad-address"),
  kind: z.enum(["inapp", "connected", "external"]).default("inapp"),
  label: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const address = getAddress(parsed.data.address);

  const existing = await db.query.wallets.findFirst({ where: eq(wallets.address, address) });
  if (existing) {
    if (existing.userId !== userId)
      return NextResponse.json({ error: "address-already-linked" }, { status: 409 });
    return NextResponse.json({ wallet: { address, kind: existing.kind } });
  }

  const [row] = await db
    .insert(wallets)
    .values({
      userId,
      address,
      kind: parsed.data.kind,
      label: parsed.data.label ?? null,
    })
    .returning();

  return NextResponse.json({ wallet: { address: row.address, kind: row.kind } });
}

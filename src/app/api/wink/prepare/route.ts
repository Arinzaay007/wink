import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  usernames,
  users,
  wallets,
  transfers,
  events,
  payCodes,
  payRequests,
} from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { normalizeHandle } from "@/lib/handles";
import { PATH_USD, TOKEN_SYMBOL, encodeMemo, winkMemo } from "@/lib/tempo";
import { isAddress } from "viem";

export const runtime = "nodejs";

const Body = z.object({
  handle: z.string().min(1).max(30),
  amountMicro: z.number().int().min(100_000).max(1_000_000_000_000), // $0.10 – $1M
  message: z.string().max(140).nullish(),
  anonymous: z.boolean().optional(),
  fromAddress: z.string().refine((v) => isAddress(v), "bad-address"),
  eventSlug: z.string().max(60).optional(), // spray-wall attribution
  payCodeSlug: z.string().max(80).optional(), // merchant pay-code attribution
  payRequestId: z.string().max(40).optional(), // payout: settling a pay request
});

/**
 * Creates the pending transfer record and returns the exact on-chain
 * parameters the tipper's wallet must sign. The recipient address is
 * disclosed only here, inside an active wink — never on the public
 * resolve endpoint (Privacy L2).
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    handle: raw,
    amountMicro,
    message,
    anonymous,
    fromAddress,
    eventSlug,
    payCodeSlug,
    payRequestId,
  } = parsed.data;
  const handle = normalizeHandle(raw);

  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });
  if (!name) return NextResponse.json({ error: "handle-not-found" }, { status: 404 });

  const recipient = await db.query.users.findFirst({ where: eq(users.id, name.userId) });
  if (!recipient) return NextResponse.json({ error: "handle-not-found" }, { status: 404 });

  const wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, recipient.id) });
  if (!wallet)
    return NextResponse.json({ error: "recipient-has-no-wallet" }, { status: 409 });

  // spray-wall attribution: the event must belong to the wink's recipient
  let eventId: string | null = null;
  if (eventSlug) {
    const event = await db.query.events.findFirst({ where: eq(events.slug, eventSlug) });
    if (!event || event.ownerId !== recipient.id)
      return NextResponse.json({ error: "event-not-found" }, { status: 404 });
    eventId = event.id;
  }

  // pay-code attribution: the code must belong to the wink's recipient.
  // Fixed-amount codes enforce their amount; open codes accept anything.
  let payCodeId: string | null = null;
  let kind: "wink" | "sale" | "wage" = "wink";
  if (payCodeSlug) {
    const code = await db.query.payCodes.findFirst({
      where: eq(payCodes.slug, payCodeSlug),
    });
    if (!code || code.ownerId !== recipient.id)
      return NextResponse.json({ error: "pay-code-not-found" }, { status: 404 });
    if (code.amountMicro !== null && code.amountMicro !== amountMicro)
      return NextResponse.json(
        { error: "amount-does-not-match-pay-code" },
        { status: 400 },
      );
    payCodeId = code.id;
    kind = "sale";
  }

  const fromUserId = await getSessionUserId(); // guests wink too (null = guest)

  // pay-request settlement: funds go to the REQUESTER (this wink's
  // recipient); the signed-in user must be the PAYER named on the
  // request, and the amount must match exactly.
  if (payRequestId) {
    const request = await db.query.payRequests.findFirst({
      where: eq(payRequests.id, payRequestId),
    });
    if (!request || request.status !== "open")
      return NextResponse.json({ error: "pay-request-not-found" }, { status: 404 });
    if (request.fromUserId !== recipient.id)
      return NextResponse.json({ error: "pay-request-recipient-mismatch" }, { status: 400 });
    if (!fromUserId || request.toUserId !== fromUserId)
      return NextResponse.json({ error: "only-the-payer-can-settle" }, { status: 403 });
    if (request.amountMicro !== amountMicro)
      return NextResponse.json({ error: "amount-does-not-match-pay-request" }, { status: 400 });
    kind = "wage";
  }

  const [transfer] = await db
    .insert(transfers)
    .values({
      kind,
      eventId,
      payCodeId,
      payRequestId: payRequestId ?? null,
      fromUserId,
      fromAddress,
      toUserId: recipient.id,
      toAddress: wallet.address,
      amountMicro,
      currency: TOKEN_SYMBOL,
      memo: "", // filled with winkMemo(id) once we know the id
      message: message?.trim() || null,
      tipperVisibility: anonymous ? "anonymous" : "named",
      status: "pending",
    })
    .returning();

  const memo = winkMemo(transfer.id);
  await db.update(transfers).set({ memo }).where(eq(transfers.id, transfer.id));

  return NextResponse.json({
    transferId: transfer.id,
    to: wallet.address,
    token: PATH_USD,
    amountMicro,
    memo,
    memoHex: encodeMemo(memo),
  });
}

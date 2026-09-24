import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames, users, wallets } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import { isAddress } from "viem";
import {
  relayQuote,
  sourceChain,
  BRIDGE_MIN_MICRO,
  BRIDGE_MAX_MICRO,
} from "@/lib/relay";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  handle: z.string().min(1).max(30),
  sender: z.string().refine((v) => isAddress(v), "bad-sender"),
  sourceChainId: z.number().int(),
  amountMicro: z.number().int(),
});

/**
 * Cross-chain pay: quote the route from the sender's chain to @handle's
 * Tempo address. Doctrine guardrails enforced here, not in the UI.
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { handle: raw, sender, sourceChainId, amountMicro } = parsed.data;

  // doctrine guardrails
  if (amountMicro < BRIDGE_MIN_MICRO)
    return NextResponse.json(
      { error: `cross-chain minimum is $${BRIDGE_MIN_MICRO / 1_000_000} — for smaller amounts, pay on Tempo directly` },
      { status: 400 },
    );
  if (amountMicro > BRIDGE_MAX_MICRO)
    return NextResponse.json(
      { error: `per-transfer cap is $${BRIDGE_MAX_MICRO / 1_000_000} during launch` },
      { status: 400 },
    );

  const chain = sourceChain(sourceChainId);
  if (!chain)
    return NextResponse.json({ error: "unsupported-chain" }, { status: 400 });

  // resolve @handle → recipient's Tempo address
  const handle = normalizeHandle(raw);
  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });
  if (!name) return NextResponse.json({ error: "handle-not-found" }, { status: 404 });
  const recipient = await db.query.users.findFirst({ where: eq(users.id, name.userId) });
  const wallet = recipient
    ? await db.query.wallets.findFirst({ where: eq(wallets.userId, recipient.id) })
    : null;
  if (!wallet)
    return NextResponse.json({ error: "recipient-has-no-wallet" }, { status: 409 });

  try {
    const quote = await relayQuote({
      sender,
      sourceChainId: chain.id,
      sourceToken: chain.usdc,
      amountMicro,
      receiver: wallet.address,
    });

    const requestId = quote.steps?.find((s) => s.requestId)?.requestId ?? null;

    // Watcher: the recipient sees this transfer tracked into their
    // dashboard from the moment the quote exists — even if the payer
    // closes their tab. Non-fatal: a watch failure never breaks a quote.
    try {
      const { registerWatch } = await import("@/lib/bridgeWatcher");
      await registerWatch(db, recipient!.id, {
        requestId,
        handle,
        receiver: wallet.address,
        sourceChain: chain.name,
        amountMicro,
      });
    } catch {
      /* watch is a nice-to-have, the pay flow is not */
    }

    return NextResponse.json({
      chainId: chain.id,
      chainName: chain.name,
      receiver: wallet.address,
      amountMicro,
      requestId,
      steps: quote.steps,
      fees: quote.fees ?? null,
      details: quote.details ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "route unavailable";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

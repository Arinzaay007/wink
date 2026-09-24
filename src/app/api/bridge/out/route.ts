import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "viem";
import { relayQuoteOut, sourceChain, BRIDGE_MIN_MICRO, BRIDGE_MAX_MICRO } from "@/lib/relay";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  sender: z.string().refine((v) => isAddress(v), "bad-sender"),
  destinationChainId: z.number().int(),
  amountMicro: z.number().int(),
  receiver: z.string().refine((v) => isAddress(v), "bad-receiver").optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sender, destinationChainId, amountMicro, receiver } = parsed.data;

  if (amountMicro < BRIDGE_MIN_MICRO)
    return NextResponse.json({ error: `minimum $${BRIDGE_MIN_MICRO / 1_000_000}` }, { status: 400 });
  if (amountMicro > BRIDGE_MAX_MICRO)
    return NextResponse.json({ error: `cap $${BRIDGE_MAX_MICRO / 1_000_000}` }, { status: 400 });

  const chain = sourceChain(destinationChainId);
  if (!chain) return NextResponse.json({ error: "unsupported-chain" }, { status: 400 });

  try {
    const quote = await relayQuoteOut({
      sender,
      destinationChainId: chain.id,
      destinationToken: chain.usdc,
      amountMicro,
      receiver: receiver || sender,
    });

    const requestId = quote.steps?.find((s) => s.requestId)?.requestId ?? null;

    return NextResponse.json({
      chainId: chain.id,
      chainName: chain.name,
      receiver: receiver || sender,
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

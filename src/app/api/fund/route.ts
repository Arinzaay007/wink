import { NextResponse } from "next/server";
import { z } from "zod";
import { fundFromFaucet, TEMPO_NETWORK } from "@/lib/tempo";
import { isAddress } from "viem";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  address: z.string().refine((v) => isAddress(v), "bad-address"),
});

/** Testnet faucet: 1M of each test stablecoin to the given address. */
export async function POST(req: Request) {
  if (TEMPO_NETWORK === "mainnet")
    return NextResponse.json({ error: "testnet-only" }, { status: 400 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  try {
    await fundFromFaucet(parsed.data.address as `0x${string}`);
    return NextResponse.json({ funded: true });
  } catch (e) {
    return NextResponse.json(
      { error: "faucet-failed", detail: String(e) },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { wallets } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { getStableBalance, publicClient } from "@/lib/tempo";
import { getAllBalances } from "@/lib/baseForwarder";
import type { Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const url = new URL(req.url);
  const queryAddr = url.searchParams.get("address") as Address | null;

  let addresses: Address[] = [];

  if (queryAddr) {
    addresses = [queryAddr];
  } else {
    const userId = await getSessionUserId();
    if (!userId) {
      // guest — return empty, client will load demo wallet locally
      return NextResponse.json({ wallets: [], guest: true });
    }
    const rows = await db.query.wallets.findMany({ where: eq(wallets.userId, userId) });
    addresses = rows.map((r) => r.address as Address);
    if (addresses.length === 0) {
      return NextResponse.json({ wallets: [], guest: false, message: "no wallets linked" });
    }
  }

  const results = await Promise.all(
    addresses.map(async (addr) => {
      try {
        const [tempoRaw, others] = await Promise.all([
          getStableBalance(addr).catch(() => 0n),
          getAllBalances(addr).catch(() => []),
        ]);

        const tempoMicro = Number(tempoRaw);
        const stranded = others
          .filter((o) => o.usdcRaw > 0n)
          .map((o) => ({
            chain: o.chainName,
            chainId: o.chainId,
            usdcMicro: Number(o.usdcRaw),
            usdc: (Number(o.usdcRaw) / 1_000_000).toFixed(2),
            eth: o.eth.toFixed(4),
            willForward: o.usdcRaw >= 1_000_000n, // $1 min
          }));

        const totalStrandedMicro = stranded.reduce((s, v) => s + v.usdcMicro, 0);

        return {
          address: addr,
          tempo: {
            micro: tempoMicro,
            formatted: (tempoMicro / 1_000_000).toFixed(2),
          },
          stranded,
          totalStrandedMicro,
          totalMicro: tempoMicro + totalStrandedMicro,
        };
      } catch (e) {
        return {
          address: addr,
          tempo: { micro: 0, formatted: "0.00" },
          stranded: [],
          totalStrandedMicro: 0,
          totalMicro: 0,
          error: (e as Error).message,
        };
      }
    })
  );

  const grandTempo = results.reduce((s, r) => s + r.tempo.micro, 0);
  const grandStranded = results.reduce((s, r) => s + r.totalStrandedMicro, 0);

  return NextResponse.json({
    wallets: results,
    totals: {
      tempoMicro: grandTempo,
      strandedMicro: grandStranded,
      combinedMicro: grandTempo + grandStranded,
      tempoFormatted: (grandTempo / 1_000_000).toFixed(2),
      strandedFormatted: (grandStranded / 1_000_000).toFixed(2),
      combinedFormatted: ((grandTempo + grandStranded) / 1_000_000).toFixed(2),
    },
  });
}

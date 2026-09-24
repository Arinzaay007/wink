import { NextResponse } from "next/server";
import type { Chain } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { Actions, Zone } from "viem/tempo";
import { zonesAvailable } from "@/lib/zones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tempo Zones health probe — powers the honest "private settlement"
 * status chip. Zone RPCs currently require an authorization token for
 * EVERY method, so we sign one with an ephemeral in-memory key and
 * classify the response:
 *
 *   200 + JSON  → live         (zone answering authenticated calls)
 *   401         → rpc-up       (reachable, token rejected/missing)
 *   403         → rpc-up       (reachable; token valid, account unknown —
 *                               the current Moderato behaviour, see
 *                               tempoxyz/zones#1482)
 *   no response → unreachable
 *
 * Cached 60s so screens don't hammer the zone sequencer.
 */
type ZoneStatus = {
  httpStatus: number | null;
  reachability: "live" | "rpc-up" | "unreachable";
};

let cache: { at: number; result: Record<string, ZoneStatus> } | null = null;
let probeKey: `0x${string}` | null = null;

async function probeZone(chainDef: Chain): Promise<ZoneStatus> {
  try {
    if (!probeKey) probeKey = generatePrivateKey();
    const account = privateKeyToAccount(probeKey);
    const client = createWalletClient({
      account,
      chain: chainDef,
      transport: http(),
    });
    const { token } = await Actions.zone.signAuthorizationToken(client, {});
    const res = await fetch(chainDef.rpcUrls.default.http[0], {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Authorization-Token": token,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (res.ok && text.trim().startsWith("{")) {
      return { httpStatus: res.status, reachability: "live" };
    }
    return { httpStatus: res.status, reachability: "rpc-up" };
  } catch {
    return { httpStatus: null, reachability: "unreachable" };
  }
}

export async function GET() {
  const available = zonesAvailable();
  if (!available) {
    return NextResponse.json({
      available: false,
      reason: "zones are testnet-only",
      deposits: "unavailable",
    });
  }

  if (!cache || Date.now() - cache.at > 60_000) {
    const [a, b] = await Promise.all([probeZone(Zone.a), probeZone(Zone.b)]);
    cache = { at: Date.now(), result: { a, b } };
  }

  const anyLive = Object.values(cache.result).some(
    (z) => z.reachability === "live"
  );
  return NextResponse.json({
    available: true,
    zones: cache.result,
    // Deposits revert on Moderato for all accounts today (upstream issue
    // tempoxyz/zones#1482). We rehearse continuously and flip this when a
    // deposit lands.
    deposits: anyLive ? "rehearsing" : "blocked-upstream",
    checkedAt: new Date(cache.at).toISOString(),
  });
}

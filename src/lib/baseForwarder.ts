/**
 * Base auto-forwarder — core primitive:
 * "user sends USDC to my wallet on Base, it arrives as pathUSD on Tempo for me"
 *
 * Watches Base USDC balance for a configured address. When funds arrive
 * (normal Transfer, not via Relay), it automatically bridges them to Tempo
 * pathUSD via Relay (approve + deposit), then tracks via bridge watcher.
 *
 * Requires the Base wallet private key (BURNER_PRIVATE_KEY or FORWARDER_KEY)
 * in env — never committed, gitignored via .env.local
 */
import { createPublicClient, createWalletClient, http, erc20Abi, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, tempo } from "viem/chains";
import { relayQuote, TEMPO_PATH_USD } from "./relay";
import { registerWatch } from "./bridgeWatcher";
import type { WinkDb } from "@/db";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const RELAY_ROUTER = "0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f" as const;

const basePublic = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const tempoPublic = createPublicClient({ chain: tempo, transport: http("https://rpc.tempo.xyz") });

export interface ForwardResult {
  requestId: string;
  baseTxHashes: Hash[];
  amountIn: number;
  expectedOut: number;
}

export async function getBaseBalances(address: Address) {
  const [usdc, eth] = await Promise.all([
    basePublic.readContract({ address: USDC_BASE, abi: erc20Abi, functionName: "balanceOf", args: [address] }).catch(() => 0n),
    basePublic.getBalance({ address }).catch(() => 0n),
  ]);
  return { usdc: Number(usdc), eth: Number(eth) / 1e18, usdcRaw: usdc as bigint, ethRaw: eth as bigint };
}

/**
 * Auto-forward all USDC from Base wallet to Tempo pathUSD.
 * Returns null if balance below min or no key.
 */
export async function autoForwardOnce(params: {
  db?: WinkDb;
  privateKey: `0x${string}`;
  tempoReceiver: Address; // where pathUSD should land on Tempo (usually same as Base addr or @handle wallet)
  minMicro?: number; // default $1
}): Promise<ForwardResult | null> {
  const account = privateKeyToAccount(params.privateKey);
  const baseAddress = account.address;
  const minMicro = params.minMicro ?? 1_000_000;

  const { usdcRaw, ethRaw } = await getBaseBalances(baseAddress).then(b => ({ usdcRaw: b.usdcRaw, ethRaw: b.ethRaw }));
  if (usdcRaw < BigInt(minMicro)) return null;
  if (ethRaw < 100000000000000n) { // 0.0001 ETH min for gas
    throw new Error(`Base ETH too low for gas: ${Number(ethRaw)/1e18}`);
  }

  // Quote Base USDC -> Tempo pathUSD
  const quote = await relayQuote({
    sender: baseAddress,
    sourceChainId: 8453,
    sourceToken: USDC_BASE,
    amountMicro: Number(usdcRaw),
    receiver: params.tempoReceiver,
  });

  const requestId = quote.steps.find(s => s.requestId)?.requestId ?? null;
  if (!requestId) throw new Error("Relay quote missing requestId");

  const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

  const baseTxHashes: Hash[] = [];
  // Execute each step (approve + deposit)
  for (const step of quote.steps) {
    for (const item of step.items) {
      const data = item.data as { to: Address; data: `0x${string}`; value: string; gas?: string } | undefined;
      if (!data) continue;
      const hash = await walletClient.sendTransaction({
        to: data.to,
        data: data.data,
        value: data.value ? BigInt(data.value) : 0n,
      });
      baseTxHashes.push(hash);
      // Wait for each tx to be mined before next (safer for nonce)
      await basePublic.waitForTransactionReceipt({ hash });
    }
  }

  // Register bridge watch so dashboard tracks it
  if (params.db) {
    try {
      await registerWatch(params.db, "usr_arinzaay", {
        requestId,
        handle: "arinzaay",
        receiver: params.tempoReceiver,
        sourceChain: "Base",
        amountMicro: Number(usdcRaw),
      });
    } catch {
      /* watch is nice-to-have */
    }
  }

  const expectedOut = Number(quote.details?.currencyOut?.amount ?? quote.details?.currencyOut) || 0;

  return {
    requestId,
    baseTxHashes,
    amountIn: Number(usdcRaw),
    expectedOut,
  };
}

/** Check if a Base address received USDC in recent blocks (for event-driven forwarding) */
export async function checkRecentBaseDeposits(address: Address, fromBlock: bigint, toBlock: bigint) {
  const logs = await basePublic.getLogs({
    address: USDC_BASE,
    event: { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256" }] },
    args: { to: address },
    fromBlock,
    toBlock,
  });
  return logs.map(l => ({
    blockNumber: l.blockNumber,
    transactionHash: l.transactionHash,
    from: (l.args as any).from as Address,
    value: (l.args as any).value as bigint,
  }));
}

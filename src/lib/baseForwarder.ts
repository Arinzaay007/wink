/**
 * Multi-chain auto-forwarder — core primitive:
 * "user sends USDC to my wallet on Base/Eth/Arb/Op/Poly, it arrives as pathUSD on Tempo for me"
 *
 * Watches ALL supported source chains for USDC balance. When funds arrive
 * (normal Transfer, not via Relay), it automatically bridges them to Tempo
 * pathUSD via Relay (approve + deposit), then tracks via bridge watcher.
 *
 * Requires the wallet private key (BURNER_PRIVATE_KEY or FORWARDER_KEY)
 * in env — never committed, gitignored via .env.local
 */
import { createPublicClient, createWalletClient, http, erc20Abi, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, arbitrum, optimism, polygon, tempo } from "viem/chains";
import { relayQuote, SOURCE_CHAINS, type SourceChainId } from "./relay";
import { registerWatch } from "./bridgeWatcher";
import type { WinkDb } from "@/db";

const CHAIN_CLIENTS: Record<number, any> = {
  8453: createPublicClient({ chain: base, transport: http("https://mainnet.base.org") }),
  1: createPublicClient({ chain: mainnet, transport: http("https://eth.llamarpc.com") }),
  42161: createPublicClient({ chain: arbitrum, transport: http("https://arb1.arbitrum.io/rpc") }),
  10: createPublicClient({ chain: optimism, transport: http("https://mainnet.optimism.io") }),
  137: createPublicClient({ chain: polygon, transport: http("https://polygon-rpc.com") }),
};

const CHAIN_WALLETS: Record<number, any> = {
  8453: base,
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  137: polygon,
};

const tempoPublic = createPublicClient({ chain: tempo, transport: http("https://rpc.tempo.xyz") });

export interface ForwardResult {
  requestId: string;
  sourceChain: string;
  sourceChainId: SourceChainId;
  baseTxHashes: Hash[];
  amountIn: number;
  expectedOut: number;
}

export async function getBaseBalances(address: Address) {
  return getBalancesForChain(address, 8453);
}

export async function getBalancesForChain(address: Address, chainId: SourceChainId) {
  const client = CHAIN_CLIENTS[chainId];
  const usdc = SOURCE_CHAINS.find(c => c.id === chainId)?.usdc as Address;
  if (!client || !usdc) throw new Error(`Unsupported chain ${chainId}`);
  const [usdcBal, eth] = await Promise.all([
    client.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [address] }).catch(() => 0n),
    client.getBalance({ address }).catch(() => 0n),
  ]);
  return { usdc: Number(usdcBal), eth: Number(eth) / 1e18, usdcRaw: usdcBal as bigint, ethRaw: eth as bigint, chainId, usdcAddress: usdc };
}

export async function getAllBalances(address: Address) {
  const results = await Promise.all(
    SOURCE_CHAINS.map(async c => {
      try {
        const b = await getBalancesForChain(address, c.id as SourceChainId);
        return { ...b, chainName: c.name };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Auto-forward all USDC from a source chain wallet to Tempo pathUSD.
 * If sourceChainId not specified, picks the first chain with balance > min.
 * Returns null if balance below min or no key.
 */
export async function autoForwardOnce(params: {
  db?: WinkDb;
  privateKey: `0x${string}`;
  tempoReceiver: Address; // where pathUSD should land on Tempo
  sourceChainId?: SourceChainId;
  minMicro?: number; // default $1
}): Promise<ForwardResult | null> {
  const account = privateKeyToAccount(params.privateKey);
  const minMicro = params.minMicro ?? 1_000_000;

  let chainId = params.sourceChainId;
  let usdcRaw: bigint;
  let ethRaw: bigint;
  let chainName: string;
  let usdcAddress: Address;

  if (chainId) {
    const bal = await getBalancesForChain(account.address, chainId);
    usdcRaw = bal.usdcRaw;
    ethRaw = bal.ethRaw;
    usdcAddress = bal.usdcAddress;
    chainName = SOURCE_CHAINS.find(c => c.id === chainId)!.name;
  } else {
    // auto-detect first chain with funds
    const all = await getAllBalances(account.address);
    const hit = all.find(b => b.usdcRaw >= BigInt(minMicro));
    if (!hit) return null;
    chainId = hit.chainId as SourceChainId;
    usdcRaw = hit.usdcRaw;
    ethRaw = hit.ethRaw;
    usdcAddress = hit.usdcAddress;
    chainName = hit.chainName;
  }

  if (usdcRaw < BigInt(minMicro)) return null;
  if (ethRaw < 100000000000000n) {
    throw new Error(`${chainName} ETH too low for gas: ${Number(ethRaw)/1e18}`);
  }

  // Quote source USDC -> Tempo pathUSD
  const quote = await relayQuote({
    sender: account.address,
    sourceChainId: chainId!,
    sourceToken: usdcAddress!,
    amountMicro: Number(usdcRaw),
    receiver: params.tempoReceiver,
  });

  const requestId = quote.steps.find(s => s.requestId)?.requestId ?? null;
  if (!requestId) throw new Error("Relay quote missing requestId");

  const walletClient = createWalletClient({
    account,
    chain: CHAIN_WALLETS[chainId!],
    transport: http(),
  });

  const baseTxHashes: Hash[] = [];
  for (const step of quote.steps) {
    for (const item of step.items) {
      const data = item.data as { to: Address; data: `0x${string}`; value: string } | undefined;
      if (!data) continue;
      const hash = await (walletClient as any).sendTransaction({
        to: data.to,
        data: data.data,
        value: data.value ? BigInt(data.value) : 0n,
      });
      baseTxHashes.push(hash);
      await CHAIN_CLIENTS[chainId!].waitForTransactionReceipt({ hash });
    }
  }

  if (params.db) {
    try {
      await registerWatch(params.db, "usr_arinzaay", {
        requestId,
        handle: "arinzaay",
        receiver: params.tempoReceiver,
        sourceChain: chainName!,
        amountMicro: Number(usdcRaw),
      });
    } catch {}
  }

  const expectedOut = Number((quote as any).details?.currencyOut?.amount ?? 0);

  return {
    requestId,
    sourceChain: chainName!,
    sourceChainId: chainId!,
    baseTxHashes,
    amountIn: Number(usdcRaw),
    expectedOut,
  };
}

/** Check if an address received USDC on a specific chain in recent blocks */
export async function checkRecentBaseDeposits(address: Address, fromBlock: bigint, toBlock: bigint) {
  return checkRecentDepositsForChain(address, 8453, fromBlock, toBlock);
}

export async function checkRecentDepositsForChain(
  address: Address,
  chainId: SourceChainId,
  fromBlock: bigint,
  toBlock: bigint
) {
  const client = CHAIN_CLIENTS[chainId];
  const usdc = SOURCE_CHAINS.find(c => c.id === chainId)?.usdc as Address;
  const logs = await client.getLogs({
    address: usdc,
    event: { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256" }] },
    args: { to: address },
    fromBlock,
    toBlock,
  });
  return logs.map((l: any) => ({
    chainId,
    chainName: SOURCE_CHAINS.find(c => c.id === chainId)?.name,
    blockNumber: l.blockNumber,
    transactionHash: l.transactionHash,
    from: (l.args as any).from as Address,
    value: (l.args as any).value as bigint,
  }));
}

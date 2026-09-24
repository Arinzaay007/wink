"use client";
/**
 * Native wallet portfolio — read a Tempo address's stablecoin holdings.
 *
 * Tempo predeploys its USD stablecoins at sequential TIP-20 slots:
 *   0x20c0…0000 = pathUSD (the settlement asset, always present)
 *   0x20c0…0001..0003 = test stablecoins (AlphaUSD/BetaUSD/ThetaUSD on
 *   Moderato; may not exist on mainnet → read fails → skipped).
 *
 * Reads are public (no key needed), done client-side like fetchBalance.
 * Symbols are read ON-CHAIN so we never mislabel an asset. Every asset
 * here is USD-pegged, so total = sum of balances.
 */
import type { Address } from "viem";
import { TOKEN_DECIMALS } from "./tempo";
import { publicBrowserClient } from "./demoWallet";

const SLOT = "0x20c00000000000000000000000000000000000";
/** pathUSD + the three test stablecoin slots. */
export const PORTFOLIO_TOKENS = [0, 1, 2, 3].map(
  (i) => (SLOT + String(i).padStart(2, "0")) as Address
);

const PORTFOLIO_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export interface PortfolioAsset {
  address: Address;
  symbol: string;
  balance: number;
}

export interface Portfolio {
  address: Address;
  assets: PortfolioAsset[];
  totalUsd: number;
}

/** Read every readable stablecoin at `address`. Unreadable slots are skipped. */
export async function fetchPortfolio(address: Address): Promise<Portfolio> {
  const results = await Promise.all(
    PORTFOLIO_TOKENS.map(async (token) => {
      try {
        const [bal, symbol] = await Promise.all([
          publicBrowserClient.readContract({
            address: token,
            abi: PORTFOLIO_ABI,
            functionName: "balanceOf",
            args: [address],
          }),
          publicBrowserClient.readContract({
            address: token,
            abi: PORTFOLIO_ABI,
            functionName: "symbol",
          }),
        ]);
        return {
          address: token,
          symbol: symbol as string,
          balance: Number(bal as bigint) / 10 ** TOKEN_DECIMALS,
        };
      } catch {
        return null; // token not deployed on this network
      }
    })
  );

  // Show every asset that holds a balance; always keep the pathUSD row so a
  // fresh wallet still shows its settlement asset (the other test stables only
  // appear once they actually hold funds — the faucet only mints pathUSD).
  const assets = results.filter(
    (a): a is PortfolioAsset => a !== null && (a.balance > 0 || a.address === PORTFOLIO_TOKENS[0])
  );
  const totalUsd = assets.reduce((sum, a) => sum + a.balance, 0);
  return { address, assets, totalUsd };
}

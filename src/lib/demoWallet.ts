"use client";
/**
 * In-app self-custody wallet.
 *
 * A keypair is generated IN THE BROWSER and kept in
 * localStorage — zero-setup, and no private key ever
 * touches our servers (non-custodial by construction).
 */
import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { chain, TIP20_ABI, PATH_USD, TOKEN_DECIMALS } from "@/lib/tempo";

const KEY_STORAGE = "wink.demoWallet.v1";

export interface DemoWallet {
  address: Address;
  privateKey: `0x${string}`;
}

export function loadDemoWallet(): DemoWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_STORAGE);
    if (!raw) return null;
    const { privateKey } = JSON.parse(raw) as { privateKey: `0x${string}` };
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) return null;
    return { address: privateKeyToAccount(privateKey).address, privateKey };
  } catch {
    return null;
  }
}

export function createDemoWallet(): DemoWallet {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  localStorage.setItem(KEY_STORAGE, JSON.stringify({ privateKey }));
  return { address, privateKey };
}

export function walletClientFor(wallet: DemoWallet) {
  return createWalletClient({
    account: privateKeyToAccount(wallet.privateKey),
    chain,
    transport: http(),
  });
}

export const publicBrowserClient = createPublicClient({
  chain,
  transport: http(),
});

export async function fetchBalance(address: Address): Promise<number> {
  const raw = (await publicBrowserClient.readContract({
    address: PATH_USD,
    abi: TIP20_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return Number(raw) / 10 ** TOKEN_DECIMALS;
}

/** Send a wink on-chain: pathUSD transferWithMemo. */
export async function sendWink(
  wallet: DemoWallet,
  params: { to: Address; amountMicro: number; memoHex: `0x${string}` }
): Promise<`0x${string}`> {
  const client = walletClientFor(wallet);
  const hash = await client.writeContract({
    address: PATH_USD,
    abi: TIP20_ABI,
    functionName: "transferWithMemo",
    args: [params.to, BigInt(params.amountMicro), params.memoHex],
  });
  return hash;
}

"use client";
/**
 * Bring-your-own-wallet support via EIP-1193 injection.
 *
 * Works with any browser wallet that injects window.ethereum:
 * MetaMask, Rabby, Tempo Wallet, etc. Zero external dependencies —
 * WalletConnect (mobile wallets) is a planned Week-2 stretch.
 */
import { createWalletClient, custom, type Address } from "viem";
import { chain } from "@/lib/tempo";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

const chainIdHex = `0x${chain.id.toString(16)}` as `0x${string}`;

/**
 * Connect (or reconnect) the injected wallet and make sure it's on
 * Tempo. If the user's wallet doesn't know Tempo yet, we add it.
 */
export async function connectInjectedWallet(): Promise<Address> {
  const eth = window.ethereum;
  if (!eth) throw new Error("No wallet found — install MetaMask, Rabby, or Tempo Wallet");

  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as `0x${string}`[];
  if (!accounts?.length) throw new Error("No account authorized");

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 4902) {
      // chain unknown to the wallet → add Tempo with one click
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: chain.name,
            nativeCurrency: {
              name: "US Dollar",
              symbol: "USD",
              decimals: 18,
            },
            rpcUrls: [chain.rpcUrls.default.http[0]],
            blockExplorerUrls: [chain.blockExplorers?.default.url],
          },
        ],
      });
    } else {
      throw new Error("Please switch to the Tempo network in your wallet");
    }
  }

  return accounts[0];
}

/** Wallet client bound to the injected provider (signing in the user's wallet UI). */
export function injectedWalletClient(address: Address) {
  if (!window.ethereum) throw new Error("No injected wallet");
  return createWalletClient({
    account: address,
    chain,
    transport: custom(window.ethereum),
  });
}

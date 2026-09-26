"use client";
/**
 * Bring-your-own-wallet support:
 * - Injected EIP-1193 (MetaMask, Rabby, Tempo Wallet) — desktop + in-app browsers
 * - WalletConnect v2 — mobile Safari/Chrome without injection
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

// WalletConnect provider singleton
let wcProvider: any = null;

async function getWcProvider() {
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
  if (!projectId) throw new Error("WalletConnect not configured — add NEXT_PUBLIC_WC_PROJECT_ID");
  if (wcProvider) return wcProvider;
  const { default: EthereumProvider } = await import("@walletconnect/ethereum-provider");
  wcProvider = await EthereumProvider.init({
    projectId,
    chains: [chain.id, 8453, 1, 42161, 10, 137],
    optionalChains: [8453, 1, 42161, 10, 137, 4217, 42431],
    showQrModal: true,
    rpcMap: {
      [chain.id]: chain.rpcUrls.default.http[0],
      8453: "https://mainnet.base.org",
      1: "https://eth.llamarpc.com",
      42161: "https://arb1.arbitrum.io/rpc",
      10: "https://mainnet.optimism.io",
      137: "https://polygon-rpc.com",
    },
  });
  return wcProvider;
}

export async function connectViaWalletConnect(): Promise<Address> {
  const provider = await getWcProvider();
  await provider.connect();
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  if (!accounts?.length) throw new Error("No account from WalletConnect");
  return accounts[0] as Address;
}

export function getWcWalletClient(address: Address) {
  if (!wcProvider) throw new Error("WalletConnect not connected");
  return createWalletClient({
    account: address,
    chain,
    transport: custom(wcProvider),
  });
}

export function isWalletConnectActive(): boolean {
  return Boolean(wcProvider?.session);
}

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

export async function connectWalletAnyChain(): Promise<Address> {
  // try injected first, fallback to WalletConnect
  if (hasInjectedWallet()) {
    try {
      const eth = window.ethereum!;
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as `0x${string}`[];
      if (accounts?.length) return accounts[0];
    } catch {}
  }
  // if no injected or user wants WC, try WC
  try {
    return await connectViaWalletConnect();
  } catch {
    throw new Error("No wallet found — install MetaMask or use WalletConnect");
  }
}

/** Wallet client bound to the injected provider (signing in the user's wallet UI). */
export function injectedWalletClient(address: Address) {
  // prefer WalletConnect if active
  if (isWalletConnectActive() && wcProvider) {
    return createWalletClient({
      account: address,
      chain,
      transport: custom(wcProvider),
    });
  }
  if (!window.ethereum) throw new Error("No injected wallet");
  return createWalletClient({
    account: address,
    chain,
    transport: custom(window.ethereum),
  });
}

export function walletClientForAny(address: Address) {
  if (isWalletConnectActive() && wcProvider) {
    return getWcWalletClient(address);
  }
  return injectedWalletClient(address);
}

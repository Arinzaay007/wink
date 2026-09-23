import { describe, it, expect } from "vitest";
import {
  sourceChain,
  SOURCE_CHAINS,
  TEMPO_CHAIN_ID,
  TEMPO_USDC_E,
  BRIDGE_MIN_MICRO,
  BRIDGE_MAX_MICRO,
} from "@/lib/relay";

describe("sourceChain registry", () => {
  it("resolves documented corridors", () => {
    expect(sourceChain(8453)?.name).toBe("Base");
    expect(sourceChain(1)?.name).toBe("Ethereum");
    expect(sourceChain(42161)?.name).toBe("Arbitrum");
    expect(sourceChain(10)?.name).toBe("Optimism");
    expect(sourceChain(137)?.name).toBe("Polygon");
  });

  it("returns undefined for unknown chains", () => {
    expect(sourceChain(999_999)).toBeUndefined();
  });

  it("every corridor carries a USDC address", () => {
    for (const c of SOURCE_CHAINS) {
      expect(c.usdc, c.name).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});

describe("doctrine guardrails", () => {
  it("enforces the $5 cross-chain minimum", () => {
    expect(BRIDGE_MIN_MICRO).toBe(5_000_000);
  });

  it("enforces the $500 per-transfer cap", () => {
    expect(BRIDGE_MAX_MICRO).toBe(500_000_000);
  });

  it("delivers to Tempo mainnet as USDC.e", () => {
    expect(TEMPO_CHAIN_ID).toBe(4217);
    expect(TEMPO_USDC_E.toLowerCase()).toBe(
      "0x20c000000000000000000000b9537d11c60e8b50",
    );
  });
});

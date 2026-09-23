import { describe, it, expect } from "vitest";
import {
  encodeMemo,
  decodeMemo,
  winkMemo,
  formatMicro,
  TOKEN_DECIMALS,
} from "@/lib/tempo";

describe("memo encode/decode", () => {
  it("round-trips a short memo", () => {
    const memo = encodeMemo("hello wink");
    expect(decodeMemo(memo)).toBe("hello wink");
  });

  it("encodes to a 32-byte hex value", () => {
    const memo = encodeMemo("abc");
    expect(memo).toMatch(/^0x[0-9a-f]{64}$/i);
  });

  it("truncates input to 31 chars before encoding", () => {
    const long = "x".repeat(50);
    expect(decodeMemo(encodeMemo(long))).toBe("x".repeat(31));
  });

  it("decodeMemo strips null padding", () => {
    expect(decodeMemo(encodeMemo("pay"))).toBe("pay");
  });
});

describe("winkMemo", () => {
  it("prefixes wk_ to the transfer id", () => {
    expect(winkMemo("abc123")).toBe("wk_abc123");
  });

  it("never exceeds 31 chars", () => {
    const id = "y".repeat(40);
    expect(winkMemo(id).length).toBe(31);
  });
});

describe("formatMicro", () => {
  it("formats whole and fractional dollars with 2 decimals", () => {
    expect(formatMicro(1_000_000)).toBe("1.00");
    expect(formatMicro(25_250_000)).toBe("25.25");
    expect(formatMicro(0)).toBe("0.00");
  });

  it("rounds to 2 decimals", () => {
    expect(formatMicro(12_345_678)).toBe("12.35");
  });

  it("pathUSD uses 6 decimals (micro-USD)", () => {
    expect(TOKEN_DECIMALS).toBe(6);
  });
});

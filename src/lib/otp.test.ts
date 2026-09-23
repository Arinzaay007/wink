import { describe, expect, it } from "vitest";
import {
  evaluateOtp,
  generateCode,
  hashCode,
  isValidCodeFormat,
  OTP_MAX_ATTEMPTS,
} from "./otp";

const FUTURE = Date.now() + 60_000;
const PAST = Date.now() - 60_000;

function row(overrides: Partial<Parameters<typeof evaluateOtp>[0]> = {}) {
  return {
    codeHash: hashCode("123456"),
    expiresAt: new Date(FUTURE),
    attempts: 0,
    consumedAt: null,
    ...overrides,
  };
}

describe("generateCode", () => {
  it("always emits exactly 6 digits, zero-padded", () => {
    for (let i = 0; i < 500; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[0-9]{6}$/);
    }
  });
});

describe("isValidCodeFormat", () => {
  it("accepts only plain 6-digit strings", () => {
    expect(isValidCodeFormat("000000")).toBe(true);
    expect(isValidCodeFormat("123456")).toBe(true);
    expect(isValidCodeFormat("12345")).toBe(false);
    expect(isValidCodeFormat("1234567")).toBe(false);
    expect(isValidCodeFormat(" 123456")).toBe(false);
    expect(isValidCodeFormat("12345a")).toBe(false);
    expect(isValidCodeFormat(123456 as unknown as string)).toBe(false);
    expect(isValidCodeFormat(null)).toBe(false);
  });
});

describe("evaluateOtp", () => {
  it("accepts the right code inside the TTL", () => {
    expect(evaluateOtp(row(), "123456")).toEqual({ ok: true });
  });

  it("rejects the wrong code", () => {
    expect(evaluateOtp(row(), "654321")).toEqual({
      ok: false,
      reason: "wrong-code",
    });
  });

  it("rejects expired codes", () => {
    expect(evaluateOtp(row({ expiresAt: new Date(PAST) }), "123456")).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects consumed codes even when otherwise correct", () => {
    expect(
      evaluateOtp(row({ consumedAt: new Date() }), "123456")
    ).toEqual({ ok: false, reason: "wrong-code" });
  });

  it("locks out after max attempts", () => {
    expect(
      evaluateOtp(row({ attempts: OTP_MAX_ATTEMPTS }), "123456")
    ).toEqual({ ok: false, reason: "too-many-attempts" });
  });
});

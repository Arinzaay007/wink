import { describe, it, expect } from "vitest";
import {
  normalizeHandle,
  validateHandleFormat,
  HANDLE_RE,
} from "@/lib/handles";

describe("normalizeHandle", () => {
  it("lowercases and strips @ and whitespace", () => {
    expect(normalizeHandle("@AdaEze ")).toBe("adaeze");
    expect(normalizeHandle("  @ARINZAAY")).toBe("arinzaay");
    expect(normalizeHandle("ngozi")).toBe("ngozi");
  });
});

describe("validateHandleFormat", () => {
  it("accepts valid handles", () => {
    expect(validateHandleFormat("adaeze").ok).toBe(true);
    expect(validateHandleFormat("arinzaay").ok).toBe(true);
    expect(validateHandleFormat("a_b").ok).toBe(true);
    expect(validateHandleFormat("shop01").ok).toBe(true);
  });

  it("rejects too-short / too-long / bad-start handles", () => {
    expect(validateHandleFormat("ab").reason).toBe("format"); // < 3 chars
    expect(validateHandleFormat("a".repeat(21)).reason).toBe("format"); // > 20
    expect(validateHandleFormat("1abc").reason).toBe("format"); // starts with digit
    expect(validateHandleFormat("_lead").reason).toBe("format"); // starts with _
  });

  it("rejects reserved handles", () => {
    for (const r of ["wink", "api", "pay", "dashboard", "demo", "tempo", "admin"]) {
      expect(validateHandleFormat(r).reason, r).toBe("reserved");
    }
  });

  it("rejects profanity", () => {
    expect(validateHandleFormat("fuckyou").reason).toBe("profanity");
  });

  it("HANDLE_RE length bounds are 3..20", () => {
    expect(HANDLE_RE.test("abc")).toBe(true);
    expect(HANDLE_RE.test("a".repeat(20))).toBe(true);
    expect(HANDLE_RE.test("a".repeat(21))).toBe(false);
  });
});

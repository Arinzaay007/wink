import { describe, expect, it } from "vitest";
import {
  LINK_CODE_TTL_MIN,
  formatWinkNotification,
  generateLinkCode,
  isValidLinkCode,
  parseWinkCommand,
  WINK_MAX_MICRO,
  WINK_MIN_MICRO,
} from "./telegram";

describe("generateLinkCode", () => {
  it("mints WK-XXXX-XXXX codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateLinkCode();
      expect(code).toMatch(/^WK-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(isValidLinkCode(code)).toBe(true);
    }
  });

  it("never uses ambiguous characters (0/O, 1/I/L)", () => {
    const rand = () => 0.999999; // force the tail of the alphabet
    const code = generateLinkCode(rand);
    expect(code).not.toMatch(/[0O1IL]/);
  });

  it("is case-insensitive on validation", () => {
    const code = generateLinkCode();
    expect(isValidLinkCode(code.toLowerCase())).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isValidLinkCode("wk-ABC-1234")).toBe(false);
    expect(isValidLinkCode("pc_hl3ex8uu")).toBe(false);
    expect(isValidLinkCode("wk-AAAA-AAAA-extra")).toBe(false);
    expect(isValidLinkCode("")).toBe(false);
  });

  it("has a sane TTL", () => {
    expect(LINK_CODE_TTL_MIN).toBe(15);
  });
});

describe("formatWinkNotification", () => {
  const base = {
    amountMicro: 5_000_000,
    message: null,
    txHash: null,
    explorerUrl: "https://explore.testnet.tempo.xyz",
  };

  it("announces a named wink with handle", () => {
    const text = formatWinkNotification({
      ...base,
      kind: "wink",
      senderHandle: "chidi",
      senderName: null,
    });
    expect(text).toContain("You've been winked 😉");
    expect(text).toContain("$5.00 from @chidi");
  });

  it("respects anonymous tippers", () => {
    const text = formatWinkNotification({
      ...base,
      kind: "wink",
      senderHandle: null,
      senderName: null,
    });
    expect(text).toContain("from someone");
    expect(text).not.toContain("@");
  });

  it("includes the message and explorer receipt when present", () => {
    const text = formatWinkNotification({
      ...base,
      kind: "sale",
      senderHandle: "ngozi",
      senderName: null,
      message: "Thanks for the fade!",
      txHash: "0xabc123",
    });
    expect(text).toContain("Payment received 💳");
    expect(text).toContain("“Thanks for the fade!”");
    expect(text).toContain("https://explore.testnet.tempo.xyz/tx/0xabc123");
  });

  it("labels wages and agent payments distinctly", () => {
    expect(
      formatWinkNotification({ ...base, kind: "wage", senderHandle: "adaeze", senderName: null })
    ).toContain("Payout arrived 💼");
    expect(
      formatWinkNotification({ ...base, kind: "agent", senderHandle: null, senderName: null })
    ).toContain("An agent paid you 🤖");
  });
});

describe("parseWinkCommand", () => {
  it("parses handle, amount and message", () => {
    const r = parseWinkCommand("@adaeze $5 Great set! 🙌");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.wink.handle).toBe("adaeze");
      expect(r.wink.amountMicro).toBe(5_000_000);
      expect(r.wink.message).toBe("Great set! 🙌");
    }
  });

  it("accepts amounts without the $ sign and decimals", () => {
    const r = parseWinkCommand("ngozi 2.50");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.wink.handle).toBe("ngozi");
      expect(r.wink.amountMicro).toBe(2_500_000);
      expect(r.wink.message).toBeNull();
    }
  });

  it("normalizes handle casing and strips @", () => {
    const r = parseWinkCommand("@AdaEze 1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.wink.handle).toBe("adaeze");
  });

  it("rejects missing arguments with usage help", () => {
    const r = parseWinkCommand("@adaeze");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Usage:");
  });

  it("rejects bad handles and bad amounts", () => {
    expect(parseWinkCommand("1bad $5").ok).toBe(false);
    expect(parseWinkCommand("@adaeze five").ok).toBe(false);
    expect(parseWinkCommand("@adaeze -3").ok).toBe(false);
  });

  it("enforces the $0.10–$500 guardrails", () => {
    expect(parseWinkCommand("@adaeze 0.05").ok).toBe(false);
    expect(parseWinkCommand("@adaeze 501").ok).toBe(false);
    const lo = parseWinkCommand("@adaeze 0.10");
    const hi = parseWinkCommand("@adaeze 500");
    expect(lo.ok).toBe(true);
    expect(hi.ok).toBe(true);
    if (lo.ok) expect(lo.wink.amountMicro).toBe(WINK_MIN_MICRO);
    if (hi.ok) expect(hi.wink.amountMicro).toBe(WINK_MAX_MICRO);
  });

  it("truncates very long messages to 140 chars", () => {
    const r = parseWinkCommand(`@adaeze 5 ${"x".repeat(300)}`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.wink.message?.length).toBe(140);
  });
});

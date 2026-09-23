import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("session tokens", () => {
  it("round-trips a user id", () => {
    const token = createSessionToken("user_abc123");
    expect(verifySessionToken(token)).toBe("user_abc123");
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken("user_abc123");
    const [payload, sig] = token.split(".");
    const flipped = sig[0] === "a" ? "b" + sig.slice(1) : "a" + sig.slice(1);
    expect(verifySessionToken(`${payload}.${flipped}`)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken("user_abc123");
    const [, sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ uid: "attacker", exp: Date.now() + 1e9 }))
      .toString("base64url");
    expect(verifySessionToken(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("rejects malformed / empty input", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("garbage")).toBeNull();
    expect(verifySessionToken("a.b.c")).toBeNull();
  });

  it("rejects an expired token", () => {
    // craft a payload that's already expired, signed correctly
    const { createHmac } = require("node:crypto");
    const secret = process.env.SESSION_SECRET || "dev-wink-secret-change-me";
    const payload = Buffer.from(
      JSON.stringify({ uid: "user_x", exp: Date.now() - 1000 }),
    ).toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");
    expect(verifySessionToken(`${payload}.${sig}`)).toBeNull();
  });
});

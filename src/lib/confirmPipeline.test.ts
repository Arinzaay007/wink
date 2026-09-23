import { describe, expect, it } from "vitest";
import {
  NOT_FOUND_TIMEOUT_MS,
  classifyVerification,
} from "./confirmPipeline";

describe("classifyVerification", () => {
  it("confirms when the chain says the payment is there", () => {
    const out = classifyVerification({ ok: true, from: "0xabc" }, 1_000);
    expect(out).toEqual({ action: "confirm", from: "0xabc" });
  });

  it("retries while a tx is simply not mined yet", () => {
    const out = classifyVerification(
      { ok: false, reason: "receipt-not-found" },
      30_000
    );
    expect(out.action).toBe("retry");
  });

  it("gives up on a tx nobody has seen after the timeout", () => {
    const out = classifyVerification(
      { ok: false, reason: "receipt-not-found" },
      NOT_FOUND_TIMEOUT_MS + 1
    );
    expect(out).toEqual({ action: "fail", reason: "tx-not-found-timeout" });
  });

  it("honours a custom timeout", () => {
    const out = classifyVerification(
      { ok: false, reason: "receipt-not-found" },
      5_000,
      4_000
    );
    expect(out.action).toBe("fail");
  });

  it("fails definitively on reverted txs", () => {
    const out = classifyVerification({ ok: false, reason: "tx-reverted" }, 100);
    expect(out).toEqual({ action: "fail", reason: "tx-reverted" });
  });

  it("fails definitively when the receipt doesn't match expectations", () => {
    const out = classifyVerification(
      { ok: false, reason: "no-matching-payment" },
      100
    );
    expect(out).toEqual({ action: "fail", reason: "no-matching-payment" });
    const out2 = classifyVerification(
      { ok: false, reason: "no-matching-transfer-event" },
      100
    );
    expect(out2).toEqual({ action: "fail", reason: "no-matching-transfer-event" });
  });

  it("retries on unknown transient errors", () => {
    const out = classifyVerification({ ok: false, reason: "rpc-hiccup" }, 100);
    expect(out.action).toBe("retry");
  });
});

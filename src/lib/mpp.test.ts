import { describe, it, expect } from "vitest";
import {
  parseCredential,
  mppChallenge,
  mppReceipt,
  MPP_PRICE_MICRO,
} from "@/lib/mpp";
import type { Address } from "viem";

const TXHASH =
  "0x052cba278294b309acb1664834f116421cdabeae92613ff94b571d108021451e" as const;
const RECIPIENT = "0x55da6e129C19707eEDd05bb112A81657760530e8" as Address;

describe("parseCredential", () => {
  it("extracts a 64-hex txHash from a Payment credential", () => {
    expect(parseCredential(`Payment ${TXHASH}`)).toBe(TXHASH);
  });

  it("is case-insensitive on the scheme", () => {
    expect(parseCredential(`payment ${TXHASH}`)).toBe(TXHASH);
  });

  it("rejects wrong scheme, short hash, or missing header", () => {
    expect(parseCredential(`Bearer ${TXHASH}`)).toBeNull();
    expect(parseCredential("Payment 0x1234")).toBeNull();
    expect(parseCredential(null)).toBeNull();
    expect(parseCredential("")).toBeNull();
  });
});

describe("mppChallenge", () => {
  it("names the recipient, price, and currency", () => {
    const { challenge, header } = mppChallenge(RECIPIENT, "wink:analytics:adaeze");
    expect(challenge.scheme).toBe("tempo");
    expect(challenge.intent).toBe("charge");
    expect(challenge.amountMicro).toBe(MPP_PRICE_MICRO);
    expect(challenge.currency).toBe("pathUSD");
    expect(challenge.recipient).toBe(RECIPIENT);
    expect(header).toContain('scheme="tempo"');
    expect(header).toContain(`amount="${MPP_PRICE_MICRO}"`);
    expect(header).toContain(`recipient="${RECIPIENT}"`);
    expect(header).toContain('realm="wink:analytics:adaeze"');
  });
});

describe("mppReceipt", () => {
  it("includes reference, amount, asset, payer, and settlement", () => {
    const r = mppReceipt({ reference: TXHASH, amountMicro: MPP_PRICE_MICRO, payer: RECIPIENT });
    expect(r).toContain(`reference="${TXHASH}"`);
    expect(r).toContain(`amount="${MPP_PRICE_MICRO}"`);
    expect(r).toContain('asset="pathUSD"');
    expect(r).toContain(`payer="${RECIPIENT}"`);
    expect(r).toContain('settled="tempo"');
  });
});

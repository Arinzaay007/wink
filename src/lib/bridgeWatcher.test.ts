import { describe, it, expect } from "vitest";
import { mapRelayStatus, matchArrivalLogs, chainLabel, type ArrivalLog } from "./bridgeWatcher";

const log = (over: Partial<ArrivalLog> = {}): ArrivalLog => ({
  address: "0x20C000000000000000000000b9537d11c60E8b50",
  transactionHash: "0xabc",
  blockNumber: 100n,
  args: { to: "0x1111111111111111111111111111111111111111", value: 5_000_000n },
  ...over,
});

describe("mapRelayStatus", () => {
  it("success moves to independent verification", () => {
    expect(mapRelayStatus("success").watch).toBe("verifying");
  });
  it("failure is terminal", () => {
    expect(mapRelayStatus("failure").watch).toBe("failed");
  });
  it("not-found keeps watching (on-chain mode)", () => {
    expect(mapRelayStatus("not-found").watch).toBe("watching");
  });
  it("unknown/interim states stay watching with progress", () => {
    const m = mapRelayStatus("fill-submitted");
    expect(m.watch).toBe("watching");
    expect(m.progress).toContain("fill-submitted");
  });
});

describe("matchArrivalLogs", () => {
  const receiver = "0x1111111111111111111111111111111111111111" as const;

  it("matches recipient + full amount", () => {
    const hit = matchArrivalLogs([log()], receiver, 5_000_000);
    expect(hit?.transactionHash).toBe("0xabc");
  });

  it("accepts overpayment (solver rounding)", () => {
    expect(matchArrivalLogs([log()], receiver, 4_999_999)).not.toBeNull();
  });

  it("rejects a different recipient", () => {
    const other = log({ args: { to: "0x2222222222222222222222222222222222222222", value: 5_000_000n } });
    expect(matchArrivalLogs([other], receiver, 5_000_000)).toBeNull();
  });

  it("rejects short payment", () => {
    const short = log({ args: { to: receiver, value: 4_999_999n } });
    expect(matchArrivalLogs([short], receiver, 5_000_000)).toBeNull();
  });

  it("is case-insensitive on the address", () => {
    const upper = log({ args: { to: receiver.toUpperCase() as never, value: 5_000_000n } });
    expect(matchArrivalLogs([upper], receiver, 5_000_000)).not.toBeNull();
  });
});

describe("chainLabel", () => {
  it("capitalizes known chains", () => {
    expect(chainLabel("base")).toBe("Base");
    expect(chainLabel("ETHEREUM")).toBe("Ethereum");
  });
  it("passes unknown slugs through", () => {
    expect(chainLabel("solana")).toBe("solana");
  });
});

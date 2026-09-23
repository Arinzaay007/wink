"use client";
/**
 * Batch payroll — paste a list, pay everyone.
 *
 * One line per worker:  @handle  amount  memo (optional)
 * Every payment rides the same rails as a single wink (prepare → sign →
 * on-chain verify), executed sequentially so the ledger stays tidy and
 * the demo gets to watch each payment land.
 */
import { useEffect, useState } from "react";
import {
  loadDemoWallet,
  createDemoWallet,
  fetchBalance,
  sendWink,
  type DemoWallet,
} from "@/lib/demoWallet";
import {
  hasInjectedWallet,
  connectInjectedWallet,
  injectedWalletClient,
} from "@/lib/connectedWallet";
import { PATH_USD, TIP20_ABI } from "@/lib/tempo";
import { parsePayrollLines, type PayrollRow } from "@/lib/payroll";
import type { Address } from "viem";

const EXAMPLE = `@arinzaay 250 Landing page design
@adaeze 120 Community management — Sept`;

export default function PayrollForm() {
  const [text, setText] = useState(EXAMPLE);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [phase, setPhase] = useState<"edit" | "review" | "running" | "done">("edit");

  const [hasOwn, setHasOwn] = useState(false);
  const [useOwn, setUseOwn] = useState(false);
  const [ownAddr, setOwnAddr] = useState<Address | null>(null);
  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasOwn(hasInjectedWallet());
    const w = loadDemoWallet();
    if (w) {
      setWallet(w);
      fetchBalance(w.address).then(setBalance).catch(() => setBalance(null));
    }
  }, []);

  const setRow = (i: number, patch: Partial<PayrollRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const validate = async () => {
    setError(null);
    const parsed = parsePayrollLines(text);
    setRows(parsed);
    if (parsed.length === 0) {
      setError("Add at least one line: @handle amount memo");
      return;
    }
    setPhase("review");
    // resolve every handle (privacy-safe: never exposes addresses)
    for (let i = 0; i < parsed.length; i++) {
      const r = parsed[i];
      if (r.status === "bad-line") continue;
      setRow(i, { status: "checking" });
      const res = await fetch(`/api/resolve/${r.handle}`);
      setRow(i, { status: res.ok ? "ready" : "unknown-handle" });
    }
  };

  const total = rows.reduce((s, r) => s + (r.status === "bad-line" ? 0 : r.dollars), 0);
  const payable = rows.filter((r) => r.status === "ready").length;

  const runPayroll = async () => {
    setError(null);
    setPhase("running");
    try {
      // choose paying wallet
      let fromAddress: Address;
      if (useOwn) {
        if (!ownAddr) setOwnAddr(await connectInjectedWallet());
        fromAddress = (ownAddr ?? (await connectInjectedWallet())) as Address;
      } else {
        let w = wallet ?? loadDemoWallet();
        if (!w) {
          w = createDemoWallet();
          setWallet(w);
          fetch("/api/wallet/link", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ address: w.address, kind: "inapp", label: "payroll wallet" }),
          }).catch(() => {});
        }
        fromAddress = w.address;
        // make sure the demo wallet can cover the run
        const bal = await fetchBalance(fromAddress);
        if (bal * 1_000_000 < total * 1_000_000 + 200_000) {
          const res = await fetch("/api/fund", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ address: fromAddress }),
          });
          if (!res.ok) throw new Error("faucet failed — try again");
          await new Promise((r) => setTimeout(r, 1800));
        }
        setBalance(await fetchBalance(fromAddress));
      }

      // sequential execution — one clean on-chain payment per worker
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.status !== "ready") continue;
        setRow(i, { status: "paying" });
        try {
          const amountMicro = Math.round(r.dollars * 1_000_000);
          const prep = await fetch("/api/wink/prepare", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              handle: r.handle,
              amountMicro,
              message: r.memo || undefined,
              fromAddress,
              asWage: true, // batch payroll → ledger records these as wages
            }),
          }).then((x) => x.json());
          if (!prep.transferId) throw new Error(prep.error ?? "prepare failed");

          let hash: `0x${string}`;
          if (useOwn) {
            const client = injectedWalletClient(fromAddress);
            hash = await client.writeContract({
              address: PATH_USD,
              abi: TIP20_ABI,
              functionName: "transferWithMemo",
              args: [prep.to as Address, BigInt(amountMicro), prep.memoHex as `0x${string}`],
            });
          } else {
            hash = await sendWink(wallet as DemoWallet, {
              to: prep.to as Address,
              amountMicro,
              memoHex: prep.memoHex,
            });
          }

          let confirmed = false;
          for (let a = 0; a < 12 && !confirmed; a++) {
            await new Promise((res) => setTimeout(res, 1000));
            const c = await fetch("/api/wink/confirm", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ transferId: prep.transferId, txHash: hash }),
            }).then((x) => x.json());
            if (c.status === "confirmed") confirmed = true;
          }
          if (!confirmed) throw new Error("broadcast but not verified");
          setRow(i, { status: "confirmed" });
        } catch (e) {
          setRow(i, { status: "failed", error: e instanceof Error ? e.message : "failed" });
        }
      }
      setBalance(await fetchBalance(fromAddress));
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "payroll failed");
      setPhase("review");
    }
  };

  return (
    <div className="card p-6">
      {phase === "edit" && (
        <>
          <h3 className="font-semibold">💼 Run payroll</h3>
          <p className="mt-1 text-xs text-ink-500">
            One line per person: <span className="mono">@handle amount memo</span> — everyone
            gets paid on-chain, each with its own verified transfer.
          </p>
          <textarea
            className="input mono mt-4 min-h-40 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <button className="btn-primary mt-4 w-full" onClick={validate}>
            Validate recipients →
          </button>
        </>
      )}

      {phase !== "edit" && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {phase === "done" ? "✅ Payroll complete" : "Payroll run"}
            </h3>
            <button
              className="text-xs text-ink-500 hover:text-ink-300"
              onClick={() => {
                setPhase("edit");
                setRows([]);
              }}
            >
              ← edit list
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm"
              >
                <span className="w-5 text-center">
                  {r.status === "confirmed" && "✅"}
                  {r.status === "failed" && "❌"}
                  {r.status === "paying" && "⏳"}
                  {r.status === "ready" && "✓"}
                  {r.status === "checking" && "…"}
                  {r.status === "unknown-handle" && "❓"}
                  {r.status === "bad-line" && "⚠️"}
                  {r.status === "draft" && "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {r.status === "bad-line" ? (
                      <span className="text-red-300">can&apos;t parse: “{r.memo}”</span>
                    ) : (
                      <>@{r.handle}</>
                    )}
                  </div>
                  {r.memo && r.status !== "bad-line" && (
                    <div className="truncate text-xs text-ink-500">{r.memo}</div>
                  )}
                  {r.status === "unknown-handle" && (
                    <div className="text-xs text-red-300">handle not claimed</div>
                  )}
                  {r.error && <div className="text-xs text-red-300">{r.error}</div>}
                </div>
                <span className="mono font-semibold text-mint">${r.dollars.toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-paper-dim/70 px-4 py-3">
            <span className="text-sm text-ink-300">
              {payable} payment{payable === 1 ? "" : "s"}
            </span>
            <span className="mono text-lg font-bold text-wink">${total.toFixed(2)}</span>
          </div>

          {phase === "review" && (
            <>
              {/* wallet source */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {hasOwn && (
                  <button
                    onClick={async () => {
                      if (!ownAddr) setOwnAddr(await connectInjectedWallet().catch(() => null));
                      setUseOwn(true);
                    }}
                    className={`rounded-xl border px-2 py-2.5 font-semibold transition ${
                      useOwn
                        ? "border-wink bg-wink/15 text-wink"
                        : "border-line text-ink-300 hover:border-ink-500"
                    }`}
                  >
                    {ownAddr ? "👛 My wallet" : "👛 Connect wallet"}
                  </button>
                )}
                <button
                  onClick={() => setUseOwn(false)}
                  className={`rounded-xl border px-2 py-2.5 font-semibold transition ${
                    !useOwn
                      ? "border-wink bg-wink/15 text-wink"
                      : "border-line text-ink-300 hover:border-ink-500"
                  } ${hasOwn ? "" : "col-span-2"}`}
                >
                  ⚡ Instant demo wallet
                </button>
              </div>
              {!useOwn && balance !== null && (
                <p className="mt-2 text-center text-[11px] text-ink-500">
                  demo wallet: <span className="mono text-ink-300">${balance.toFixed(2)}</span> pathUSD
                  {balance < total && " · we'll faucet-fund the difference"}
                </p>
              )}
              <button
                className="btn-primary mt-4 w-full text-base"
                onClick={runPayroll}
                disabled={payable === 0}
              >
                💸 Pay everyone ${total.toFixed(2)}
              </button>
            </>
          )}

          {phase === "running" && (
            <p className="mt-4 text-center text-sm text-wink">
              ⏳ Paying each worker on-chain… watch them land one by one.
            </p>
          )}

          {phase === "done" && (
            <p className="mt-4 text-center text-sm text-ink-300">
              Every payment verified on Tempo. Your workers just got winked. 😉
            </p>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

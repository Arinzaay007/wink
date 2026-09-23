"use client";
/**
 * Telegram link card — dashboard section.
 * The owner mints a one-time code here, redeems it with /link in the bot,
 * and from then on every confirmed wink lands as a Telegram DM.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "your Wink bot";

export default function TelegramCard() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ttlMin, setTtlMin] = useState(15);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/telegram");
    if (res.status === 401) return; // not signed in — card stays quiet
    const data = await res.json().catch(() => null);
    if (data) setLinked(Boolean(data.linked));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // While a code is on screen, poll so the card flips the moment the
  // user completes /link on their phone.
  useEffect(() => {
    if (code && linked !== true) {
      pollRef.current = setInterval(refresh, 4000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [code, linked, refresh]);

  const mint = async () => {
    setBusy(true);
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (data?.code) {
      setCode(data.code);
      setTtlMin(data.ttlMin ?? 15);
    }
  };

  const unlink = async () => {
    setBusy(true);
    await fetch("/api/telegram", { method: "DELETE" });
    setBusy(false);
    setCode(null);
    setLinked(false);
  };

  return (
    <section className="card p-6">
      <h2 className="font-semibold">✈️ Telegram</h2>
      <p className="mt-1 text-xs text-ink-500">
        Get a DM the instant money lands — “you&apos;ve been winked 😉”, with the
        on-chain receipt.
      </p>

      {linked === true ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
            <span>✅</span>
            <span>
              Linked — wink notifications are on.{" "}
              <span className="text-ink-500">Say /balance or /unlink in the bot anytime.</span>
            </span>
          </div>
          <button onClick={unlink} disabled={busy} className="btn-ghost">
            Unlink this chat
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          {!code ? (
            <button onClick={mint} disabled={busy} className="btn-primary">
              {busy ? "Minting…" : "Link Telegram"}
            </button>
          ) : (
            <>
              <ol className="list-decimal space-y-1.5 pl-5 text-ink-300">
                <li>
                  Open Telegram and message{" "}
                  <span className="font-medium text-ink-100">@{BOT_USERNAME.replace(/^@/, "")}</span>
                </li>
                <li>
                  Send: <span className="mono font-semibold text-ink-100">/link {code}</span>
                </li>
                <li>Done — every confirmed wink pings you here instantly.</li>
              </ol>
              <div className="rounded-xl border border-line bg-paper-dim/70 p-3 text-center">
                <div className="mono text-xl font-bold tracking-wider">{code}</div>
                <div className="mt-1 text-xs text-ink-500">
                  one-time · expires in {ttlMin} minutes
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={mint} disabled={busy} className="btn-ghost">
                  New code
                </button>
                <button onClick={() => setCode(null)} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

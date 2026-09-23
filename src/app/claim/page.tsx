"use client";
/**
 * Claim flow: pick a handle → email → verify code → done.
 * The code step is the §9C auth gate: no session exists until a code
 * round-trips through the inbox. When no mail provider is configured
 * (dev), the code is surfaced in-page so the demo stays 20 seconds.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeHandle, HANDLE_RE } from "@/lib/handles";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export default function ClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeHandle(handle), [handle]);

  const checkAvailability = async (h: string) => {
    const v = normalizeHandle(h);
    if (!v) return setStatus("idle");
    if (!HANDLE_RE.test(v)) return setStatus("invalid");
    setStatus("checking");
    const res = await fetch(`/api/resolve/${v}`);
    setStatus(res.status === 404 ? "available" : "taken");
  };

  const sendCode = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName: displayName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429)
          throw new Error("A code was just sent — give your inbox a moment.");
        throw new Error(data.error ?? "could not send code");
      }
      setDevCode(data.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAndClaim = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.userId) {
        const msg =
          data.error === "wrong-code"
            ? "That code doesn't match — check the digits and try again."
            : data.error === "expired"
              ? "That code expired — send a fresh one."
              : data.error === "too-many-attempts"
                ? "Too many tries — send a fresh code."
                : (data.error ?? "verification failed");
        throw new Error(msg);
      }

      const claimRes = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: normalized }),
      });
      const claimData = await claimRes.json();
      if (!claimRes.ok) {
        const msg =
          claimData.error === "handle-taken"
            ? "That handle was just taken — try another!"
            : claimData.error === "handle-reserved"
              ? "That handle is reserved."
              : (claimData.error ?? "could not claim");
        throw new Error(msg);
      }
      setClaimed(claimData.handle);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (claimed) {
    return (
      <div className="py-24 text-center">
        <div className="animate-float text-6xl">😉</div>
        <h1 className="mt-6 text-3xl font-extrabold">
          @{claimed} is <span className="text-wink">yours</span>.
        </h1>
        <p className="mt-3 text-ink-300">
          Your pay page is live. Share it, print it as a QR, get winked.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button onClick={() => router.push(`/@${claimed}`)} className="btn-primary">
            See my page →
          </button>
          <button onClick={() => router.push("/dashboard")} className="btn-ghost">
            Open dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-3xl font-extrabold">Claim your handle</h1>
      <p className="mt-2 text-sm text-ink-300">
        One name for every payment — tips, shop sales, wages.
      </p>

      {step === "form" ? (
        <div className="card mt-8 space-y-5 p-6">
          <div>
            <label className="label">Your handle</label>
            <div className="flex items-center gap-2">
              <span className="text-xl text-wink">@</span>
              <input
                className="input"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value.toLowerCase());
                  setStatus("idle");
                }}
                onBlur={(e) => checkAvailability(e.target.value)}
                placeholder="adaeze"
                maxLength={20}
                autoFocus
              />
            </div>
            <p
              className={`mt-2 text-xs ${
                status === "available"
                  ? "text-mint"
                  : status === "taken"
                    ? "text-red-400"
                    : "text-ink-500"
              }`}
            >
              {status === "checking" && "checking…"}
              {status === "available" && `✓ @${normalized} is available`}
              {status === "taken" && `✗ @${normalized} is taken`}
              {status === "invalid" &&
                "3–20 chars, starts with a letter, letters/numbers/underscores only"}
            </p>
          </div>

          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Adaeze Okafor"
              maxLength={40}
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="mt-1.5 text-xs text-ink-500">
              We&apos;ll email you a one-time code — no password, ever.
            </p>
          </div>

          <button
            className="btn-primary w-full"
            disabled={
              status !== "available" || !email.includes("@") || submitting
            }
            onClick={sendCode}
          >
            {submitting ? "Sending code…" : `Email me a code`}
          </button>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="card mt-8 space-y-5 p-6">
          <p className="text-sm text-ink-300">
            We sent a 6-digit code to <span className="font-medium">{email}</span>.
            Enter it to claim <span className="text-wink">@{normalized}</span>.
          </p>

          {devCode && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Dev delivery (no mail provider configured) — your code is{" "}
              <span className="font-mono text-sm tracking-widest">{devCode}</span>
            </div>
          )}

          <input
            className="input text-center font-mono text-xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            autoFocus
          />

          <button
            className="btn-primary w-full"
            disabled={code.length !== 6 || submitting}
            onClick={verifyAndClaim}
          >
            {submitting ? "Claiming…" : `Verify & claim @${normalized}`}
          </button>
          <div className="flex items-center justify-between text-xs text-ink-500">
            <button className="hover:text-ink-300" onClick={() => setStep("form")}>
              ← change email
            </button>
            <button className="hover:text-ink-300" onClick={sendCode}>
              resend code
            </button>
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

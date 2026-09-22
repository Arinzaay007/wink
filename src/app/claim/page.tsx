"use client";
/**
 * Claim flow: pick a handle → email → done. Friction budget: ~20 seconds.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeHandle, HANDLE_RE } from "@/lib/handles";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export default function ClaimPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
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

  const claim = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const auth = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName: displayName || undefined }),
      }).then((r) => r.json());
      if (!auth.userId) throw new Error(auth.error ?? "auth failed");

      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === "handle-taken"
            ? "That handle was just taken — try another!"
            : data.error === "handle-reserved"
              ? "That handle is reserved."
              : (data.error ?? "could not claim");
        throw new Error(msg);
      }
      setClaimed(data.handle);
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
            Hackathon mode: email only, no password.
          </p>
        </div>

        <button
          className="btn-primary w-full"
          disabled={
            status !== "available" || !email.includes("@") || submitting
          }
          onClick={claim}
        >
          {submitting ? "Claiming…" : `Claim @${normalized || "…"}`}
        </button>
        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

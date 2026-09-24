"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, AtSign, Mail, ShieldCheck } from "lucide-react";
import { BgFx } from "@/components/BgFx";
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
        if (res.status === 429) throw new Error("A code was just sent — give your inbox a moment.");
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
        const msg = data.error === "wrong-code" ? "That code doesn't match — check the digits and try again." : data.error === "expired" ? "That code expired — send a fresh one." : data.error === "too-many-attempts" ? "Too many tries — send a fresh code." : (data.error ?? "verification failed");
        throw new Error(msg);
      }
      const claimRes = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: normalized }),
      });
      const claimData = await claimRes.json();
      if (!claimRes.ok) {
        const msg = claimData.error === "handle-taken" ? "That handle was just taken — try another!" : claimData.error === "handle-reserved" ? "That handle is reserved." : (claimData.error ?? "could not claim");
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
      <div className="relative">
        <BgFx />
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="mx-auto w-20 h-20 rounded-full bg-[color:var(--color-neon)] flex items-center justify-center neon-glow text-4xl">😉</motion.div>
          <h1 className="mt-8 text-display text-[56px] leading-[0.95] tracking-[-0.04em]"><span className="text-white">@{claimed} is</span> <em className="italic font-light neon-text">yours</em><span className="text-[color:var(--color-neon)]">.</span></h1>
          <p className="mt-4 text-[color:var(--color-ink-2)] max-w-md mx-auto">Your pay page is live. Share it, print it as a QR, get winked.</p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <button onClick={() => router.push(`/wink/${claimed}`)} className="btn-primary !px-7 !py-4">See my page <ArrowRight size={16} /></button>
            <button onClick={() => router.push("/dashboard")} className="btn-ghost !px-7 !py-4">Open dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10"><ArrowLeft size={14} /> back</Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6"><AtSign size={11} /> /claim · new handle</div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]"><span className="text-white">Claim</span> <em className="italic font-light text-[color:var(--color-ink-2)]">your</em><br /><span className="neon-text italic font-light">@handle</span><span className="text-[color:var(--color-neon)]">.</span></h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">One name for every payment — tips, shop sales, wages. Settled as pathUSD on Tempo. 0% platform fee.</p>

            <div className="mt-12 flex items-center gap-3 text-xs text-mono uppercase tracking-[0.18em]">
              {(["form", "code"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${step === s ? "border-[color:var(--color-neon)] text-[color:var(--color-neon)] bg-[color:var(--color-neon-soft)]" : "border-[color:var(--color-line)] text-[color:var(--color-ink-3)]"}`}><span>0{i + 1}</span>{s}</div>
                  {i < 1 && <div className="w-8 h-px bg-[color:var(--color-line)]" />}
                </div>
              ))}
            </div>

            {step === "form" ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card p-7 space-y-6">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">your handle</div>
                  <div className="flex items-center gap-3 bg-black border border-[color:var(--color-line)] focus-within:border-[color:var(--color-neon)] rounded-xl px-4 py-3 transition">
                    <span className="text-[color:var(--color-neon)] text-xl">@</span>
                    <input className="flex-1 bg-transparent outline-none text-white text-[15px]" value={handle} onChange={(e) => { setHandle(e.target.value.toLowerCase()); setStatus("idle"); }} onBlur={(e) => checkAvailability(e.target.value)} placeholder="adaeze" maxLength={20} autoFocus />
                  </div>
                  <div className={`mt-2 text-xs font-mono ${status === "available" ? "text-[color:var(--color-neon)]" : status === "taken" ? "text-red-400" : "text-[color:var(--color-ink-3)]"}`}>
                    {status === "checking" && "checking…"}
                    {status === "available" && `✓ @${normalized} is available`}
                    {status === "taken" && `✗ @${normalized} is taken`}
                    {status === "invalid" && "3–20 chars, starts with a letter, letters/numbers/underscores only"}
                  </div>
                </div>

                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">display name</div>
                  <input className="w-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)] focus:border-[color:var(--color-neon)] outline-none px-4 py-3 rounded-xl text-sm text-white" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Adaeze Okafor" maxLength={40} />
                </div>

                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">email</div>
                  <div className="flex items-center gap-3 bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)] focus-within:border-[color:var(--color-neon)] rounded-xl px-4 py-3 transition">
                    <Mail size={14} className="text-[color:var(--color-ink-3)]" />
                    <input className="flex-1 bg-transparent outline-none text-white text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--color-ink-3)]">We&apos;ll email you a one-time code — no password, ever.</p>
                </div>

                <button className="btn-primary w-full justify-center !py-4 !text-base disabled:opacity-50" disabled={status !== "available" || !email.includes("@") || submitting} onClick={sendCode}>
                  {submitting ? "Sending code…" : "Email me a code"} <ArrowRight size={16} />
                </button>
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card p-7 space-y-6">
                <p className="text-sm text-[color:var(--color-ink-2)]">We sent a 6-digit code to <span className="text-white font-medium">{email}</span>. Enter it to claim <span className="text-[color:var(--color-neon)]">@{normalized}</span>.</p>

                {devCode && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">Dev delivery — your code is <span className="font-mono text-sm tracking-widest text-white">{devCode}</span></div>
                )}

                <input className="w-full bg-black border border-[color:var(--color-line)] focus:border-[color:var(--color-neon)] outline-none px-4 py-4 rounded-xl text-center font-mono text-2xl tracking-[0.5em] text-white" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" inputMode="numeric" autoFocus />

                <button className="btn-primary w-full justify-center !py-4 disabled:opacity-50" disabled={code.length !== 6 || submitting} onClick={verifyAndClaim}>
                  {submitting ? "Claiming…" : `Verify & claim @${normalized}`} <Sparkles size={14} />
                </button>

                <div className="flex items-center justify-between text-xs text-[color:var(--color-ink-3)]">
                  <button className="hover:text-white" onClick={() => setStep("form")}>← change email</button>
                  <button className="hover:text-white" onClick={sendCode}>resend code</button>
                </div>
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
              </motion.div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card p-7">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-4">why @handles</div>
              <h3 className="text-display text-2xl text-white mb-3">The rails are free.<br /><em className="italic font-light text-[color:var(--color-ink-2)]">The names are the business.</em></h3>
              <p className="text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">Your @handle is your storefront, your tip jar, and your payroll address. One primitive — pay a @username — carried across every flow.</p>
              <div className="mt-6 grid grid-cols-3 gap-px bg-[color:var(--color-line)] rounded-xl overflow-hidden border border-[color:var(--color-line)]">
                {[{ k: "0%", v: "fee" }, { k: "~1s", v: "confirm" }, { k: "8bps", v: "network" }].map((s) => (
                  <div key={s.k} className="bg-black px-3 py-3 text-center"><div className="text-display text-lg text-white">{s.k}</div><div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mt-0.5">{s.v}</div></div>
                ))}
              </div>
            </div>
            <div className="card p-5 flex items-start gap-3 text-[12px] text-[color:var(--color-ink-2)]"><ShieldCheck size={14} className="text-[color:var(--color-neon)] mt-0.5 shrink-0" /><span>Keys never leave your browser. Non-custodial. Session HMAC + injected EIP-1193 wallet on mainnet. Demo wallet is funded with real pathUSD on mainnet.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

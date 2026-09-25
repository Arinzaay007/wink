"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Mail, LogIn, Sparkles } from "lucide-react";
import { BgFx } from "@/components/BgFx";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error("A code was just sent — check your inbox.");
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

  const verify = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === "wrong-code"
            ? "Wrong code — check digits"
            : data.error === "expired"
            ? "Code expired — send new one"
            : data.error === "too-many-attempts"
            ? "Too many tries — send new code"
            : data.error ?? "verification failed";
        throw new Error(msg);
      }
      // fetch me to get handle
      try {
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.handles?.[0]) {
            router.push(`/wink/${me.handles[0]}`);
            return;
          }
        }
      } catch {}
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <BgFx />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-ink-2)] hover:text-white transition mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="chip chip-red mb-6">
              <LogIn size={11} /> /login · sign in
            </div>
            <h1 className="text-display text-[56px] sm:text-[72px] leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">Welcome</span> <em className="italic font-light text-[color:var(--color-ink-2)]">back</em>
              <br />
              <span className="neon-text italic font-light">wink</span>
              <span className="text-[color:var(--color-neon)]">.</span>
            </h1>
            <p className="mt-6 text-[color:var(--color-ink-2)] max-w-md leading-relaxed">
              Sign in with email — no password. We'll take you straight to your live pay page.
            </p>

            {step === "form" ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card p-7 space-y-6">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-2">email</div>
                  <div className="flex items-center gap-3 bg-[color:var(--color-surface-2)] border border-[color:var(--color-line)] focus-within:border-[color:var(--color-neon)] rounded-xl px-4 py-3 transition">
                    <Mail size={14} className="text-[color:var(--color-ink-3)]" />
                    <input
                      className="flex-1 bg-transparent outline-none text-white text-sm"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  className="btn-primary w-full justify-center !py-4 !text-base disabled:opacity-50"
                  disabled={!email.includes("@") || submitting}
                  onClick={sendCode}
                >
                  {submitting ? "Sending code…" : "Send code"} <ArrowRight size={16} />
                </button>

                <div className="text-xs text-[color:var(--color-ink-3)] text-center">
                  No account?{" "}
                  <Link href="/claim" className="text-[color:var(--color-neon)] hover:text-white">
                    Claim @handle
                  </Link>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card p-7 space-y-6">
                <p className="text-sm text-[color:var(--color-ink-2)]">
                  Code sent to <span className="text-white font-medium">{email}</span>. Enter it to sign in.
                </p>

                {devCode && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
                    Dev code: <span className="font-mono text-sm tracking-widest text-white">{devCode}</span>
                  </div>
                )}

                <input
                  className="w-full bg-black border border-[color:var(--color-line)] focus:border-[color:var(--color-neon)] outline-none px-4 py-4 rounded-xl text-center font-mono text-2xl tracking-[0.5em] text-white"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  autoFocus
                />

                <button
                  className="btn-primary w-full justify-center !py-4 disabled:opacity-50"
                  disabled={code.length !== 6 || submitting}
                  onClick={verify}
                >
                  {submitting ? "Signing in…" : "Sign in"} <Sparkles size={14} />
                </button>

                <div className="flex items-center justify-between text-xs text-[color:var(--color-ink-3)]">
                  <button className="hover:text-white" onClick={() => setStep("form")}>
                    ← change email
                  </button>
                  <button className="hover:text-white" onClick={sendCode}>
                    resend code
                  </button>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
              </motion.div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card p-7">
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-3)] mb-4">what happens next</div>
              <h3 className="text-display text-2xl text-white mb-3">
                Your live page.
                <br />
                <em className="italic font-light text-[color:var(--color-ink-2)]">Instantly.</em>
              </h3>
              <p className="text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">
                After sign in, we take you to your own <span className="text-white">/wink/@handle</span> — your public pay page. Anyone can pay you there, any chain in, Tempo out.
              </p>
              <div className="mt-6 space-y-2 text-[12px] font-mono">
                <div className="flex justify-between bg-black border border-[color:var(--color-line)] rounded-lg px-3 py-2">
                  <span className="text-[color:var(--color-ink-3)]">/wink/demo</span>
                  <span className="text-[color:var(--color-neon)]">→ live demo</span>
                </div>
                <div className="flex justify-between bg-black border border-[color:var(--color-line)] rounded-lg px-3 py-2">
                  <span className="text-[color:var(--color-ink-3)]">/dashboard</span>
                  <span className="text-white">→ your earnings</span>
                </div>
                <div className="flex justify-between bg-black border border-[color:var(--color-line)] rounded-lg px-3 py-2">
                  <span className="text-[color:var(--color-ink-3)]">/wallet</span>
                  <span className="text-white">→ balances</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

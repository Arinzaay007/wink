"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "failed");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* minimal top bar — no links to real app */}
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[color:var(--color-neon)] flex items-center justify-center text-white font-display text-lg">w</div>
          <span className="font-display text-lg tracking-[-0.02em]">wink</span>
          <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full border border-[color:var(--color-line)] text-[color:var(--color-ink-3)] font-mono uppercase tracking-[0.16em]">waitlist</span>
        </div>
        <div className="text-mono text-[10px] text-[color:var(--color-ink-3)]">live on Tempo mainnet · pathUSD</div>
      </div>

      <div className="flex-1 flex items-center">
        <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8 py-12 md:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--color-neon-soft)] border border-[rgba(255,31,61,0.2)] text-[11px] font-mono uppercase tracking-[0.16em] text-[color:var(--color-neon)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-neon)] animate-pulse" /> invite-only · early access
            </div>

            <h1 className="mt-6 font-display text-[48px] sm:text-[64px] md:text-[72px] leading-[0.9] tracking-[-0.04em]">
              <span className="text-white">Pay a</span> <em className="italic font-light text-[color:var(--color-neon)]">@username</em>
              <br />
              <span className="text-white">any chain</span>
              <br />
              <em className="italic font-light text-[color:var(--color-ink-2)]">in, Tempo</em> <span className="text-white">out.</span>
            </h1>

            <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--color-ink-2)] max-w-md">
              Wink is the name layer for payments. One handle → same address on Base, Ethereum, Arbitrum, Optimism, Polygon, Tempo. Send USDC anywhere, recipient gets pathUSD on Tempo.
              <br />
              <br />
              <span className="text-white">No wallet address to copy. No chain to pick. Just a wink.</span>
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {["Base", "Ethereum", "Arbitrum", "Optimism", "Polygon", "→", "Tempo"].map((c) => (
                <span
                  key={c}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                    c === "→"
                      ? "border-transparent text-[color:var(--color-neon)]"
                      : c === "Tempo"
                      ? "bg-[color:var(--color-neon)] text-white border-[color:var(--color-neon)]"
                      : "bg-white/[0.04] border-[color:var(--color-line)] text-[color:var(--color-ink-2)]"
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-10 text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)]">
              0% platform fee · ~$0.008 network · verified on-chain
            </div>
          </div>

          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-7 md:p-8 bg-[#0a0a0c] border-[color:var(--color-line)]">
              {status === "done" ? (
                <div className="text-center py-8">
                  <div className="text-4xl">😉✨</div>
                  <h3 className="mt-4 font-display text-2xl text-white">You're on the list</h3>
                  <p className="mt-2 text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">
                    We saved <span className="text-white font-mono">{email}</span>. We'll email you when your invite is ready. No spam, just one email.
                  </p>
                  <div className="mt-6 text-mono text-[10px] text-[color:var(--color-ink-3)]">Check your inbox · noreply@winkpay.xyz</div>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-2xl text-white leading-tight">Join the waitlist</h3>
                  <p className="mt-2 text-[13px] text-[color:var(--color-ink-2)] leading-relaxed">
                    Early access to wink handles. No wallet needed to join. We'll email your invite.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div>
                      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-1.5">email</div>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        className="input !py-3 !text-[14px]"
                        onKeyDown={(e) => e.key === "Enter" && join()}
                      />
                    </div>

                    <button onClick={join} disabled={status === "loading"} className="btn-primary w-full justify-center !py-3.5 !text-[14px] disabled:opacity-50">
                      {status === "loading" ? "Joining…" : "Join waitlist — it's free"}
                    </button>

                    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">{error}</div>}

                    <div className="text-[10px] text-[color:var(--color-ink-3)] leading-relaxed text-center">
                      By joining, you agree to get one invite email. No Telegram, no spam. Email only.
                    </div>
                  </div>

                  <div className="mt-8 border-t border-[color:var(--color-line)] pt-6">
                    <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-3)] mb-3">what you get</div>
                    <div className="space-y-2.5 text-[12px] text-[color:var(--color-ink-2)]">
                      <div className="flex gap-2"><span className="text-[color:var(--color-neon)]">01</span><span><span className="text-white">@handle</span> — your payment name, same address everywhere</span></div>
                      <div className="flex gap-2"><span className="text-[color:var(--color-neon)]">02</span><span><span className="text-white">Any chain in</span> — USDC on Base/Eth/Arb/Op/Poly → pathUSD on Tempo</span></div>
                      <div className="flex gap-2"><span className="text-[color:var(--color-neon)]">03</span><span><span className="text-white">Send to any wallet</span> — wink handle or plain 0x, recipient doesn't need wink</span></div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            <div className="mt-4 text-center text-mono text-[10px] text-[color:var(--color-ink-3)]">
              waitlist.winkpay.xyz · isolated · no login required · main app at winkpay.xyz
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8 py-8 border-t border-[color:var(--color-line)] flex items-center justify-between text-mono text-[10px] text-[color:var(--color-ink-3)]">
        <span>© 2026 Wink · live on Tempo mainnet</span>
        <span>0% fee · non-custodial · email only</span>
      </div>
    </div>
  );
}

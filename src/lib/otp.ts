/**
 * Email one-time codes — pure logic (no db, no io), fully unit-tested.
 *
 * Design:
 *  - 6-digit code from crypto.randomInt (uniform, no modulo bias)
 *  - stored only as sha256 hex; plaintext exists solely in the email
 *  - 10-minute TTL, 5 attempts per code, single-use, 30s resend cooldown
 */
import { createHash, randomInt } from "crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Strict 6-digit check — rejects spaces, letters, +/-, unicode digits. */
export function isValidCodeFormat(code: unknown): code is string {
  return typeof code === "string" && /^[0-9]{6}$/.test(code);
}

export type OtpCheckResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "too-many-attempts" | "wrong-code" };

/**
 * Evaluate a verification attempt against a stored code row. Pure — the
 * caller owns side effects (incrementing attempts, consuming the code).
 */
export function evaluateOtp(
  row: { codeHash: string; expiresAt: Date; attempts: number; consumedAt: Date | null },
  code: string,
  now: number = Date.now()
): OtpCheckResult {
  if (row.consumedAt) return { ok: false, reason: "wrong-code" };
  if (now > row.expiresAt.getTime()) return { ok: false, reason: "expired" };
  if (row.attempts >= OTP_MAX_ATTEMPTS)
    return { ok: false, reason: "too-many-attempts" };
  return hashCode(code) === row.codeHash
    ? { ok: true }
    : { ok: false, reason: "wrong-code" };
}

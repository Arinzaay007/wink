/**
 * Mailer — pluggable email delivery for OTP codes.
 *
 *   RESEND_API_KEY set  → real email via Resend (no SDK needed, one POST)
 *   otherwise           → dev delivery: the code is surfaced to the UI
 *                         (never in production builds)
 *
 * The §9C gate is satisfied by construction: there is no code path where
 * production signs anyone in without a delivered, verified code.
 */
export type MailResult =
  | { mode: "email" }
  | { mode: "dev"; devCode: string }
  | { mode: "unconfigured" };

const FROM = process.env.WINK_MAIL_FROM || "Wink <onboarding@resend.dev>";

export async function sendOtpEmail(
  email: string,
  code: string
): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;

  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `Your Wink code: ${code}`,
        html: `<p style="font-family:Georgia,serif;font-size:16px">
          Your Wink sign-in code is
          <strong style="font-size:22px;letter-spacing:2px">${code}</strong>.</p>
          <p style="color:#777;font-size:13px">It expires in 10 minutes.
          If you didn't ask for it, ignore this email.</p>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`mailer-failed: ${res.status} ${body.slice(0, 200)}`);
    }
    return { mode: "email" };
  }

  // No provider configured. Dev only: surface the code so the demo keeps
  // its 20-second flow. Production refuses rather than weaken the gate.
  if (process.env.NODE_ENV === "production") return { mode: "unconfigured" };
  console.log(`📮 [dev mailer] OTP for ${email}: ${code}`);
  return { mode: "dev", devCode: code };
}

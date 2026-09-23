import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import PayrollForm from "@/components/PayrollForm";

export const dynamic = "force-dynamic";

/**
 * Batch payroll — the payouts wedge at scale. Paste a list, pay everyone,
 * each payment its own verified on-chain transfer. Sign-in required:
 * payroll is a company act, not a guest act.
 */
export default async function PayrollPage() {
  const sessionId = await getSessionUserId();

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="text-center">
        <div className="text-5xl">💼</div>
        <h1 className="mt-4 text-2xl font-bold">Batch payroll</h1>
        <p className="mt-2 text-sm text-ink-300">
          Pay your whole remote team in one run — every worker gets paid to
          their @handle, settled on Tempo, each with its own on-chain proof.
        </p>
      </div>

      <div className="mt-8">
        {sessionId ? (
          <PayrollForm />
        ) : (
          <div className="card p-6 text-center">
            <div className="text-4xl">🔐</div>
            <h3 className="mt-3 text-lg font-bold">Sign in to run payroll</h3>
            <p className="mt-1 text-sm text-ink-300">
              Payroll is a company act — takes 10 seconds to get an account.
            </p>
            <Link href="/dashboard" className="btn-primary mt-5">
              Sign in →
            </Link>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-500">
        0% platform fee · workers receive exactly what you send · settle in ~500ms each
      </p>
    </div>
  );
}

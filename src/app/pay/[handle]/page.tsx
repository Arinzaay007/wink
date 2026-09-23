import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames, users, payCodes } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import TipForm from "@/components/TipForm";
import BridgePanel from "@/components/BridgePanel";

export const dynamic = "force-dynamic";

/**
 * The merchant front door. What a QR pay code points to.
 *
 * Three flavors, one primitive (pay a @username):
 *   /pay/<handle>                    → open amount (counter card / tip jar)
 *   /pay/<handle>?amt=5&memo=INV-001 → fixed amount, stateless + printable
 *   /pay/<handle>?code=pc_xxx        → dashboard-created code (DB-backed)
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ amt?: string; memo?: string; code?: string }>;
}) {
  const { handle: raw } = await params;
  const { amt, memo, code } = await searchParams;
  const handle = normalizeHandle(raw);
  const db = getDb();

  if (!db) {
    return (
      <div className="py-20 text-center text-ink-300">
        <p>⚠️ Database not configured yet.</p>
      </div>
    );
  }

  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });

  if (!name) {
    return (
      <div className="py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold">@{handle} hasn&apos;t been claimed yet</h1>
        <p className="mt-2 text-ink-300">This handle is still up for grabs. It could be yours.</p>
        <Link href="/claim" className="btn-primary mt-6">
          Claim @{handle}
        </Link>
      </div>
    );
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, name.userId) });
  if (!user) notFound();

  // resolve payment parameters — dashboard code wins over raw query params
  let fixedMicro: number | undefined;
  let invoiceRef: string | undefined;
  let payCodeSlug: string | undefined;
  let codeNote: string | undefined;

  if (code) {
    const pc = await db.query.payCodes.findFirst({ where: eq(payCodes.slug, code) });
    if (!pc || pc.ownerId !== user.id) {
      return (
        <div className="py-24 text-center">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-4 text-2xl font-bold">That pay code isn&apos;t valid</h1>
          <p className="mt-2 text-ink-300">
            It may have been removed, or belongs to someone else.
          </p>
        </div>
      );
    }
    fixedMicro = pc.amountMicro ?? undefined;
    invoiceRef = pc.memo ?? undefined;
    payCodeSlug = pc.slug;
    codeNote = pc.note ?? undefined;
  } else if (amt) {
    const dollars = parseFloat(amt);
    if (!isFinite(dollars) || dollars < 0.1 || dollars > 1_000_000) {
      return (
        <div className="py-24 text-center">
          <div className="text-5xl">🤨</div>
          <h1 className="mt-4 text-2xl font-bold">Invalid amount in this pay link</h1>
        </div>
      );
    }
    fixedMicro = Math.round(dollars * 1_000_000);
    invoiceRef = memo || undefined;
  }

  const initials = (user.displayName ?? handle).slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-md py-10">
      {/* merchant identity */}
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-wink to-wink-deep text-2xl font-black text-ink-950">
          {initials}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{user.displayName}</h1>
        <p className="text-wink">@{handle}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-ink-400">
          ⚡ Wink pay code · settles on Tempo · no fees
        </p>
        {codeNote && (
          <p className="mt-3 text-sm text-ink-300">🧾 {codeNote}</p>
        )}
      </div>

      <div className="mt-8">
        <TipForm
          handle={handle}
          recipientName={user.displayName ?? handle}
          mode="pay"
          payCodeSlug={payCodeSlug}
          fixedAmountMicro={fixedMicro}
          invoiceRef={invoiceRef}
        />
        <BridgePanel handle={handle} />
      </div>

      <p className="mt-6 text-center text-xs text-ink-500">
        Paying with stablecoins on Tempo — instant, on-chain, zero fees.{" "}
        <Link href="/claim" className="text-wink underline-offset-2 hover:underline">
          Get your own pay code →
        </Link>
      </p>
    </div>
  );
}

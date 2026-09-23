import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames, users } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import { getSessionUserId } from "@/lib/session";
import RequestForm from "@/components/RequestForm";

export const dynamic = "force-dynamic";

/**
 * The payouts front door: a worker asks a @handle to pay them.
 * Creating a request requires sign-in (requests need identity on
 * both ends); settling one rides the same wink rails as everything else.
 */
export default async function RequestPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
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

  const sessionId = await getSessionUserId();
  const initials = (user.displayName ?? handle).slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-wink to-wink-deep text-2xl font-black text-ink-950">
          {initials}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{user.displayName}</h1>
        <p className="text-wink">@{handle}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-ink-400">
          💸 Wink pay request · they approve, you get paid
        </p>
      </div>

      <div className="mt-8">
        {sessionId ? (
          <RequestForm handle={handle} />
        ) : (
          <div className="card p-6 text-center">
            <div className="text-4xl">🔐</div>
            <h3 className="mt-3 text-lg font-bold">Sign in to request payment</h3>
            <p className="mt-1 text-sm text-ink-300">
              Money requests need an identity on both ends — takes 10 seconds.
            </p>
            <Link href="/dashboard" className="btn-primary mt-5">
              Sign in →
            </Link>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-500">
        One tap for them to approve — settles on Tempo, instant and fee-free.
      </p>
    </div>
  );
}

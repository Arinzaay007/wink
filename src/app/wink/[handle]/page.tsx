import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames, users, transfers } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import { formatMicro } from "@/lib/tempo";
import TipForm from "@/components/TipForm";

export const dynamic = "force-dynamic";

export default async function WinkPage({
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
        <p className="mt-2 text-sm text-ink-500">
          Add <code className="text-wink">DATABASE_URL</code> to <code>.env</code> (Neon Postgres)
          and run <code>npm run db:push</code>.
        </p>
      </div>
    );
  }

  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });

  // unclaimed handle → growth loop
  if (!name) {
    return (
      <div className="py-24 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 text-2xl font-bold">
          @{handle} hasn&apos;t been claimed yet
        </h1>
        <p className="mt-2 text-ink-300">
          This handle is still up for grabs. It could be yours.
        </p>
        <Link href="/claim" className="btn-primary mt-6">
          Claim @{handle}
        </Link>
      </div>
    );
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, name.userId) });
  if (!user) notFound();

  const amountsPublic = user.privacyAmountsPublic;
  const feedPublic = user.privacyFeedPublic;

  const recent = feedPublic
    ? (
        await db.query.transfers.findMany({
          where: eq(transfers.toUserId, user.id),
          orderBy: desc(transfers.createdAt),
          limit: 8,
        })
      ).filter((t) => t.status === "confirmed")
    : [];

  const initials = (user.displayName ?? handle).slice(0, 2).toUpperCase();

  return (
    <div className="grid gap-8 py-10 md:grid-cols-[1fr_380px]">
      {/* profile + feed */}
      <div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-wink to-wink-deep text-xl font-black text-ink-950">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <p className="text-wink">@{handle}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
            Recent winks
          </h2>
          {!feedPublic ? (
            <p className="mt-4 text-sm text-ink-500">
              🔒 {user.displayName} keeps their wink feed private.
            </p>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">
              No winks yet — be the first to wink @{handle}. 😉
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((t) => (
                <li key={t.id} className="card flex items-center gap-3 px-4 py-3 text-sm">
                  <span>{t.tipperVisibility === "anonymous" ? "🕶️" : "😉"}</span>
                  <span className="flex-1 text-ink-300">
                    {t.tipperVisibility === "anonymous" ? "Someone" : "A supporter"}
                    {t.message ? <> · “{t.message}”</> : null}
                  </span>
                  <span className="mono font-semibold text-mint">
                    {amountsPublic ? `$${formatMicro(t.amountMicro)}` : "🔒"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* the wink form */}
      <div>
        <TipForm handle={handle} recipientName={user.displayName ?? handle} />
        <p className="mt-3 text-center text-xs text-ink-500">
          Settles on Tempo in ~500ms · zero gas for you
        </p>
      </div>
    </div>
  );
}

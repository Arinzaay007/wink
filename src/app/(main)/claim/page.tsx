import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import ClaimClient from "./ClaimClient";

export const dynamic = "force-dynamic";

export default async function ClaimPage() {
  const userId = await getSessionUserId();
  if (userId) {
    const db = getDb();
    if (db) {
      try {
        const existing = await db.query.usernames.findFirst({
          where: eq(usernames.userId, userId),
        });
        if (existing) {
          redirect("/dashboard");
        }
      } catch {}
    }
  }
  return <ClaimClient />;
}

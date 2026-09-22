/**
 * Database connection — Neon Postgres via postgres.js.
 * Returns null when DATABASE_URL is unset so the app can boot in
 * "setup mode" instead of crashing.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type WinkDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: WinkDb | null = null;
let _failed = false;

export function getDb(): WinkDb | null {
  const url = process.env.DATABASE_URL;
  if (!url || _failed) return _db;
  if (!_db) {
    try {
      const client = postgres(url, {
        max: 4,
        ssl: url.includes("localhost") ? false : "require",
        prepare: false, // required for Neon pooled connections
        onnotice: () => {},
      });
      _db = drizzle(client, { schema });
    } catch {
      _failed = true;
      return null;
    }
  }
  return _db;
}

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

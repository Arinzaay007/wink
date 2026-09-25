/**
 * Database connection — postgres.js for both Neon and local.
 * Works on Vercel serverless, no native pg-native.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type WinkDb = PostgresJsDatabase<typeof schema>;

let _db: WinkDb | null = null;
let _failed = false;

export function getDb(): WinkDb | null {
  const url = process.env.DATABASE_URL;
  if (!url || _failed) return _db;
  if (!_db) {
    try {
      const client = postgres(url, { max: 4, idle_timeout: 20, ssl: url.includes("neon.tech") || url.includes("sslmode=require") ? "require" : false });
      _db = drizzle(client, { schema });
    } catch {
      _failed = true;
      return null;
    }
  }
  return _db;
}

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

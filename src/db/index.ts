/**
 * Database connection — Neon serverless (production) or postgres.js (local).
 * Works on Vercel serverless (no native pg-native needed).
 */
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema";

export type WinkDb = NeonHttpDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

let _db: WinkDb | null = null;
let _failed = false;

export function getDb(): WinkDb | null {
  const url = process.env.DATABASE_URL;
  if (!url || _failed) return _db;
  if (!_db) {
    try {
      if (url.includes("neon.tech") || url.includes("neondb")) {
        // Neon serverless — works on Vercel, no native deps
        const client = neon(url);
        _db = drizzleNeon(client, { schema });
      } else {
        // Local postgres via postgres.js
        const client = postgres(url, { max: 4, idle_timeout: 20 });
        _db = drizzlePg(client, { schema });
      }
    } catch {
      _failed = true;
      return null;
    }
  }
  return _db;
}

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

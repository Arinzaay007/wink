/**
 * Database connection — Neon Postgres (production) or local Postgres (dev).
 * Returns null when DATABASE_URL is unset so the app can boot in
 * "setup mode" instead of crashing.
 *
 * Driver note (hard-won): Neon's new pooler enforces SCRAM channel
 * binding, which none of the pure-JS drivers implement (postgres.js, pg,
 * @neondatabase/serverless all fail auth). libpq does — so we run pg's
 * native (libpq) client. And libpq here must receive keyword-form params;
 * URI-form connections fail auth against the pooler. Hence parseDbUrl().
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type WinkDb = NodePgDatabase<typeof schema>;

let _db: WinkDb | null = null;
let _failed = false;

interface PgConnConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslmode: "require" | "disable";
}

function parseDbUrl(url: string): PgConnConfig {
  const u = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    database: u.pathname.slice(1) || "postgres",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    // no TLS for the local sandbox/dev postgres; required for Neon
    sslmode: local
      ? "disable"
      : (u.searchParams.get("sslmode") as "require" | "disable") ?? "require",
  };
}

export function getDb(): WinkDb | null {
  const url = process.env.DATABASE_URL;
  if (!url || _failed) return _db;
  if (!_db) {
    try {
      const cfg = parseDbUrl(url);
      const native = pg.native;
      if (!native) {
        throw new Error("pg-native unavailable — required for Neon SCRAM auth");
      }
      const pool = new pg.Pool({
        Client: native.Client,
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        password: cfg.password,
        // pg maps `ssl: "require"` to libpq sslmode=require in the
        // conninfo (see pg/lib/connection-parameters.getLibpqConnectionString).
        ssl: cfg.sslmode === "require" ? cfg.sslmode : undefined,
        max: 4,
        idleTimeoutMillis: 20_000, // Neon autosuspends idle computes; drop idle sockets
      });
      _db = drizzle(pool, { schema });
    } catch {
      _failed = true;
      return null;
    }
  }
  return _db;
}

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

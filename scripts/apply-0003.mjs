// One-shot: apply drizzle/0003_bridge_watches.sql to Neon.
// Earlier migrations were applied via `drizzle-kit push`, so there is no
// __drizzle_migrations journal — `db:migrate` replays from 0000 and dies on
// duplicate types. This applies ONLY the new migration, idempotently.
import { readFileSync } from "node:fs";
import pg from "pg";

// load .env (no auto-loading outside Next)
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const u = new URL(url);
const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);

const client = new (pg.native ? pg.native.Client : pg.Client)({
  host: u.hostname,
  port: u.port ? Number(u.port) : 5432,
  database: u.pathname.slice(1) || "postgres",
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  ssl: local ? undefined : { rejectUnauthorized: false },
});

const sql = readFileSync("drizzle/0003_bridge_watches.sql", "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

await client.connect();
console.log("connected to", u.hostname);
for (const stmt of statements) {
  const head = stmt.split("\n")[0].slice(0, 60);
  try {
    await client.query(stmt);
    console.log("  ok   ", head);
  } catch (e) {
    if (/already exists|duplicate/i.test(e.message)) {
      console.log("  skip ", head, "→", e.message.split("\n")[0]);
    } else {
      console.error("  FAIL ", head, "→", e.message);
      process.exit(1);
    }
  }
}
const check = await client.query(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name='bridge_watches'"
);
console.log("bridge_watches present:", check.rows[0].n === 1);
await client.end();

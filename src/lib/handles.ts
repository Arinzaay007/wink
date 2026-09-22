/**
 * Handle rules for the Wink Name System.
 * Format: starts with a letter, then [a-z0-9_], 3–20 chars total.
 * Stored lowercase; display casing is a product-side concern.
 */

export const HANDLE_RE = /^[a-z][a-z0-9_]{2,19}$/;

const RESERVED = new Set([
  // product routes & concepts
  "wink", "winks", "winked", "pay", "claim", "dashboard", "wall", "api",
  "app", "www", "admin", "administrator", "support", "help", "status",
  "about", "blog", "pricing", "terms", "privacy", "security", "login",
  "logout", "signup", "signin", "register", "auth", "account", "settings",
  "profile", "me", "you", "us", "team", "careers", "press", "brand",
  "legal", "docs", "developers", "developers", "api", "webhooks", "mail",
  "email", "billing", "invoices", "fees", "staff", "moderator", "mod",
  "official", "verified", "system", "root", "null", "undefined", "test",
  "demo", "tempo", "pathusd", "spray", "tip", "tips", "tipping",
]);

const PROFANITY_RE = /(f[u*]ck|sh[i*]t|n[i*]gg|c[u*]nt|b[i*]tch|asshole)/;

export interface HandleCheck {
  ok: boolean;
  reason?: "format" | "reserved" | "profanity" | "taken";
}

export function validateHandleFormat(raw: string): HandleCheck {
  const handle = normalizeHandle(raw);
  if (!HANDLE_RE.test(handle)) return { ok: false, reason: "format" };
  if (RESERVED.has(handle)) return { ok: false, reason: "reserved" };
  if (PROFANITY_RE.test(handle)) return { ok: false, reason: "profanity" };
  return { ok: true };
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

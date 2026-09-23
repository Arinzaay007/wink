/**
 * Telegram surface — pure logic shared by the API routes and the bot.
 *
 * Design notes (company-safe):
 * - Linking is user-initiated from the app: a signed-in owner mints a
 *   one-time code, then redeems it with `/link <code>` in the bot. The
 *   bot can never bind a chat to a handle it doesn't own.
 * - The bot only READS the ledger to notify ("you've been winked 😉")
 *   and reads public on-chain balances. It never holds keys or signs.
 */
import { formatMicro } from "@/lib/tempo";
import { normalizeHandle } from "@/lib/handles";

export const LINK_CODE_TTL_MIN = 15;

// Unambiguous alphabet (no 0/O, 1/I/L) — codes are read from a screen.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Mint a one-time link code like `WK-ABCD-2345`. Canonical form is fully
 * uppercase (the bot uppercases user input before matching). */
export function generateLinkCode(
  rand: () => number = Math.random
): string {
  const pick = () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  const block = (n: number) => Array.from({ length: n }, pick).join("");
  return `WK-${block(4)}-${block(4)}`;
}

export function isValidLinkCode(code: string): boolean {
  const c = code.trim().toUpperCase();
  return /^WK-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/.test(c);
}

const KIND_VERB: Record<string, string> = {
  wink: "You've been winked 😉",
  sale: "Payment received 💳",
  wage: "Payout arrived 💼",
  agent: "An agent paid you 🤖",
};

export interface NotificationInput {
  kind: string;
  amountMicro: number;
  /** null when the tipper chose to stay anonymous (or guest on a wall) */
  senderHandle: string | null;
  senderName: string | null;
  message: string | null;
  txHash: string | null;
  explorerUrl: string;
}

/** Compose the DM a recipient gets when money lands. */
export function formatWinkNotification(n: NotificationInput): string {
  const headline = KIND_VERB[n.kind] ?? KIND_VERB.wink;
  const who =
    n.senderHandle !== null
      ? `from @${n.senderHandle}`
      : n.senderName
        ? `from ${n.senderName}`
        : "from someone";
  const lines = [`${headline}`, `$${formatMicro(n.amountMicro)} ${who}`];
  if (n.message) lines.push(`“${n.message}”`);
  if (n.txHash) lines.push(`Verified on-chain ✅ ${n.explorerUrl}/tx/${n.txHash}`);
  return lines.join("\n");
}

export interface ParsedWink {
  handle: string;
  amountMicro: number;
  message: string | null;
}

export const WINK_MIN_MICRO = 100_000; // $0.10
export const WINK_MAX_MICRO = 500_000_000; // $500

/**
 * Parse a `/wink @handle $5.50 nice set!` style command body.
 * Returns either a validated ParsedWink or a human-readable error.
 */
export function parseWinkCommand(
  body: string
): { ok: true; wink: ParsedWink } | { ok: false; error: string } {
  const tokens = body.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return {
      ok: false,
      error: "Usage: /wink @handle $amount [message]\nExample: /wink @adaeze $5 Great set! 🙌",
    };
  }
  const handle = normalizeHandle(tokens[0]);
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(handle)) {
    return { ok: false, error: `“${tokens[0]}” doesn't look like a @handle.` };
  }
  const rawAmount = tokens[1].replace(/^\$/, "");
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: `“${tokens[1]}” isn't a valid amount. Try $5 or $2.50.` };
  }
  const amountMicro = Math.round(amount * 1_000_000);
  if (amountMicro < WINK_MIN_MICRO) {
    return { ok: false, error: "Minimum wink is $0.10." };
  }
  if (amountMicro > WINK_MAX_MICRO) {
    return { ok: false, error: "Telegram winks are capped at $500 for now." };
  }
  const message =
    tokens
      .slice(2)
      .join(" ")
      .slice(0, 140)
      .trim() || null;
  return { ok: true, wink: { handle, amountMicro, message } };
}

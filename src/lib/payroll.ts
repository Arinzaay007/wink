/**
 * Payroll line parsing — shared between the form and the test suite.
 * One line per worker:  @handle amount memo (optional).
 * Blank lines and `#` comments are skipped.
 */

export type PayrollRowStatus =
  | "draft"
  | "checking"
  | "ready"
  | "unknown-handle"
  | "bad-line"
  | "paying"
  | "confirmed"
  | "failed";

export interface PayrollRow {
  handle: string;
  dollars: number;
  memo: string;
  status: PayrollRowStatus;
  error?: string;
}

export function parsePayrollLines(text: string): PayrollRow[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((line) => {
      const m = line.match(/^@?([a-z0-9_]{1,30})\s+(\d+(?:\.\d{1,2})?)\s*(.*)$/i);
      if (!m) return { handle: "", dollars: 0, memo: line, status: "bad-line" as PayrollRowStatus };
      return {
        handle: m[1].toLowerCase(),
        dollars: parseFloat(m[2]),
        memo: m[3].trim(),
        status: "draft" as PayrollRowStatus,
      };
    });
}

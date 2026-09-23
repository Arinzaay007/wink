import { describe, it, expect } from "vitest";
import { parsePayrollLines } from "@/lib/payroll";

describe("parsePayrollLines", () => {
  it("parses @handle, amount, and memo", () => {
    const rows = parsePayrollLines("@arinzaay 250 Landing page design");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      handle: "arinzaay",
      dollars: 250,
      memo: "Landing page design",
      status: "draft",
    });
  });

  it("accepts a missing @ and lowercases the handle", () => {
    const [r] = parsePayrollLines("Adaeze 5.50 tip");
    expect(r.handle).toBe("adaeze");
    expect(r.dollars).toBe(5.5);
  });

  it("allows an empty memo", () => {
    const [r] = parsePayrollLines("@ngozi 8");
    expect(r.memo).toBe("");
    expect(r.status).toBe("draft");
  });

  it("skips blank lines and # comments", () => {
    const rows = parsePayrollLines("\n# payroll run\n\n@ngozi 8\n   \n");
    expect(rows).toHaveLength(1);
    expect(rows[0].handle).toBe("ngozi");
  });

  it("flags unparseable lines as bad-line", () => {
    const rows = parsePayrollLines("not a valid line\n@ok 10");
    expect(rows[0].status).toBe("bad-line");
    expect(rows[1].status).toBe("draft");
  });

  it("flags a lone token (no amount) as bad-line", () => {
    const [r] = parsePayrollLines("justtext");
    expect(r.status).toBe("bad-line");
  });
});

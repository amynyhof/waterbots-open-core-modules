import { describe, it, expect } from "vitest";
import { TABLE_9_HOUSEHOLD, SUPPRESSED_DEMAND_FACTOR, resolveAgeShares, table9Volume } from "./table9";

describe("Table 9 (V2 §7.3.11, p.31) — tiers, caps, the one ×0.95", () => {
  it("carries the three household rows as printed", () => {
    expect(TABLE_9_HOUSEHOLD.map((t) => [t.key, t.defaultLPerPersonPerDay, t.capLPerPersonPerDay])).toEqual([
      ["under5", 0.9, 1.3], ["age5_18", 3.0, 4.5], ["adult19plus", 4.0, 5.5],
    ]);
    expect(SUPPRESSED_DEMAND_FACTOR).toBe(0.95);
  });

  it("Malawi: national shares from the single-age file, weighted default 3.2029 L/p/d", () => {
    const s = resolveAgeShares("MWI");
    expect(s.source).toBe("country");
    expect([s.under5, s.age5_18, s.adult19plus]).toEqual([0.1445, 0.3591, 0.4964]);
    const v = table9Volume(s);
    // 0.1445·0.9 + 0.3591·3.0 + 0.4964·4.0 = 0.13005 + 1.0773 + 1.9856
    expect(v.qpwWeighted).toBeCloseTo(3.19295, 6);
    expect(v.suppressedDemandApplied).toBe(false);
  });

  it("suppressed demand multiplies the DEFAULT tiers by 0.95 exactly once, never a measured tier", () => {
    const s = resolveAgeShares("MWI");
    const on = table9Volume(s, { suppressedDemand: true });
    expect(on.qpwWeighted).toBeCloseTo(3.19295 * 0.95, 6);
    const measured = table9Volume(s, { suppressedDemand: true, perTier: { adult19plus: 4.4 } });
    expect(measured.tiers.find((t) => t.key === "adult19plus")!.volume).toBe(4.4); // not × 0.95
    expect(measured.tiers.find((t) => t.key === "under5")!.volume).toBeCloseTo(0.9 * 0.95, 9);
  });

  it("caps every tier (SDWS 29: in all cases) and flags it", () => {
    const v = table9Volume({ under5: 0.2, age5_18: 0.3, adult19plus: 0.5 }, { perTier: { under5: 2.0, adult19plus: 7 } });
    expect(v.tiers.find((t) => t.key === "under5")).toMatchObject({ volume: 1.3, capApplied: true });
    expect(v.tiers.find((t) => t.key === "adult19plus")).toMatchObject({ volume: 5.5, capApplied: true });
  });

  it("falls back to the labelled global default for an unknown country; entered shares win", () => {
    const g = resolveAgeShares("XXX");
    expect(g.source).toBe("global-default");
    expect(g.label).toContain("no national row for XXX");
    const e = resolveAgeShares("MWI", { under5: 0.1, age5_18: 0.4, adult19plus: 0.5 });
    expect(e.source).toBe("entered");
    expect(() => table9Volume({ under5: 0.5, age5_18: 0.5, adult19plus: 0.5 })).toThrow(/sum to 1/);
  });
});

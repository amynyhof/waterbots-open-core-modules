import { describe, it, expect } from "vitest";
import { computeEfb } from "./baseline-ef";
// THE CHARCOAL GUARD ([#213], 2026-09-21). V2 SDWS 9 (p.51) / SDWS 10 (p.52) changed the charcoal
// factors; V1's 165.22 / 44.83 (p.24) is none of V2's three. A v2.0 run may only carry a charcoal
// entry that names its V2 convention and holds that convention's figures.
describe("computeEfb — the V2 charcoal guard", () => {
  const strata = [{ share: 1, eta: 0.15 }];
  const wood = { fuel: "wood", energyFraction: 0.8, ef_co2: 112, ef_nonco2: 9.46 };
  it("refuses a v2.0 run whose charcoal entry names no V2 convention", () => {
    const v1charcoal = { fuel: "charcoal", energyFraction: 0.2, ef_co2: 165.22, ef_nonco2: 44.83 };
    expect(() => computeEfb(360.83, 0.5, strata, [wood, v1charcoal], "paa")).toThrow(/no V2 convention/);
    // the same mix is fine on a legacy run — V1's own factors
    expect(computeEfb(360.83, 0.5, strata, [wood, v1charcoal], "legacy").EF_b).toBeGreaterThan(0);
  });
  it("refuses a v2.0 charcoal entry whose factors are not the named convention's", () => {
    const wrong = { fuel: "charcoal", energyFraction: 0.2, ef_co2: 165.22, ef_nonco2: 44.83, v2Charcoal: "6:1" as const };
    expect(() => computeEfb(360.83, 0.5, strata, [wood, wrong], "paa")).toThrow(/V2 SDWS 9\/10 give 355.36\/89.68/);
  });
  it("accepts each V2 convention with its own figures, and wood needs nothing", () => {
    for (const [c, co2, non] of [["combustion-only", 112, 5.87], ["6:1", 355.36, 89.68], ["4:1", 236.91, 61.74]] as const) {
      const ok = { fuel: "charcoal", energyFraction: 0.2, ef_co2: co2, ef_nonco2: non, v2Charcoal: c };
      expect(computeEfb(360.83, 0.5, strata, [wood, ok], "paa").EF_b).toBeGreaterThan(0);
    }
    expect(computeEfb(360.83, 0.5, strata, [{ ...wood, energyFraction: 1 }], "paa").EF_b).toBeGreaterThan(0);
  });
});

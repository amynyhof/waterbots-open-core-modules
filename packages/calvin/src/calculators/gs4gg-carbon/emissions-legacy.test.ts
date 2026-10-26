import { describe, it, expect } from "vitest";
import { computeLegacyEr } from "./emissions-legacy";
import type { LegacyErInput } from "./types";

/** A minimal single-fuel, single-stove case with hand-computable arithmetic. */
function simpleInput(overrides: Partial<LegacyErInput> = {}): LegacyErInput {
  return {
    method: 1,
    SE_o: 360,
    fNRB: 0.5,
    stoveStrata: [{ share: 1, eta: 0.2 }],
    fuelMix: [{ fuel: "wood", energyFraction: 1, ef_co2: 100, ef_nonco2: 10 }],
    Q_pop: 1_000_000,
    Q_m: null,
    C_b: 0.1,
    X_cleanboil: 0,
    M_qy: 1,
    ...overrides,
  };
}

describe("computeLegacyEr — hand-verified units", () => {
  it("computes EF_b, BE and ER for a simple case", () => {
    // eta_w=0.2 -> SE=1800; combinedEF=(100*0.5+10)=60; EF_b=1800*60/1e9=1.08e-4
    // BE = 1.08e-4 * (1-0.1) * 1e6 * 1 = 97.2 ; ER = 97.2
    const out = computeLegacyEr(simpleInput());
    expect(out.eta_weighted).toBeCloseTo(0.2, 12);
    expect(out.SE).toBeCloseTo(1800, 9);
    expect(out.combinedEF).toBeCloseTo(60, 12);
    expect(out.EF_b).toBeCloseTo(1.08e-4, 15);
    expect(out.BE).toBeCloseTo(97.2, 9);
    expect(out.ER).toBeCloseTo(97.2, 9);
  });

  it("binds Q_y on the metered value via MIN(Q_pop, Q_m)", () => {
    const out = computeLegacyEr(simpleInput({ Q_pop: 1_000_000, Q_m: 400_000 }));
    expect(out.Q_y).toBe(400_000);
    expect(out.BE).toBeCloseTo(1.08e-4 * 0.9 * 400_000, 9);
  });

  it("treats fossil fuel with full CO2 and no fNRB / no non-CO2", () => {
    const out = computeLegacyEr(
      simpleInput({
        fNRB: 0.5,
        fuelMix: [{ fuel: "lpg", energyFraction: 1, ef_co2: 63, ef_nonco2: 5, fossil: true }],
      }),
    );
    // fossil: combinedEF = 63 (no *fNRB, no +nonCO2)
    expect(out.combinedEF).toBeCloseTo(63, 12);
  });

  it("accepts non-normalized fuel fractions (warns, does not throw)", () => {
    const out = computeLegacyEr(
      simpleInput({
        fuelMix: [
          { fuel: "wood", energyFraction: 0.9, ef_co2: 100, ef_nonco2: 10 },
          { fuel: "charcoal", energyFraction: 0.3, ef_co2: 160, ef_nonco2: 40 },
        ],
      }),
    );
    expect(out.warnings.some((w) => w.includes("multi-fuel stacking"))).toBe(true);
    expect(Number.isFinite(out.ER)).toBe(true);
  });

  it("subtracts PE and LE from BE", () => {
    const out = computeLegacyEr(simpleInput({ PE: 10, LE: 5 }));
    expect(out.ER).toBeCloseTo(out.BE - 15, 9);
  });

  it("applies the flat 5% simplified leakage rule (§2.5), overriding LE", () => {
    const out = computeLegacyEr(simpleInput({ leakageFivePercent: true, LE: 999 }));
    expect(out.LE).toBeCloseTo(0.05 * out.BE, 9);
    expect(out.ER).toBeCloseTo(out.BE * 0.95, 9);
  });

  it("applies the subtractive eligibility bracket (C_b and X_cleanboil)", () => {
    const out = computeLegacyEr(simpleInput({ C_b: 0.06, X_cleanboil: 0.02, M_qy: 0.9 }));
    const eligibility = 1 - 0.06 - 0.02;
    expect(out.BE).toBeCloseTo(out.EF_b * eligibility * out.Q_y * 0.9, 9);
  });
});

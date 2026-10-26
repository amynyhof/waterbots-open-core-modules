import { describe, it, expect } from "vitest";
import { computePaaEr } from "./emissions-paa-v2";
import type { PaaErInput } from "./types";

function paaInput(overrides: Partial<PaaErInput> = {}): PaaErInput {
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
    DAF: 0.1,
    // Option 2 with zero entered isolates the baseline chain in the unit checks below.
    leakage: { option: 2, LE: 0 },
    ...overrides,
  };
}

describe("computePaaEr — hand-verified units (§7)", () => {
  it("runs the 5-step chain with a downward adjustment", () => {
    // EF_b = 1.08e-4; Q_adj = 1e6; BE_u = 1.08e-4*0.9*1e6 = 97.2
    // BE_dn = 97.2*0.9 = 87.48; BE_CB = 87.48; MC = 9.72; ER = 87.48 (no leakage entered)
    const out = computePaaEr(paaInput());
    expect(out.EF_b).toBeCloseTo(1.08e-4, 15);
    expect(out.Q_adj).toBeCloseTo(1_000_000, 6);
    expect(out.BE_u).toBeCloseTo(97.2, 9);
    expect(out.BE_downadj).toBeCloseTo(87.48, 9);
    expect(out.BE_CB).toBeCloseTo(87.48, 9);
    expect(out.MC).toBeCloseTo(9.72, 9);
    expect(out.ER).toBeCloseTo(87.48, 9);
  });

  it("MIN can never select BAU: BE_CB == BE_downadj and MC == 0 at DAF=0", () => {
    const out = computePaaEr(paaInput({ DAF: 0 }));
    expect(out.BE_CB).toBeCloseTo(out.BE_u, 9);
    expect(out.MC).toBeCloseTo(0, 12);
    // and with DAF > 0, BE_CB tracks the down-adjusted value, never BAU
    const out2 = computePaaEr(paaInput({ DAF: 0.25 }));
    expect(out2.BE_CB).toBeCloseTo(out2.BE_downadj, 9);
    expect(out2.BE_CB).toBeLessThan(out2.BE_BAU);
  });

  it("applies the multiplicative Q_adj (X_cleanboil, M_qy)", () => {
    const out = computePaaEr(paaInput({ X_cleanboil: 0.02, M_qy: 0.9, DAF: 0 }));
    expect(out.Q_adj).toBeCloseTo(1_000_000 * 0.98 * 0.9, 6);
    expect(out.BE_u).toBeCloseTo(1.08e-4 * 0.9 * (1_000_000 * 0.98 * 0.9), 9);
  });

  it("applies usage rate U_p for Method 2 only", () => {
    const m2 = computePaaEr(paaInput({ method: 2, U_p: 0.8, DAF: 0 }));
    expect(m2.Q_adj).toBeCloseTo(800_000, 6);
    // Method 1 ignores U_p
    const m1 = computePaaEr(paaInput({ method: 1, U_p: 0.8, DAF: 0 }));
    expect(m1.Q_adj).toBeCloseTo(1_000_000, 6);
  });

  it("binds Q_y on the monitored value for Method 1 only (Eq.4 is CWT/CWS), and rejects negative DAF", () => {
    expect(computePaaEr(paaInput({ Q_m: 400_000 })).Q_y).toBe(400_000);
    // Method 2 (HWT/IWT): Eq.6 has no Q_m cap — SDWS 28 "Applies to CWT and CWS" (V2 p.65).
    expect(computePaaEr(paaInput({ method: 2, Q_m: 400_000 })).Q_y).toBe(1_000_000);
    expect(() => computePaaEr(paaInput({ DAF: -0.1 }))).toThrow(/DAF/);
  });
});

// V2 §9.3.2 (p.38): Option 1, the default, deducts 2% of net reductions — Eq.20
// LE_Market,y = (BE_y − AE_y) × 0.02; Option 2 enters a detailed assessment (Eq.21).
// The review (comment 1.6) found the engine applying no leakage at all.
describe("computePaaEr — market leakage is explicit (§9.3.2, Eq.20–22)", () => {
  it("Option 1 deducts 2% of (BE_CB − AE): 87.48 → LE 1.7496 → ER 85.7304", () => {
    const out = computePaaEr(paaInput({ leakage: { option: 1 } }));
    expect(out.leakageOption).toBe(1);
    expect(out.LE_market).toBeCloseTo(87.48 * 0.02, 9);
    expect(out.LE).toBeCloseTo(1.7496, 9);
    expect(out.ER).toBeCloseTo(87.48 - 1.7496, 9);
  });

  it("Option 1 takes activity emissions off BEFORE the 2% (Eq.20 is on net reductions)", () => {
    const out = computePaaEr(paaInput({ leakage: { option: 1 }, PE: 7.48 }));
    expect(out.LE_market).toBeCloseTo((87.48 - 7.48) * 0.02, 9);
    expect(out.ER).toBeCloseTo(80 - 1.6, 9);
  });

  it("Option 2 uses the entered figure and reports the option", () => {
    const out = computePaaEr(paaInput({ leakage: { option: 2, LE: 3.5 } }));
    expect(out.leakageOption).toBe(2);
    expect(out.LE_market).toBe(3.5);
    expect(out.ER).toBeCloseTo(87.48 - 3.5, 9);
  });

  it("embodied emissions: upfront (Eq.18) and amortised (Eq.19), and a loud zero when absent", () => {
    // 10,000 basic filters × 0.008 tCO2e = 80 upfront; 16 a year amortised over 5 years.
    const up = computePaaEr(paaInput({ leakage: { option: 1 }, embodied: { unitsInYear: 10_000, factor: 0.008, route: "upfront" } }));
    expect(up.LE_embodied).toBeCloseTo(80, 9);
    expect(up.LE_market).toBeCloseTo(1.7496, 9); // Eq.20 is on net reductions, untouched by embodied
    expect(up.LE).toBeCloseTo(81.7496, 9);
    expect(up.ER).toBeCloseTo(87.48 - 81.7496, 9);
    expect(up.warnings.some((w) => /embodied/.test(w))).toBe(false);

    const am = computePaaEr(paaInput({ leakage: { option: 1 }, embodied: { unitsInYear: 10_000, factor: 0.008, route: "amortised" } }));
    expect(am.LE_embodied).toBeCloseTo(16, 9);
    expect(am.ER).toBeCloseTo(87.48 - 1.7496 - 16, 9);

    const none = computePaaEr(paaInput({ leakage: { option: 1 } }));
    expect(none.LE_embodied).toBe(0);
    expect(none.warnings).toContainEqual(expect.stringMatching(/embodied emissions not entered/));

    expect(() => computePaaEr(paaInput({ embodied: { unitsInYear: -1, factor: 0.008, route: "upfront" } }))).toThrow(/embodied/);
  });

  it("refuses to guess: a missing or malformed option throws, never a silent zero", () => {
    const bad = { ...paaInput() } as unknown as Record<string, unknown>;
    delete bad.leakage;
    expect(() => computePaaEr(bad as unknown as PaaErInput)).toThrow(/leakage option must be stated/);
    expect(() => computePaaEr(paaInput({ leakage: { option: 2, LE: -1 } }))).toThrow(/Option 2 leakage/);
  });
});

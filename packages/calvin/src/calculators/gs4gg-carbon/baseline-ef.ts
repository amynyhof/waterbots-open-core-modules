import type { StoveStratum, FuelEntry } from "./types";
import paaFuel from "../data/paa/fuel-factors.json";

type Convention = "combustion-only" | "6:1" | "4:1";
const V2_CHARCOAL = paaFuel.fuels.charcoal as unknown as Record<Convention, { ef_co2: number; ef_nonco2: number }>;

/**
 * THE CHARCOAL GUARD ([#213], Amy's go 2026-09-21). A v2.0 run may only carry a charcoal entry that
 * names its V2 convention and holds that convention's factors (V2 SDWS 9 p.51, SDWS 10 p.52). V1's
 * 165.22 / 44.83 (SDWS 9.2 / 10.2, p.24) is not a V2 value, so a v2.0 figure built on it is refused
 * rather than printed. Wood and fossil fuels are unaffected.
 */
export function assertV2Charcoal(fuelMix: FuelEntry[]): void {
  for (const f of fuelMix) {
    if (!/charcoal/i.test(f.fuel)) continue;
    if (!f.v2Charcoal) {
      throw new Error(
        `v2.0 run: charcoal entry "${f.fuel}" carries no V2 convention (v2Charcoal: combustion-only | 6:1 | 4:1) — V2 SDWS 9 p.51 changed the charcoal factors; V1's 165.22/44.83 may not be used ([#213])`,
      );
    }
    const want = V2_CHARCOAL[f.v2Charcoal];
    if (!want) throw new Error(`v2.0 run: unknown charcoal convention "${String(f.v2Charcoal)}"`);
    if (Math.abs(f.ef_co2 - want.ef_co2) > 1e-9 || Math.abs(f.ef_nonco2 - want.ef_nonco2) > 1e-9) {
      throw new Error(
        `v2.0 run: charcoal entry "${f.fuel}" tagged ${f.v2Charcoal} carries ${f.ef_co2}/${f.ef_nonco2}; V2 SDWS 9/10 give ${want.ef_co2}/${want.ef_nonco2} for that convention ([#213])`,
      );
    }
  }
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export interface EfbResult {
  eta_weighted: number;
  SE: number;
  combinedEF: number;
  EF_b: number;
  warnings: string[];
}

/**
 * Baseline EF per litre (§2.1) — shared by the legacy and PAA calculators.
 *
 *   eta_weighted = Σ(share·η) / Σ(share)         (normalized)
 *   SE           = SE_o / eta_weighted            (kJ/L)
 *   combinedEF   = Σ_fuel (EF_CO2·fNRB + EF_nonCO2)·energyFraction   (tCO2/TJ)
 *                  fossil fuels: full CO2 (no fNRB), non-CO2 omitted
 *   EF_b         = SE · combinedEF / 1e9          (tCO2e/L)
 *
 * Fuel-energy fractions are NOT normalized — multi-fuel stacking legitimately sums
 * > 1 (warn, don't block; §2.6). Confirmed against the ER tool.
 */
export function computeEfb(
  SE_o: number,
  fNRB: number,
  stoveStrata: StoveStratum[],
  fuelMix: FuelEntry[],
  /**
   * The rulebook the run is under. On "paa", every charcoal entry must carry `v2Charcoal` AND its
   * factors must be that convention's (V2 SDWS 9/10); anything else throws. V2 changed the charcoal
   * factors and the presets carried V1's for both versions until 2026-09-21 ([#213]).
   */
  version: "legacy" | "paa" = "legacy",
): EfbResult {
  const warnings: string[] = [];
  if (version === "paa") assertV2Charcoal(fuelMix);

  const shareSum = sum(stoveStrata.map((s) => s.share));
  if (shareSum <= 0) throw new Error("stoveStrata shares must sum to > 0");
  const eta_weighted = sum(stoveStrata.map((s) => s.share * s.eta)) / shareSum;
  if (eta_weighted <= 0) throw new Error("weighted efficiency must be > 0");
  const SE = SE_o / eta_weighted;

  const energySum = sum(fuelMix.map((f) => f.energyFraction));
  if (Math.abs(energySum - 1) > 1e-6) {
    warnings.push(
      `fuel energy fractions sum to ${energySum.toFixed(4)} (not 1) — multi-fuel stacking; accepted per §2.6`,
    );
  }
  const combinedEF = sum(
    fuelMix.map((f) => {
      const co2 = f.fossil ? f.ef_co2 : f.ef_co2 * fNRB;
      const nonco2 = f.fossil ? 0 : f.ef_nonco2;
      return (co2 + nonco2) * f.energyFraction;
    }),
  );

  const EF_b = (SE * combinedEF) / 1e9;
  return { eta_weighted, SE, combinedEF, EF_b, warnings };
}

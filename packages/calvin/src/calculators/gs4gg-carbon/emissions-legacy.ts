import type { LegacyErInput, LegacyErOutput } from "./types";
import { computeEfb } from "./baseline-ef";

/**
 * Legacy (SDWS V1.0) emission-reduction calculation.
 *
 *   ER = BE − PE − LE                                              [§2, Eq.11]
 *   BE = EF_b · (1 − C_b − X_cleanboil) · Q_y · M_qy              [§2.3, Eq.3]
 *   EF_b = SE · combinedEF / 1e9,  SE = SE_o / eta_weighted        [§2.1, Eq.1–2]
 *   Q_y = MIN(Q_pop, Q_m)                                          [§2.2, Eq.4]
 *
 * Pure function — no I/O, clock, or randomness (reproducible in tests and against
 * the reference dataset). Confirmed against Gold Standard's official ER Excel tool on the
 * reference cases (held with the platform, not carried).
 */
export function computeLegacyEr(input: LegacyErInput): LegacyErOutput {
  const { SE_o, fNRB, stoveStrata, fuelMix, Q_pop } = input;

  // --- Baseline EF per litre (§2.1) — shared helper, or a filed override ---
  const efb = computeEfb(SE_o, fNRB, stoveStrata, fuelMix);
  const { eta_weighted, SE, combinedEF } = efb;
  const warnings = [...efb.warnings];
  let EF_b = efb.EF_b;
  if (input.EF_b !== undefined) {
    EF_b = input.EF_b;
    warnings.push(`EF_b overridden with a filed value (${input.EF_b}); strata/fuelMix ignored for EF_b`);
  }

  // --- Quantity of safe water (§2.2): MIN(population, metered) ---
  const Q_m = input.Q_m ?? null;
  const Q_y = Q_m === null ? Q_pop : Math.min(Q_pop, Q_m);

  // --- Baseline emissions (§2.3, Eq.3 — subtractive eligibility form; see §5.1) ---
  const eligibility = 1 - input.C_b - input.X_cleanboil;
  const BE = EF_b * eligibility * Q_y * input.M_qy;

  // --- ER = BE − PE − LE (§2, Eq.11) ---
  const PE = input.PE ?? 0;
  // Simplified leakage: flat 5% of (BE − PE) when elected (§2.5); else the input LE.
  const LE = input.leakageFivePercent ? 0.05 * (BE - PE) : (input.LE ?? 0);
  const ER = BE - PE - LE;

  return { eta_weighted, SE, combinedEF, EF_b, Q_y, BE, PE, LE, ER, warnings };
}

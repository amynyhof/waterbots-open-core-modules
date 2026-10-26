import type { PaaErInput, PaaErOutput } from "./types";
import { computeEfb } from "./baseline-ef";
import embodiedFactors from "../data/embodied/factors.json";

/** Eq.19 amortisation: the first crediting period, 5 years (V2 §9.2.2.1(b), p.37) — from the data file. */
const EMBODIED_AMORTISATION_YEARS: number = embodiedFactors.amortisationYears.value;

/**
 * PAA v2.0 (SDWS V2.0) emission-reduction calculation — the 5-step stepwise baseline
 * (§7), then activity emissions (§8), leakage (§9) and the net figure (§10).
 *
 *   Q_y    = MIN(Q_pop, Q_m)  (Method 1 only; Method 2: Q_pop)     [§7.3.10 Eq.4 / Eq.6]
 *   Q_adj  = Q_y · (1 − X_cleanboil) · M_qy · U_p                 [§7.4.1 Eq.8 — multiplicative]
 *   BE_u   = EF_b · (1 − C_b) · Q_adj                             [§7.4.4 Eq.9]
 *   BE_dn  = BE_u · (1 − DAF)                                     [§7.4.5 Eq.10]
 *   BE_BAU = BE_u                                                 [§7.5.1 Eq.11]
 *   BE_CB  = MIN(BE_dn, BE_BAU)                                   [§7.6.1 Eq.12]
 *   MC     = BE_BAU − BE_CB                                       [§7.7.1 Eq.13]
 *   LE_emb = N_new · EF_emb  (upfront, Eq.18) or N_new · EF_emb / 5 (amortised, Eq.19)  [§9.2]
 *   LE_mkt = (BE_CB − AE) · 0.02  (Option 1, the default)         [§9.3.2 Eq.20]
 *          = entered                (Option 2, detailed assessment) [§9.3.2 Eq.21]
 *   LE     = LE_emb + LE_mkt                                      [§9.1.1 Eq.17]
 *   ER     = (BE_CB − AE) − LE                                    [§10.1 Eq.22]
 *
 * NOTE (§7.6): since DAF ≥ 0, BE_dn ≤ BE_u = BE_BAU, so the MIN can never select
 * BAU — BE_CB always equals BE_dn, and MC always equals the DAF-excluded amount.
 * Implemented literally (Eq.11/12) so it stays faithful to the methodology.
 *
 * LEAKAGE IS NEVER DEFAULTED HERE. The caller states the option (`input.leakage`), so a
 * reference entry and a seat both say which rule ran. Option 1's 2% is the methodology's
 * default (V2 §9.3.2(a), p.38; SDWS 40, p.74) — the seat chooses it ex-ante and labels it.
 * Embodied emissions (§9.2) are optional on the input; when absent the output carries a warning
 * and LE_embodied = 0 — the seat is expected to require them before a report prints.
 * Answers the reviewer's comments 1.6 (v0.2.0) and 1.7 (v0.3.0) ([#208], [#209]).
 *
 * Pure function. EF_b uses the same shared helper as the legacy calculator, so a
 * transition analysis computes both totals from one input set.
 */
export function computePaaEr(input: PaaErInput): PaaErOutput {
  const { EF_b, warnings } = computeEfb(input.SE_o, input.fNRB, input.stoveStrata, input.fuelMix, "paa");

  // §7.3.10 unadjusted quantity. Eq.4's MIN(Q_m, Q_pop) belongs to Method 1 (CWT/CWS, SDWS 28
  // "Applies to CWT and CWS"); Method 2's Eq.6 has no monitored-volume cap. v0.1.0 applied the MIN
  // to both — the review's "Not needed for HWT under Method 2" (comment 1.3).
  const Q_m = input.method === 1 ? (input.Q_m ?? null) : null;
  const Q_y = Q_m === null ? input.Q_pop : Math.min(input.Q_pop, Q_m);

  // §7.4.1 adjusted quantity — multiplicative; U_p applies to Method 2 (Method 1 = 1)
  const U_p = input.method === 2 ? (input.U_p ?? 1) : 1;
  const Q_adj = Q_y * (1 - input.X_cleanboil) * input.M_qy * U_p;

  // §7.3.9 unadjusted baseline (Eq.3) — reported for transparency; nothing downstream uses it
  const BE_unadj = EF_b * (1 - input.C_b) * Q_y;

  // §7.4.4 uncertainty-adjusted baseline (C_b applied separately from X_cleanboil; §5.1)
  const BE_u = EF_b * (1 - input.C_b) * Q_adj;

  // §7.4.5–7.7 downward adjustment + crediting baseline
  if (input.DAF < 0) throw new Error("DAF must be >= 0 (§7.4.5)");
  const BE_downadj = BE_u * (1 - input.DAF);
  const BE_BAU = BE_u;
  const BE_CB = Math.min(BE_downadj, BE_BAU);
  const MC = BE_BAU - BE_CB;

  // §8 activity emissions (entered; 0 for a zero-emission technology)
  const PE = input.PE ?? 0;

  // §9.3.2 market leakage — the option is the caller's, never assumed
  const leakage = input.leakage;
  if (!leakage || (leakage.option !== 1 && leakage.option !== 2)) {
    throw new Error("leakage option must be stated: { option: 1 } (V2 §9.3.2 default, 2%) or { option: 2, LE } (detailed assessment)");
  }
  const LE_market = leakage.option === 1 ? (BE_CB - PE) * 0.02 : leakage.LE;
  if (!Number.isFinite(LE_market) || LE_market < 0) throw new Error("Option 2 leakage must be a finite, non-negative tCO2e figure (§9.3.2 Eq.21)");

  // §9.2 embodied emissions — once per new unit, upfront (Eq.18) or amortised over 5 years (Eq.19).
  // Absent is honest but loud: a warning, never a silent zero.
  let LE_embodied = 0;
  if (input.embodied) {
    const e = input.embodied;
    if (!Number.isFinite(e.unitsInYear) || e.unitsInYear < 0 || !Number.isFinite(e.factor) || e.factor < 0) {
      throw new Error("embodied emissions need non-negative unitsInYear and factor (§9.2, Table 10)");
    }
    if (e.route !== "upfront" && e.route !== "amortised") throw new Error("embodied route must be 'upfront' (Eq.18) or 'amortised' (Eq.19)");
    LE_embodied = e.route === "upfront" ? e.unitsInYear * e.factor : (e.unitsInYear * e.factor) / EMBODIED_AMORTISATION_YEARS;
  } else {
    warnings.push("embodied emissions not entered — V2 §9.2 (Eq.17–19, Table 10) requires a per-unit deduction; LE_embodied = 0 until units and device class are entered");
  }

  // §9.1.1 Eq.17
  const LE = LE_embodied + LE_market;

  // §10.1 Eq.22
  const ER = BE_CB - PE - LE;

  return {
    EF_b, Q_y, Q_adj, BE_unadj, BE_u, BE_downadj, BE_BAU, BE_CB, MC, PE,
    leakageOption: leakage.option, LE_market, LE_embodied, LE, ER, warnings,
  };
}

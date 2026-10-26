/**
 * GS Safe Water ER calculator — typed inputs/outputs (gs4gg-carbon, plugin 1).
 * Legacy (SDWS V1.0). See CALCULATOR_SPEC.md §2.
 *
 * Every input is passed explicitly (no hidden state, no I/O, no clock) so a UI can
 * drive live sensitivity sliders by re-invoking with varied inputs (§0).
 */

/** A stove/fuel adoption stratum — drives the efficiency-weighted SE (§2.1). */
export interface StoveStratum {
  /** Adoption/population share of this stove+fuel stratum. */
  share: number;
  /** Stove thermal efficiency (fraction). */
  eta: number;
  /** Optional label for provenance/debug. */
  label?: string;
}

/** A baseline fuel — drives the fuel-energy-weighted combined EF (§2.1). */
export interface FuelEntry {
  fuel: string;
  /**
   * Fuel-energy fraction. Fractions MAY sum to > 1: multi-fuel (stacking)
   * households make energy-basis fractions legitimately exceed 1. The calculator
   * accepts non-normalized fractions (warns, does not block) — §2.6 design rule.
   */
  energyFraction: number;
  /** CO2 emission factor (tCO2/TJ). */
  ef_co2: number;
  /** non-CO2 emission factor (tCO2e/TJ). Omitted for fossil fuels. */
  ef_nonco2: number;
  /** Fossil fuel: fNRB not applied to the CO2 term; non-CO2 omitted (§2.1). */
  fossil?: boolean;
  /**
   * V2.0 charcoal convention (SDWS 9 p.51 / SDWS 10 p.52): which of the rulebook's three charcoal
   * factor sets this entry carries — combustion-only, or with charcoal production at the mandatory
   * wood-to-charcoal ratio (6:1 Sub-Saharan Africa and LDCs; 4:1 elsewhere). REQUIRED on a v2.0 run
   * for any charcoal entry: the engine refuses a v2.0 charcoal entry without it, so a v2.0 number can
   * never print on V1's 165.22 / 44.83 ([#213]). Ignored on a legacy run.
   */
  v2Charcoal?: "combustion-only" | "6:1" | "4:1";
}

export interface LegacyErInput {
  /** Method 1 (CWT/CWS) or 2 (HWT/IWT). Method 2 folds usage rate into Q_pop. */
  method: 1 | 2;
  /** Energy to boil 1 L (kJ/L). Default SE_o = 360.83 (§2.6). */
  SE_o: number;
  /** Fraction of non-renewable biomass (applied to renewable-fuel CO2 only). */
  fNRB: number;
  stoveStrata: StoveStratum[];
  fuelMix: FuelEntry[];
  /**
   * Optional filed EF_b (tCO2e/L) to use directly instead of computing it from
   * `stoveStrata`/`fuelMix`. For reproducing a filed calculation that applied an
   * aggregate/national EF_b; the strata/fuelMix are then ignored for EF_b.
   */
  EF_b?: number;
  /** Population-based quantity of safe water (L). */
  Q_pop: number;
  /** Metered/monitored quantity cap (L). null/undefined = not monitored (ex-ante). */
  Q_m?: number | null;
  /** Proportion already using safe water (evidence-adjustable; §5.6). */
  C_b: number;
  /** Proportion boiling already-clean water (subtractive form; §5.1). */
  X_cleanboil: number;
  /** Water-quality modifier (fraction of samples passing). */
  M_qy: number;
  /** Project emissions (tCO2). Default 0. */
  PE?: number;
  /** Leakage (tCO2). Default 0. Ignored when `leakageFivePercent` is set. */
  LE?: number;
  /**
   * Simplified leakage rule (§2.5 / §3.8.3): when ex-ante leakage is < 5% of ER,
   * skip monitoring and deduct a flat 5% — LE = 0.05·(BE − PE). Overrides `LE`.
   */
  leakageFivePercent?: boolean;
}

export interface LegacyErOutput {
  /** Share-weighted stove efficiency (fraction). */
  eta_weighted: number;
  /** Weighted specific energy SE = SE_o / eta_weighted (kJ/L). */
  SE: number;
  /** Fuel-energy-weighted combined emission factor (tCO2/TJ). */
  combinedEF: number;
  /** Baseline emission factor per litre (tCO2e/L). */
  EF_b: number;
  /** Quantity of safe water after MIN(population, metered) (L). */
  Q_y: number;
  /** Baseline emissions (tCO2e). */
  BE: number;
  /** Project emissions (tCO2). */
  PE: number;
  /** Leakage (tCO2). */
  LE: number;
  /** Emission reductions = BE − PE − LE (tCO2e). */
  ER: number;
  /** Non-fatal advisories (e.g. non-normalized fuel fractions). */
  warnings: string[];
}

// ── PAA v2.0 (§3) ────────────────────────────────────────────────────────────

/**
 * Market and behavioural leakage under V2.0 §9.3.2 (p.38), chosen EXPLICITLY — never defaulted
 * inside the engine, so a reference entry or a seat always states which option it ran.
 *   Option 1 (the methodology's default): LE_Market,y = (BE_y − AE_y) × 0.02   [Eq. 20]
 *   Option 2 (detailed assessment):       LE_Market,y = Σ LE_source,y, entered  [Eq. 21]
 * Answers the reviewer's comment 1.6 ([#208], [#209]).
 */
export type PaaLeakage = { option: 1 } | { option: 2; LE: number };

/**
 * Embodied (cradle-to-gate) emissions of the activity devices, V2.0 §9.2 (pp.36–37):
 *   upfront:   LE_emb,y = N_new,y · EF_emb              [Eq. 18 — lifetime < 5 y, or by choice]
 *   amortised: LE_emb,y = N_new,y · EF_emb / 5          [Eq. 19 — durable technologies, first CP]
 * `factor` is tCO2e per unit or system (Table 10, `calculators/data/embodied/factors.json`, or an
 * activity-specific LCA value). Optional on the input; ABSENT → LE_embodied = 0 WITH A WARNING,
 * never a silent zero. Answers the reviewer's comment 1.7 ([#208], [#209]).
 */
export interface PaaEmbodied {
  /** New units disseminated (or systems installed) in year y — SDWS 41. */
  unitsInYear: number;
  /** Embodied emission factor per unit/system (tCO2e). */
  factor: number;
  route: "upfront" | "amortised";
}

export interface PaaErInput {
  /** Method 1 (CWT/CWS) or 2 (HWT/IWT). */
  method: 1 | 2;
  SE_o: number;
  fNRB: number;
  stoveStrata: StoveStratum[];
  fuelMix: FuelEntry[];
  /** Unadjusted quantity (Table 9 tiers + any suppressed-demand deduction folded in upstream; §3.1). */
  Q_pop: number;
  Q_m?: number | null;
  /** Proportion already using safe water (evidence-adjustable; §5.6). */
  C_b: number;
  /** Proportion boiling already-clean water (§5.1). */
  X_cleanboil: number;
  /** Water-quality modifier (fraction passing; from the cross-cutting utility, §4). */
  M_qy: number;
  /** Usage rate (Method 2 only; Method 1 = 1). */
  U_p?: number;
  /** Downward adjustment factor from the country × vintage-window table (§3.4). Must be ≥ 0. */
  DAF: number;
  /** Activity emissions AE_y (tCO2e; V2 §8.2 Eq. 14). Default 0. */
  PE?: number;
  /** Market leakage option (V2 §9.3.2). Required: the engine never picks silently. */
  leakage: PaaLeakage;
  /** Embodied emissions of the devices (V2 §9.2). Absent → 0 with a warning in the output. */
  embodied?: PaaEmbodied;
}

export interface PaaErOutput {
  EF_b: number;
  /** Unadjusted quantity MIN(Q_pop, Q_m) (L). */
  Q_y: number;
  /** Adjusted quantity Q_y·(1−X_cleanboil)·M_qy·U_p (L; multiplicative, §3.2). */
  Q_adj: number;
  /** Unadjusted baseline EF_b·(1−C_b)·Q_y,unadj (tCO2e; V2 §7.3.9 Eq.3) — transparency only. */
  BE_unadj: number;
  /** Uncertainty-adjusted baseline EF_b·(1−C_b)·Q_adj (tCO2e; §3.3). */
  BE_u: number;
  /** Down-adjusted baseline BE_u·(1−DAF) (§3.4). */
  BE_downadj: number;
  /** Conservative BAU baseline = BE_u (§3.4). */
  BE_BAU: number;
  /** Crediting baseline MIN(BE_downadj, BE_BAU) (§3.4). */
  BE_CB: number;
  /** Mitigation contribution BE_BAU − BE_CB (host-party transparency, Eq.13). */
  MC: number;
  /** Activity emissions AE_y (tCO2e). */
  PE: number;
  /** Which market-leakage option ran (V2 §9.3.2). */
  leakageOption: 1 | 2;
  /** Market leakage LE_Market,y (tCO2e): Eq. 20 for Option 1, the entered value for Option 2. */
  LE_market: number;
  /** Embodied-emissions leakage LE_emb,y (tCO2e; Eq. 18 or 19). 0 with a warning when not entered. */
  LE_embodied: number;
  /** Total leakage LE_y = LE_emb,y + LE_Market,y (tCO2e; Eq. 17). */
  LE: number;
  /** Emission reductions = (BE_CB − PE) − LE (tCO2e; Eq. 22). */
  ER: number;
  warnings: string[];
}

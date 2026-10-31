/**
 * quantity.ts — Unadjusted quantity of safe drinking water (Q_pop basis).
 *
 * Derives the UNADJUSTED quantity of safe water that feeds `computeLegacyEr`
 * (V1) and `computePaaEr` (V2). Both calculators take `Q_pop`, compute
 * `Q_y = MIN(Q_pop, Q_m)` themselves, then apply their version-specific
 * discounts. So this helper's contract is strict:
 *
 *   → EMIT Q_pop *UNADJUSTED*. Never apply X_cleanboil, M_qy, or C_b here.
 *     The baseline equations own those — V1 in-baseline & subtractive
 *     (BE = EF_b·(1−C_b−X_cleanboil)·Q_y·M_qy), V2 on-quantity & multiplicative
 *     (Q_adj = Q_y·(1−X_cleanboil)·M_qy·U_p). Applying any of them here would
 *     DOUBLE-DEDUCT. (double-deduction territory: CALCULATOR_SPEC §5.1/§5.2.)
 *
 * Every formula below was line-verified BYTE-FOR-BYTE against the primary PDFs
 * on 2026-07-21 (via `pdftotext -layout`, not a derived doc):
 *   V1  /Methodology/V1-legacy/429_V1.0_EE_SWS…            §3.6.3–3.6.8 (pp.12–13)
 *   V2  /Methodology/V2-PAA/429_V2.0_PAA-M400-12…          §7.3.9–7.4.4 (pp.29–32)
 *
 * VERSION-AWARE — the read confirmed TWO real divergences in the Q_pop
 * derivation (not just the downstream discount placement):
 *
 *   (A) QPW default source. V1 uses a flat per-person volume capped at 5.5
 *       L/p/d (§3.6.6). V2 uses Table 9 age-tiered caps (§7.3.11: adults 4.0/5.5,
 *       5–18 3.0/4.5, <5 0.9/1.3) plus a suppressed-demand ×0.95 option. Table 9
 *       age-tiering, deferred at first, is APPLIED from calculator v0.5.0
 *       (Amy's ruling R4, 2026-09-21): when the caller passes `table9.ageShares`, the
 *       V2 volume is the share-weighted tiered default (`table9.ts`), each tier capped;
 *       otherwise the flat per-person value, capped, with a note that says so.
 *
 *   (B) Method-2 usage rate U_p. V1 Eq.6 FOLDS U_p INTO the quantity
 *       (Q_y = HH_p · U_p · QPW_hh · DP_p, §3.6.7). V2 Eq.6 EXCLUDES it
 *       (Q_y = HH_p · QPW_hh · DP_p, §7.3.10) — V2 applies U_p later, in the Eq.8
 *       adjustment (Q_adj, §7.4.1). `computePaaEr` applies U_p in Q_adj;
 *       `computeLegacyEr` has no U_p field and expects it already folded in. So
 *       for Method 2 this helper folds U_p for `legacy` and OMITS it for `paa`.
 *       Getting this wrong double-counts usage (paa) or drops it (legacy). The
 *       reference cases anchor this: legacy Method 2 entries carry U_p inside Q,
 *       PAA entries leave Q_pop unadjusted and the calculator applies U_p in Q_adj.
 *
 * Pure function — no I/O, clock, or randomness (reproducible in tests / reference cases).
 */

/** V1 (legacy SDWS) vs V2 (PAA M400-12). */
import { table9Volume } from "./table9.js";

export type MethodologyVersion = "legacy" | "paa";

/** Method 1 = CWT/CWS (piped/community supply); Method 2 = HWT/IWT (device). */
export type QuantityMethod = 1 | 2;

/** Adult Table 9 cap / flat V1 cap on per-person daily volume, L/p/d. */
export const QPW_PERSON_CAP_DEFAULT = 5.5;
/**
 * The rulebooks' own household per-person DEFAULT, L/p/d — not the cap: V1 SDWS 24 (p.34) 4 L
 * full-day premises; V2 Table 9 (p.31) adults 4.0 (tiers below it land with [#24]). The seat seeds
 * this when a project has no measured volume; the v0.1.0 seat seeded a value that is no rulebook's
 * number (reviewer comment 1.4, [#210]).
 */
export const QPW_PERSON_DEFAULT = 4.0;
/** Eq.7 usage time t_p default, h/day — V2 SDWS 35 Option 1 (p.70); V1 SDWS 30 default 5. */
export const DEVICE_USAGE_HOURS_DEFAULT = 5;

export interface QuantityInput {
  version: MethodologyVersion;
  /** 1 = CWT/CWS, 2 = HWT/IWT. Defaults to CWS/Method 1 at the caller. */
  method: QuantityMethod;

  /** Total project end-users (people). Aggregate of premises × individuals-per-premises. */
  people: number;
  /** Per-person daily volume before the cap, L/p/day (QPW). Default or WCFT-monitored. */
  litresPerPersonPerDay: number;
  /** Days the technology is operational for end-users in the year (DO_p / DP_p). */
  operationalDays: number;

  /**
   * Monitored / metered quantity Q_m (L/yr) for the calc's MIN(Q_pop, Q_m) row.
   * Ex-post: metered volume supplied. Ex-ante: planned production capacity, if any.
   * Omit / null when unknown — the calc then takes Q_pop directly.
   */
  meteredVolumeL?: number | null;

  /** Override the 5.5 L/p/d cap (e.g. a Table 9 partial-day 3.0 institutional cap). */
  peakVolumeCapLPerPersonPerDay?: number;

  /**
   * V2 household runs (Amy's ruling R4, 2026-09-21; [#24]): when set, the per-person volume is the
   * Table 9 age-tiered default weighted by these age shares (`table9.ts`), and `litresPerPersonPerDay`
   * is ignored for the default. Absent → the flat per-person value (an entered design/WCFT value, or
   * the adult default). `suppressedDemand` applies the mandatory ×0.95 to the defaults, once.
   */
  table9?: { ageShares: { under5: number; age5_18: number; adult19plus: number }; suppressedDemand?: boolean; label?: string };

  // --- Method 2 (HWT/IWT) only ---
  /** Usage rate U_p (fraction). Method 2 only; Method 1 is always 1. */
  usageRate?: number;
  /** Premises count HH_p (needed for the device-capacity min and Eq.6). */
  premises?: number;
  /** Device flow-rate capacity q_i, L/h (aggregated over all units in a premises). */
  deviceCapacityLPerHour?: number;
  /** Usage time t_p, hours/day. */
  usageHoursPerDay?: number;
  /**
   * Devices per household DN_p — a project fact (Amy, 2026-10-23): a whole number, 1 or more, used
   * only in Eq.7's device cap. Not given means 1, the lowest and safest cap. Anything else is refused.
   */
  devicesPerPremises?: number;
}

/** The plain refusal for a devices-per-household value that is not a whole number, 1 or more. */
export const DEVICES_PER_PREMISES_RULE = "Devices per household (DN_p) must be a whole number, 1 or more.";

/** True for a devices-per-household value the engine accepts: a whole number, 1 or more. */
export function validDevicesPerPremises(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

export interface QuantityResult {
  version: MethodologyVersion;
  method: QuantityMethod;
  /** Per-person daily volume after the cap (L/p/day); for a Table 9 run, the share-weighted tiered volume. */
  qpwEffective: number;
  /** Whether the 5.5 (or overridden) cap bound. */
  qpwCapApplied: boolean;
  /** Present when Table 9 tiers produced `qpwEffective`: each tier's share and (capped) volume. */
  table9?: { tiers: { key: "under5" | "age5_18" | "adult19plus"; share: number; volume: number; capApplied: boolean }[]; suppressedDemandApplied: boolean };
  /** Method 2 only: whether the device-capacity min (Eq.7) bound the per-premises volume. */
  deviceMinApplied: boolean;
  /** Method 2 only: whether Eq.7's MIN was evaluated at all (false when q_i was not entered). */
  deviceLimitEvaluated: boolean;
  /** Method 2 only: q_i · t_p · DN_p (L/premises/day) when evaluated. */
  deviceCapacityLPerDay?: number;
  /** Method 2 only: premises count N_p (HH_p) used, when supplied. */
  premises?: number;
  /** Method 2 only: individuals per premises HN_p = people / N_p, when premises supplied. */
  individualsPerPremises?: number;
  /** Method 2 only: per-premises volume QPW_hh (L/premises/day) after Eq.7, when premises supplied. */
  qpwPerPremises?: number;
  /**
   * UNADJUSTED quantity of safe water that could be consumed, L/yr (Eq.5 / Eq.6).
   * For legacy Method 2 this already includes U_p; for paa Method 2 it does NOT
   * (the PAA calc applies U_p in Q_adj). Feed this straight into the calc's Q_pop.
   */
  Q_pop: number;
  /** Pass-through metered volume for the calc's MIN(Q_pop, Q_m); null when unknown. */
  Q_m: number | null;
  /** Provenance / deferral flags surfaced to the caller and UI. */
  notes: string[];
}

/**
 * Convert a household count to a people count using an average household size.
 * The country → household-size lookup lives in a versioned data file; this stays
 * a pure multiply so the caller can seed it from ProjectContext or a survey value.
 */
export function peopleFromHouseholds(households: number, avgHouseholdSize: number): number {
  return households * avgHouseholdSize;
}

/**
 * Derive the unadjusted quantity of safe water (Q_pop, L/yr) for the given
 * methodology version + method. See the file header for the version-aware rules.
 */
export function computeQuantity(input: QuantityInput): QuantityResult {
  // DN_p, when given, is a whole number, 1 or more — anything else is refused, never rounded
  // (Amy, 2026-10-23). No upper limit: Eq.7's MIN against the people's water need already caps it.
  if (input.devicesPerPremises !== undefined && !validDevicesPerPremises(input.devicesPerPremises)) {
    throw new RangeError(DEVICES_PER_PREMISES_RULE);
  }
  const notes: string[] = [];
  const cap = input.peakVolumeCapLPerPersonPerDay ?? QPW_PERSON_CAP_DEFAULT;

  // Per-person daily volume. V1 §3.6.6 (p.12): a flat value, capped 5.5. V2 §7.3.11 Table 9 (p.31):
  // age-tiered defaults and caps — applied when the caller supplies the age split (Amy's ruling R4,
  // 2026-09-21, [#24]); each tier is capped inside table9Volume, so the flat cap is not re-applied.
  let qpwEffective: number;
  let qpwCapApplied = false;
  let table9Out: QuantityResult["table9"];
  if (input.table9 && input.version === "paa") {
    const t9 = table9Volume(input.table9.ageShares, { suppressedDemand: input.table9.suppressedDemand });
    qpwEffective = t9.qpwWeighted;
    table9Out = { tiers: t9.tiers, suppressedDemandApplied: t9.suppressedDemandApplied };
    notes.push(
      `V2 Table 9 age tiers: ${t9.tiers.map((t) => `${t.key} ${(t.share * 100).toFixed(1)}% × ${t.volume} L`).join(", ")} → ${t9.qpwWeighted.toFixed(4)} L/p/d weighted` +
        (t9.suppressedDemandApplied ? " (suppressed demand claimed: defaults × 0.95, once)" : "") +
        (input.table9.label ? ` — ${input.table9.label}` : ""),
    );
  } else {
    qpwCapApplied = input.litresPerPersonPerDay > cap;
    qpwEffective = Math.min(input.litresPerPersonPerDay, cap);
    if (qpwCapApplied) {
      notes.push(`QPW capped at ${cap} L/p/d (requested ${input.litresPerPersonPerDay}).`);
    }
    if (input.version === "paa" && input.peakVolumeCapLPerPersonPerDay === undefined) {
      notes.push("V2 run on a flat per-person volume (no age split supplied); Table 9 tiers not applied.");
    }
  }

  const Q_m = input.meteredVolumeL ?? null;

  let Q_pop: number;
  let deviceMinApplied = false;
  let deviceLimitEvaluated = false;
  let deviceCapacityLPerDay: number | undefined;
  // Method 2 provenance (surfaced for the Eq.6/7 derivation rows; undefined for Method 1
  // or a premises-less people-basis fallback).
  let premisesUsed: number | undefined;
  let individualsPerPremises: number | undefined;
  let qpwPerPremises: number | undefined;

  if (input.method === 1) {
    // Method 1 (CWT/CWS): Q_pop = HH_p · HN_p · QPW · DO_p, with HH_p·HN_p = people.
    // V1 §3.6.6 Eq.5 (p.12) / V2 §7.3.10 Eq.5 (p.30). No usage rate in Method 1.
    Q_pop = input.people * qpwEffective * input.operationalDays;
    if (input.usageRate !== undefined && input.usageRate !== 1) {
      notes.push("usageRate ignored: U_p applies to Method 2 only (Method 1 U_p = 1).");
    }
  } else {
    // Method 2 (HWT/IWT). Per-premises volume with the device-capacity min:
    //   QPW_hh = MIN( q_i · t_p · DN_p , HN_p · QPW )   [Eq.7]
    //   V1 §3.6.8 Eq.7 (p.13) / V2 §7.3.10 Eq.7 (pp.30–31)
    // Then Q_pop = HH_p · QPW_hh · DO_p  [Eq.6], with the version-aware U_p rule (B).
    const premises = input.premises;
    let qpwHh: number;

    if (premises && premises > 0) {
      premisesUsed = premises;
      individualsPerPremises = input.people / premises; // HN_p
      const perPersonDefault = individualsPerPremises * qpwEffective; // HN_p · QPW  (SDWS 30 × SDWS 29)

      // Eq.7's device term needs the capacity q_i (SDWS 13 — manufacturer specs, never a default).
      // Hours t_p default to 5 (V2 SDWS 35 Option 1, p.70; V1 SDWS 30 default 5) and devices per
      // premises DN_p to 1 (SDWS 37 has no default — an ex-ante assumption, noted) ONLY when the
      // capacity is present; without q_i the device limit is not evaluated and the note says so.
      // (reviewer comments 1.2 / 1.3 — the v0.1.0 report printed "Calculated as per Eq. 7" on
      // a value that Eq.7 never produced.)
      if (input.deviceCapacityLPerHour !== undefined && input.deviceCapacityLPerHour > 0) {
        const hours = input.usageHoursPerDay ?? DEVICE_USAGE_HOURS_DEFAULT;
        const devices = input.devicesPerPremises ?? 1;
        if (input.usageHoursPerDay === undefined) notes.push(`Eq.7: usage time t_p defaulted to ${DEVICE_USAGE_HOURS_DEFAULT} h/day (SDWS 35, Option 1 default).`);
        if (input.devicesPerPremises === undefined) notes.push("Eq.7: devices per premises DN_p assumed 1 (SDWS 37 has no default; enter the sales-record average).");
        const deviceCapacity = input.deviceCapacityLPerHour * hours * devices; // q_i · t_p · DN_p
        deviceCapacityLPerDay = deviceCapacity;
        deviceLimitEvaluated = true;
        qpwHh = Math.min(deviceCapacity, perPersonDefault); // Eq.7
        deviceMinApplied = deviceCapacity < perPersonDefault;
        notes.push(deviceMinApplied
          ? "Eq.7: the device capacity binds the per-premises volume (q_i · t_p · DN_p < HN_p · QPW)."
          : "Eq.7: the people term binds (HN_p · QPW ≤ q_i · t_p · DN_p).");
      } else {
        // No device capacity: Eq.7's MIN cannot be evaluated. The per-person term is used and
        // the omission is stated — the report must not print "Calculated as per Eq. 7".
        qpwHh = perPersonDefault;
        notes.push(
          "Eq.7 device limit NOT evaluated: device capacity q_i (SDWS 13) not entered; per-premises volume = HN_p · QPW.",
        );
      }
      qpwPerPremises = qpwHh; // QPW_hh for the Eq.7 derivation row
      Q_pop = premises * qpwHh * input.operationalDays; // Eq.6 base (before U_p)
    } else {
      // No premises count: cannot form HN_p or the device min. Aggregate people-basis — this is
      // Eq.5's shape (Method 1), stated plainly so a report never claims Eq.6 ran.
      Q_pop = input.people * qpwEffective * input.operationalDays;
      notes.push(
        "Method 2 WITHOUT a premises count: Eq.6 could not run; the people-basis aggregate (Eq.5's shape) was used. Enter N_p (SDWS 33).",
      );
    }

    // (B) Usage rate placement — version-aware:
    //   legacy: U_p folds INTO Q_pop  (V1 Eq.6, §3.6.7, p.12). The legacy calc has no U_p.
    //   paa:    U_p OMITTED here       (V2 Eq.6, §7.3.10). computePaaEr applies U_p in Q_adj (Eq.8).
    const U_p = input.usageRate ?? 1;
    if (input.version === "legacy") {
      Q_pop *= U_p;
      if (U_p !== 1) notes.push(`Legacy Method 2: U_p ${U_p} folded into Q_pop (V1 Eq.6).`);
    } else if (U_p !== 1) {
      notes.push(`PAA Method 2: U_p ${U_p} NOT folded into Q_pop — the calc applies it in Q_adj (V2 Eq.8).`);
    }
  }

  return {
    version: input.version, method: input.method, qpwEffective, qpwCapApplied, table9: table9Out, deviceMinApplied,
    deviceLimitEvaluated, deviceCapacityLPerDay,
    premises: premisesUsed, individualsPerPremises, qpwPerPremises,
    Q_pop, Q_m, notes,
  };
}

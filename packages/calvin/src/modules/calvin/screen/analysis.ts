/**
 * WHAT CALVIN SAVES — the calculator's own working inputs, handed to the host's `onSave` and handed
 * back as `ModuleProject.analysis` (the cut, seams S1 and S3).
 *
 * The shape belongs to the module. A host stores it as it comes and never edits it; the paid site
 * keeps it in its project record under a type that extends this one, so the fields shared by both
 * are defined once.
 *
 * Kept as plain data with no engine imports, so a host can store and type it without loading the
 * engine. Every field is optional: an analysis is captured progressively.
 */
export interface SavedAnalysis {
  /** "legacy" = SDWS V1.0; "paa" = PAA v2.0. */
  version?: "legacy" | "paa";
  /** 1 = CWS/CWT, 2 = HWT/IWT. */
  method?: 1 | 2;
  mode?: "ex-ante" | "ex-post";

  // Population (exact calculator inputs; the record's coarse population stays the host's fact).
  populationMode?: "people" | "households";
  populationCount?: number;
  litresPerPersonPerDay?: number;
  operationalDays?: number;
  meteredVolumeL?: number | null;
  /** Usage rate U_p (Method 2 only). */
  usageRate?: number;
  /** Premises count N_p (HH_p) — Method 2 (HWT/IWT) only; decomposes people into premises × per-premises. */
  premises?: number;
  /** Eq.7 device term (Method 2): capacity q_i L/h (SDWS 13), usage hours t_p (SDWS 35), devices per premises DN_p (SDWS 37). */
  deviceCapacityLPerHour?: number;
  usageHoursPerDay?: number;
  devicesPerPremises?: number;
  /** True when the per-person volume was entered (design/WCFT) rather than seeded from the rulebook default. */
  qpwEntered?: boolean;
  /**
   * The project's OWN surveyed age split (SDWS 30), when the baseline survey collected one.
   * Unset = the UN WPP 2024 national shares stand, which the screen and the report both label a
   * census estimate rather than this project's figure ([#215]). The three shares sum to 1.
   */
  ageSharesEntered?: { under5: number; age5_18: number; adult19plus: number };
  /**
   * The project's own baseline mix, typed on the calculator's stove and fuel rows (V2.0 SDWS 6 /
   * SDWS 8; Amy's ruling (1), 2026-09-26). Shares are fractions; each list must sum to 1 for the
   * engine to use it. Unset = the labelled screening preset.
   */
  stoveSharesEntered?: { threeStone: number; otherConventional: number; ics: number; fossil: number };
  /** η of the fossil fuel system class (SDWS 11 gives no default). */
  fossilStoveEta?: number;
  fuelSharesEntered?: { wood?: number; charcoal?: number; lpg?: number; kerosene?: number; coal?: number; electricity?: number };
  /** V2.0 charcoal factor set (SDWS 9): combustion-only, WCCF 6:1 or WCCF 4:1. */
  charcoalConvention?: "combustion-only" | "6:1" | "4:1";
  /** In-row η override; unset = the version's SDWS 11 default. */
  etaOverride?: number;

  // fNRB. Version-scoped overrides: fnrbOverride = the current/PAA override; fnrbFiledV1 = the
  // project's filed V1-era fNRB (applies to the Legacy path).
  fnrbOverride?: number | null;
  fnrbFiledV1?: number | null;
  householdSizeFallbackStop?: "low" | "median" | "high";
  /** A project's own surveyed household size (people/household), overriding the UN 2022 country average — [#225](b). */
  householdSizeOverride?: number | null;

  // Eligibility discounts (calculator-precise; framed conservative by default).
  cBaseline?: number; // C_b
  xCleanboil?: number; // X_cleanboil
  mQuality?: number; // M_qy
  /** Ex-ante sliders: which were moved, and any value typed past a cited end (see `exAnte.ts`). */
  slidersEntered?: Partial<Record<"days" | "testsPass" | "usage", true>>;
  slidersTyped?: Partial<Record<"litres" | "days" | "testsPass" | "usage", number>>;
}

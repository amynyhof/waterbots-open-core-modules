/**
 * table9.ts — V2.0 Table 9 age-tiered water volume (household / residential, users present 24 h).
 *
 * GS4GG PAA M400-12 V2.0 §7.3.11, Table 9 (p.31): per-person daily drinking-water DEFAULTS and
 * CAPS by age group —
 *   children under 5      default 0.9 L/p/d   cap 1.3
 *   children 5–18 years   default 3.0         cap 4.5   (*HWT/school-IWT overlap: deduct the school's 2.0)
 *   adults 19+            default 4.0         cap 5.5
 * SDWS 29 (p.65): Option 1 uses these tiered defaults and Option 2 uses a volume measured by WCFT;
 * the cap holds either way. SDWS 30 (p.66): a project on the tiered defaults keeps its data split
 * by age group. When a project has no age split, the census-based national shares in
 * `calculators/data/age-shares/` are the default (CALCULATOR_SPEC §3.1.1; the reviewer confirmed the
 * census source 2026-07-31 and the Table 9 tiers to Amy around July 2026 — verdicts.md row 1.5).
 *
 * SUPPRESSED DEMAND (§7.3.11, p.31): a project that claims suppressed demand on the Option 1
 * defaults must take 5% off them — QPW_p = Table9 default × 0.95. The ×0.95 lives HERE and nowhere
 * else (CALCULATOR_SPEC §5.2 guard: it must never be applied twice).
 *
 * Pure. Amy's ruling R4 (2026-09-21, [#24]); calculator v0.5.0.
 */
import ageSharesJson from "../data/age-shares/countries.json" with { type: "json" };

export interface AgeShares {
  under5: number;
  age5_18: number;
  adult19plus: number;
}

export interface Table9Tier {
  key: "under5" | "age5_18" | "adult19plus";
  label: string;
  defaultLPerPersonPerDay: number;
  capLPerPersonPerDay: number;
}

/** Table 9, household / residential rows, transcribed from V2 p.31. */
export const TABLE_9_HOUSEHOLD: readonly Table9Tier[] = [
  { key: "under5", label: "Children under 5", defaultLPerPersonPerDay: 0.9, capLPerPersonPerDay: 1.3 },
  { key: "age5_18", label: "Children and adolescents 5–18", defaultLPerPersonPerDay: 3.0, capLPerPersonPerDay: 4.5 },
  { key: "adult19plus", label: "Adults 19+", defaultLPerPersonPerDay: 4.0, capLPerPersonPerDay: 5.5 },
] as const;

/** The mandatory deduction when Option 1 defaults are used to claim suppressed demand (§7.3.11). */
export const SUPPRESSED_DEMAND_FACTOR = 0.95;

type SharesFile = {
  version: string;
  registrySources: string[];
  globalDefault: AgeShares & { basis: string; cite: string };
  countries: Record<string, AgeShares & { name: string }>;
};
const shares = ageSharesJson as unknown as SharesFile;

export interface ResolvedAgeShares extends AgeShares {
  /** "country" = the national census-based shares; "global-default" = the World row fallback. */
  source: "country" | "global-default" | "entered";
  label: string;
}

/** National age shares for a country (ISO3), else the labelled global default. Entered shares win. */
export function resolveAgeShares(iso3: string, entered?: AgeShares): ResolvedAgeShares {
  if (entered) {
    return { ...entered, source: "entered", label: "age shares entered — project survey (SDWS 30)" };
  }
  const c = shares.countries[iso3];
  if (c) {
    return { under5: c.under5, age5_18: c.age5_18, adult19plus: c.adult19plus, source: "country",
      label: `${c.name} age shares — UN WPP 2024 single-age file (census default; SDWS 30)` };
  }
  const g = shares.globalDefault;
  return { under5: g.under5, age5_18: g.age5_18, adult19plus: g.adult19plus, source: "global-default",
    label: `global default age shares — ${g.cite} (no national row for ${iso3})` };
}

export interface Table9Volume {
  /** Share-weighted per-person daily volume, L/p/d, after the caps and (if claimed) the ×0.95. */
  qpwWeighted: number;
  /** Each tier's default (or the entered per-tier value), capped, and its share. */
  tiers: { key: Table9Tier["key"]; share: number; volume: number; capApplied: boolean }[];
  suppressedDemandApplied: boolean;
}

/**
 * Weighted Table 9 volume for a household population split by age. `perTier` lets a WCFT-measured
 * value replace a tier's default (Option 2); each tier is capped (SDWS 29: "Cap: In all cases").
 * `suppressedDemand` applies the ×0.95 to the DEFAULT tiers exactly once — never to a measured value.
 */
export function table9Volume(
  ageShares: AgeShares,
  opts: { suppressedDemand?: boolean; perTier?: Partial<Record<Table9Tier["key"], number>> } = {},
): Table9Volume {
  const sum = ageShares.under5 + ageShares.age5_18 + ageShares.adult19plus;
  if (!(sum > 0.999 && sum < 1.001)) throw new Error(`age shares must sum to 1 (got ${sum})`);
  const tiers = TABLE_9_HOUSEHOLD.map((t) => {
    const entered = opts.perTier?.[t.key];
    const raw = entered !== undefined
      ? entered
      : opts.suppressedDemand ? t.defaultLPerPersonPerDay * SUPPRESSED_DEMAND_FACTOR : t.defaultLPerPersonPerDay;
    const capApplied = raw > t.capLPerPersonPerDay;
    return { key: t.key, share: ageShares[t.key], volume: Math.min(raw, t.capLPerPersonPerDay), capApplied };
  });
  const qpwWeighted = tiers.reduce((s, t) => s + t.share * t.volume, 0);
  return { qpwWeighted, tiers, suppressedDemandApplied: opts.suppressedDemand === true };
}

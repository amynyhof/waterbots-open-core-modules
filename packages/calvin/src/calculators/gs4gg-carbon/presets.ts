import type { MethodologyVersion, QuantityMethod } from "./quantity";
import paaFuel from "../data/paa/fuel-factors.json";
import m49Json from "../data/regions/un-m49.json";
import baselineMixJson from "../data/baseline-mix/countries.json";

/**
 * presets.ts — conservative, cited, country-informed baseline profiles that pre-fill
 * the EF_b inputs (stove strata + fuel mix) on the Vector calculator. Starting points;
 * every field is editable.
 *
 * VERSION-AWARE stove efficiency (FIND-001; CALCULATOR_SPEC §2.6): the methodology-default
 * η differs by version — V1 SDWS 11 (p.24) three-stone 0.10 / other-conv 0.20 / ICS 0.30;
 * V2 SDWS 11 (p.52) 0.15 / 0.25 / 0.30. Lower η inflates the baseline (SE = SE_o/η → higher
 * EF_b → more credits), so the V2 values are the conservative direction. A stratum that
 * carries a *filed* η (project-documented) overrides the default and is version-independent.
 *
 * ENGINE INPUTS ARE THE PROJECT'S OWN NUMBERS OR CITED DEFAULTS, NEVER ANOTHER PROJECT'S AND NEVER
 * INVENTED (maintainer's ruling, 2026-10-01). A preset holds methodology defaults only (SDWS 9/10/11);
 * a project's own baseline enters as typed shares or as a cited country default. A filing's strata
 * and fuel mix belong to that filing's reference case, which stays on the platform side.
 *
 * Preset B (generic regional wood/charcoal mix) is intentionally ABSENT — an uncited
 * estimate can't ship under the conservative-cited rule. Its purpose is now served per country,
 * cited, by `countryBaselineDefault` below (WHO household energy series + DHS; [#227], v0.16.0).
 */

export type PresetId = "traditional-wood-cws" | "institutional-wood-iwt";
export type StoveClass = "threeStone" | "otherConventional" | "ics";

/** Methodology-default stove thermal efficiency (fraction), version-aware. */
export const DEFAULT_STOVE_ETA: Record<MethodologyVersion, Record<StoveClass, number>> = {
  legacy: { threeStone: 0.1, otherConventional: 0.2, ics: 0.3 }, // V1 SDWS 11 (p.24)
  paa: { threeStone: 0.15, otherConventional: 0.25, ics: 0.3 }, //  V2 SDWS 11 (p.52)
};

interface StratumSpec {
  share: number;
  label: string;
  /** Methodology stove class → version-aware default η. */
  stoveClass?: StoveClass;
  /** Filed/measured η (project-documented) → overrides the default, version-independent. */
  eta?: number;
}
// Matches the calculator's FuelEntry (types.ts) so a preset's fuelMix feeds it directly.
export interface FuelSpec {
  fuel: string;
  energyFraction: number;
  ef_co2: number;
  ef_nonco2: number;
  fossil?: boolean;
  /** V2 charcoal convention (see FuelEntry in types.ts); resolved to V2's factors on a PAA run. */
  v2Charcoal?: "combustion-only" | "6:1" | "4:1";
}

export interface PresetSpec {
  id: PresetId;
  label: string;
  method: QuantityMethod;
  strata: StratumSpec[];
  fuelMix: FuelSpec[];
  cite: string;
  note?: string;
}

// EF defaults: wood 112 / 9.46 (both rulebooks); charcoal V1 165.22 / 44.83 (SDWS 9.2 / 10.2 p.24) —
// V2 CHANGED IT (SDWS 9 p.51 / SDWS 10 p.52: combustion-only 112 / 5.87, WCCF 6:1 355.36 / 89.68,
// WCCF 4:1 236.91 / 61.74), so a preset's charcoal entry is VERSION-RESOLVED in buildPreset via
// `v2Charcoal`: the V1 figures on a legacy run, the named V2 convention's figures on a PAA run, and
// the engine refuses a PAA charcoal entry without one ([#213]). LPG 63.1 CO2, fossil (non-CO2
// omitted per V1 §3.6.1). See calculators/data/legacy/defaults.json and data/paa/fuel-factors.json.
export const PRESETS: Record<PresetId, PresetSpec> = {
  "traditional-wood-cws": {
    id: "traditional-wood-cws",
    label: "Traditional wood — Sub-Saharan CWS",
    method: 1,
    strata: [{ share: 1, label: "traditional wood (three-stone)", stoveClass: "threeStone" }],
    fuelMix: [{ fuel: "wood", energyFraction: 1, ef_co2: 112, ef_nonco2: 9.46 }],
    cite: "Stove η: SDWS 11 (version-aware). EF: SDWS 9.1/10.1.",
  },
  "institutional-wood-iwt": {
    id: "institutional-wood-iwt",
    label: "Institutional wood — HWT/IWT (Method 2)",
    method: 2,
    strata: [{ share: 1, label: "traditional wood (three-stone)", stoveClass: "threeStone" }],
    fuelMix: [{ fuel: "wood", energyFraction: 1, ef_co2: 112, ef_nonco2: 9.46 }],
    cite: "Stove η: SDWS 11 (version-aware). EF: SDWS 9.1/10.1.",
  },
};

export interface ResolvedStratum {
  share: number;
  eta: number;
  label: string;
}
export interface ResolvedPreset {
  id: PresetId;
  label: string;
  method: QuantityMethod;
  version: MethodologyVersion;
  stoveStrata: ResolvedStratum[];
  fuelMix: FuelSpec[];
  cite: string;
  notes: string[];
}

type Convention = "combustion-only" | "6:1" | "4:1";
const V2_CHARCOAL = paaFuel.fuels.charcoal as unknown as Record<Convention, { ef_co2: number; ef_nonco2: number }>;

/**
 * A charcoal entry's factors are VERSION-RESOLVED ([#213]): V1's as written on a legacy run; on a PAA
 * run the named V2 convention's figures from calculators/data/paa/fuel-factors.json (V2 SDWS 9/10).
 * A charcoal entry with no convention is left as it is — the engine then refuses the PAA run, which
 * is the point: no v2.0 number on V1's charcoal factors, ever.
 */
export function resolveFuelForVersion(f: FuelSpec, version: MethodologyVersion, notes?: string[]): FuelSpec {
  if (version !== "paa" || !/charcoal/i.test(f.fuel) || !f.v2Charcoal) return f;
  const v2 = V2_CHARCOAL[f.v2Charcoal];
  notes?.push(`Charcoal factors resolved to V2 SDWS 9/10 (${f.v2Charcoal}): ${v2.ef_co2} / ${v2.ef_nonco2} tCO₂(e)/TJ — V1's ${f.ef_co2} / ${f.ef_nonco2} is not a V2 value.`);
  return { ...f, ef_co2: v2.ef_co2, ef_nonco2: v2.ef_nonco2 };
}

// ── THE ENTERED BASELINE MIX (Amy's ruling (1), 2026-09-26) ─────────────────────────────────────
//
// The stove and fuel rows became typed boxes. What a person types is the two numbers a baseline
// survey reports — the share of each stove class (V2.0 SDWS 6, p.49) and the share of each fuel
// (V2.0 SDWS 8, p.50). Everything else on those rows stays the rulebook's: η per class from SDWS 11,
// emission factors from SDWS 9/10. So the edit is SHARES ONLY, and the engine — not the screen —
// turns shares into the strata and fuel list it computes on.
//
// ⚠ THE 100% GUARD STANDS (Amy, 2026-09-26). Each list must add up to 100% (within half a point,
// the age split's tolerance) or it is NOT passed: the run keeps the preset for that half and says
// why. A half-typed list re-weighting itself silently would credit a mix nobody entered.

/**
 * SDWS 6's classes. V2.0 names four (p.49–50): three-stone/conventional, other conventional
 * biomass, improved cookstoves, fossil fuel systems. The fourth has NO default η — SDWS 11 (p.52–53)
 * says manufacturer specification or a Water Boiling Test — so its share is refused unless an η is
 * entered with it.
 */
export type StoveShareKey = "threeStone" | "otherConventional" | "ics" | "fossil";
export type StoveShares = Record<StoveShareKey, number>;
export const STOVE_SHARE_KEYS: StoveShareKey[] = ["threeStone", "otherConventional", "ics", "fossil"];
export const STOVE_CLASS_LABEL: Record<StoveShareKey, string> = {
  threeStone: "three-stone / conventional (no grate or chimney)",
  otherConventional: "other conventional biomass",
  ics: "improved cookstove",
  fossil: "fossil fuel system",
};

/**
 * The fuels a share may be given for. Wood and charcoal carry V2.0 SDWS 9/10's own factors.
 * LPG, kerosene, coal and electricity were added for the country default (Amy's six mapping rulings,
 * 2026-09-26), each LABELLED with what its factor is and is not:
 *   • electricity — ZERO baseline emissions (ruling 3): nothing is burned at the point of boiling.
 *   • LPG — the 63.1 tCO₂/TJ the presets have always carried; kerosene and coal — NO CODED VALUE
 *     EXISTS, so they count at zero. All three say "source pending: IPCC 2006 Vol. 2 Ch. 2" until
 *     that document is held in Methodology/external-standards/ and the figures are cited (ruling 4).
 *     Zero for a fossil fuel UNDERSTATES the baseline, so it never over-credits.
 */
export type FuelShareKey = "wood" | "charcoal" | "lpg" | "kerosene" | "coal" | "electricity";
export type FuelShares = Record<FuelShareKey, number>;
export const FUEL_SHARE_KEYS: FuelShareKey[] = ["wood", "charcoal", "lpg", "kerosene", "coal", "electricity"];
export const FUEL_LABEL: Record<FuelShareKey, string> = {
  wood: "wood",
  charcoal: "charcoal",
  lpg: "LPG",
  kerosene: "kerosene",
  coal: "coal",
  electricity: "electricity",
};
/** The one-line label printed beside a fuel whose factor is not a rulebook figure (rulings 3 and 4). */
export const FUEL_FACTOR_NOTE: Partial<Record<FuelShareKey, string>> = {
  lpg: "63.1 tCO₂/TJ — source pending: IPCC 2006 Vol. 2 Ch. 2",
  kerosene: "no coded value, counted at zero — source pending: IPCC 2006 Vol. 2 Ch. 2",
  coal: "no coded value, counted at zero — source pending: IPCC 2006 Vol. 2 Ch. 2",
  electricity: "zero baseline emissions — nothing is burned where the water is boiled",
};
/** A saved share list from before a fuel was added reads that fuel as zero. */
const shareOf = (f: Partial<FuelShares>, k: FuelShareKey) => f[k] ?? 0;

export type CharcoalConvention = "combustion-only" | "6:1" | "4:1";

/** What a person entered on the two baseline lists. Each half is independent. */
export interface BaselineEdit {
  stoveShares?: StoveShares;
  /** η of the fossil fuel system class — required when its share is above zero (SDWS 11, no default). */
  fossilStoveEta?: number;
  /** A fuel missing from the list reads as zero (a list saved before kerosene, coal and electricity were added). */
  fuelShares?: Partial<FuelShares>;
  /** Which V2.0 charcoal factor set the charcoal share uses (SDWS 9 p.51) — required when charcoal > 0. */
  charcoalConvention?: CharcoalConvention;
}

export interface ResolvedBaselineEdit {
  /** Present only when the stove list was entered AND passes the guard. */
  stoveStrata?: ResolvedStratum[];
  /** Present only when the fuel list was entered AND passes the guard. */
  fuelMix?: FuelSpec[];
  /** Why an entered half was NOT passed — printed on the row, never swallowed. */
  held: string[];
  notes: string[];
}

const SHARE_TOLERANCE = 0.005;
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pctText = (x: number) => `${Math.round(x * 1000) / 10}%`;

/** The fuel factors a typed share computes on — V1's charcoal as written; the V2 swap happens below. */
const FUEL_BASE: Record<FuelShareKey, Omit<FuelSpec, "energyFraction">> = {
  wood: { fuel: "wood", ef_co2: 112, ef_nonco2: 9.46 },
  charcoal: { fuel: "charcoal", ef_co2: 165.22, ef_nonco2: 44.83 },
  lpg: { fuel: "lpg", ef_co2: 63.1, ef_nonco2: 0.0013, fossil: true },
  // Zero, labelled (FUEL_FACTOR_NOTE): kerosene and coal have no coded value; electricity burns nothing.
  kerosene: { fuel: "kerosene", ef_co2: 0, ef_nonco2: 0, fossil: true },
  coal: { fuel: "coal", ef_co2: 0, ef_nonco2: 0, fossil: true },
  electricity: { fuel: "electricity", ef_co2: 0, ef_nonco2: 0, fossil: true },
};

/**
 * Turn entered shares into the strata and fuel list the engine computes on, for one rulebook.
 * A half that fails the guard is left out (the preset stands for it) and its reason is in `held`.
 */
export function resolveBaselineEdit(edit: BaselineEdit, version: MethodologyVersion): ResolvedBaselineEdit {
  const held: string[] = [];
  const notes: string[] = [];
  let stoveStrata: ResolvedStratum[] | undefined;
  let fuelMix: FuelSpec[] | undefined;

  const s = edit.stoveShares;
  if (s) {
    const vals = STOVE_SHARE_KEYS.map((k) => s[k]);
    const total = sumOf(vals);
    if (!vals.every((v) => Number.isFinite(v) && v >= 0)) {
      held.push("The stove shares include a blank or negative figure, so the preset's stoves are still used.");
    } else if (Math.abs(total - 1) >= SHARE_TOLERANCE) {
      held.push(`The stove shares add up to ${pctText(total)}, not 100%, so the preset's stoves are still used until they do.`);
    } else if (s.fossil > 0 && !(Number.isFinite(edit.fossilStoveEta) && (edit.fossilStoveEta as number) > 0 && (edit.fossilStoveEta as number) <= 1)) {
      held.push("A fossil fuel system share needs its efficiency (manufacturer specification or a Water Boiling Test — SDWS 11 gives no default), so the preset's stoves are still used until it is entered.");
    } else {
      stoveStrata = STOVE_SHARE_KEYS.filter((k) => s[k] > 0).map((k) => ({
        share: s[k],
        eta: k === "fossil" ? (edit.fossilStoveEta as number) : DEFAULT_STOVE_ETA[version][k],
        label: STOVE_CLASS_LABEL[k],
      }));
      notes.push(`Stove shares entered for this project (SDWS 6); efficiency per class from the ${version === "paa" ? "V2.0" : "V1.0"} SDWS 11 defaults.`);
    }
  }

  const f = edit.fuelShares;
  if (f) {
    const vals = FUEL_SHARE_KEYS.map((k) => shareOf(f, k));
    const total = sumOf(vals);
    if (!vals.every((v) => Number.isFinite(v) && v >= 0)) {
      held.push("The fuel shares include a blank or negative figure, so the preset's fuels are still used.");
    } else if (Math.abs(total - 1) >= SHARE_TOLERANCE) {
      held.push(`The fuel shares add up to ${pctText(total)}, not 100%, so the preset's fuels are still used until they do.`);
    } else if (shareOf(f, "charcoal") > 0 && !edit.charcoalConvention) {
      // Required on BOTH rulebooks: the seat always runs the V2.0 twin for the transition, and a
      // V2.0 charcoal entry with no convention is refused by the engine ([#213]).
      held.push("A charcoal share needs its V2.0 factor set named (WCCF 6:1 for Sub-Saharan Africa and LDCs, 4:1 elsewhere, or combustion only — V2.0 SDWS 9, p.51), so the preset's fuels are still used until it is chosen.");
    } else {
      fuelMix = FUEL_SHARE_KEYS.filter((k) => shareOf(f, k) > 0).map((k) => {
        const base: FuelSpec = { ...FUEL_BASE[k], energyFraction: shareOf(f, k) };
        if (k === "charcoal") base.v2Charcoal = edit.charcoalConvention;
        return resolveFuelForVersion(base, version, notes);
      });
      notes.push("Fuel shares entered for this project (SDWS 8); emission factors from SDWS 9/10.");
    }
  }

  return { stoveStrata, fuelMix, held, notes };
}

/**
 * The charcoal factor set the seat PRE-SELECTS, and only where the rulebook's words settle it:
 * V2.0 SDWS 9 (p.51) makes WCCF 6:1 mandatory for "SSA/LDCs", and a country in UN M49 sub-region
 * 202 is in Sub-Saharan Africa by the geoscheme the fNRB fallback already reads. Everywhere else
 * nothing is pre-selected — the LDC list is not in our data, and which ratio a non-SSA country takes
 * is the reviewer's open question Q8 ([#213]) — so the person chooses, and the choice is on the row.
 */
export function defaultCharcoalConvention(iso: string): CharcoalConvention | undefined {
  const row = (m49Json.countries as Record<string, { toolRegion: string | null }>)[iso.toUpperCase()];
  return row?.toolRegion === "sub-saharan-africa" ? "6:1" : undefined;
}

// ── THE PER-COUNTRY DEFAULT MIX ([#227]; Amy's ruling (5) and six mapping rulings, 2026-09-26) ──────
//
// V2.0 SDWS 6 and SDWS 8 (pp.49–50) accept "official statistics" and "credible published
// literature" as sources, so a cited national figure is a DEFAULT, not a guess. Fuel shares come from
// the WHO household energy series; stove shares from a DHS survey where one is recent enough.
// Countries with no data keep the labelled screening preset. The published numbers sit untouched in
// calculators/data/baseline-mix/countries.json; every mapping below is Amy's ruling, labelled on the
// page and logged for the reviewer's next read ([#232]).

type WhoFuel = "biomass" | "charcoal" | "gas" | "kerosene" | "coal" | "electricity";
interface CountryMixRow {
  name: string;
  fuel?: { dataYear: number; published: string; percent: Partial<Record<WhoFuel, number>> };
  stove?: { surveyId: string; surveyType: string | null; surveyYear: number; fieldwork: string | null; published: string | null; percent: Record<string, number> };
}
const COUNTRY_MIX = baselineMixJson as unknown as {
  retrieval_date: string;
  fuelSource: { cite: string; url: string };
  stoveSource: { cite: string; url: string };
  countries: Record<string, CountryMixRow>;
};
/** V2.0 SDWS 6 / SDWS 8: "Source applied shall not be more than 3 years old" — counted from the data year (Amy's ruling (3)). */
const FRESHNESS_YEARS = 3;
/** The year a country default is judged against when the caller gives none: the retrieval year. */
export const BASELINE_MIX_RETRIEVAL_YEAR = Number(COUNTRY_MIX.retrieval_date.slice(0, 4));

export interface CountryDefaultHalf<T> {
  shares: T;
  /** The one-line source label printed on the row and in the report. */
  label: string;
  /** Every mapping ruling that touched this country's figures, in plain words — printed, never hidden. */
  notes: string[];
  dataYear: number;
  /** True when the data year is more than three years before `asOfYear` (Amy's ruling (3): shown anyway, with its year and a note). */
  stale: boolean;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/**
 * The country's default fuel and stove shares, mapped and scaled by Amy's six rulings of 2026-09-26:
 *   (1) WHO biomass (wood, crop residues, dung) → wood's factor, "reads high where residues or dung are common"
 *   (2) WHO gaseous fuels (LPG, natural gas, biogas) → LPG
 *   (3) electricity → zero baseline emissions
 *   (4) kerosene, coal (and LPG's figure) → "source pending: IPCC 2006 Vol. 2 Ch. 2"
 *   (5) WHO shares scaled to exactly 100%
 *   (6) DHS: three-stone and traditional without chimney → traditional; with chimney → other
 *       conventional; manufactured → improved; gas, electric and liquid-fuel stoves leave the stove
 *       row and the biomass stoves scale to 100% (those fuels are counted on the fuel row).
 */
export function countryBaselineDefault(
  iso: string,
  asOfYear: number = BASELINE_MIX_RETRIEVAL_YEAR,
): { fuel?: CountryDefaultHalf<FuelShares>; stove?: CountryDefaultHalf<StoveShares> } {
  const row = COUNTRY_MIX.countries[iso.toUpperCase()];
  if (!row) return {};
  const out: { fuel?: CountryDefaultHalf<FuelShares>; stove?: CountryDefaultHalf<StoveShares> } = {};

  if (row.fuel) {
    const p = row.fuel.percent;
    const raw: FuelShares = {
      wood: p.biomass ?? 0,
      charcoal: p.charcoal ?? 0,
      lpg: p.gas ?? 0,
      kerosene: p.kerosene ?? 0,
      coal: p.coal ?? 0,
      electricity: p.electricity ?? 0,
    };
    const total = FUEL_SHARE_KEYS.reduce((t, k) => t + raw[k], 0);
    if (total > 0) {
      const shares = Object.fromEntries(FUEL_SHARE_KEYS.map((k) => [k, raw[k] / total])) as FuelShares;
      const stale = asOfYear - row.fuel.dataYear > FRESHNESS_YEARS;
      const notes = [
        `Main-fuel shares — stacking not weighted (the WHO series counts each person's primary cooking fuel).`,
        ...(raw.wood > 0 ? ["Biomass, counted as wood; reads high where residues or dung are common."] : []),
        ...(raw.lpg > 0 ? ["Gaseous fuels (LPG, natural gas, biogas), counted as LPG."] : []),
        ...(raw.electricity > 0 ? ["Electricity, counted at zero baseline emissions."] : []),
        ...(raw.kerosene > 0 || raw.coal > 0 || raw.lpg > 0 ? ["Kerosene, coal and LPG: source pending — IPCC 2006 Vol. 2 Ch. 2."] : []),
        `Published shares add to ${r1(total)}%; scaled to exactly 100%.`,
        ...(stale ? [`Data year ${row.fuel.dataYear} is past the rulebook's three-year freshness rule (V2.0 SDWS 8); shown with its year until a newer edition or a survey replaces it.`] : []),
      ];
      out.fuel = {
        shares,
        label: `Country default — WHO household energy series, ${row.name}, data year ${row.fuel.dataYear} (published ${row.fuel.published})`,
        notes,
        dataYear: row.fuel.dataYear,
        stale,
      };
    }
  }

  if (row.stove) {
    const p = row.stove.percent;
    const split = p.TSC !== undefined || p.TSW !== undefined;
    const tsc = p.TSC ?? 0;
    const tsw = p.TSW ?? 0;
    // A survey that does not split traditional stoves by chimney: the unsplit share goes to OTHER
    // CONVENTIONAL — the higher default η of the two, so the conservative reading ([#232], logged).
    const tsUnsplit = split ? 0 : (p.TSF ?? 0);
    const manufactured = p.MSC !== undefined || p.MSW !== undefined ? (p.MSC ?? 0) + (p.MSW ?? 0) : (p.MSF ?? 0);
    const raw: StoveShares = {
      threeStone: (p["3SO"] ?? 0) + tsw,
      otherConventional: tsc + tsUnsplit,
      ics: manufactured,
      fossil: 0,
    };
    const solid = raw.threeStone + raw.otherConventional + raw.ics;
    const clean = ["ELC", "LPG", "NAT", "BIO", "LFA", "LFN"].reduce((t, k) => t + (p[k] ?? 0), 0);
    if (solid > 0) {
      const shares: StoveShares = {
        threeStone: raw.threeStone / solid,
        otherConventional: raw.otherConventional / solid,
        ics: raw.ics / solid,
        fossil: 0,
      };
      const stale = asOfYear - row.stove.surveyYear > FRESHNESS_YEARS;
      const notes = [
        "Three-stone and traditional stoves without a chimney → traditional; traditional with a chimney → other conventional; manufactured → improved.",
        ...(split ? [] : ["This survey does not split traditional stoves by chimney; they are counted as other conventional (the higher default efficiency, so fewer credits)."]),
        `Gas, electric and liquid-fuel stoves (${r1(clean)}% of households) leave the stove row — their fuels are counted on the fuel row; the biomass stoves (${r1(solid)}%) are scaled to 100%.`,
        ...(stale ? [`Survey year ${row.stove.surveyYear} is past the rulebook's three-year freshness rule (V2.0 SDWS 6).`] : []),
      ];
      out.stove = {
        shares,
        label: `Country default — ${row.stove.surveyId} (${row.stove.surveyType ?? "survey"} ${row.stove.surveyYear}, The DHS Program), household cooking technology`,
        notes,
        dataYear: row.stove.surveyYear,
        stale,
      };
    }
  }
  return out;
}

/** The shares a preset stands for, so the boxes open on the numbers the run is actually using. */
export function presetShares(id: PresetId): { stove: StoveShares; fuel: FuelShares } | null {
  const p = PRESETS[id];
  const stove: StoveShares = { threeStone: 0, otherConventional: 0, ics: 0, fossil: 0 };
  for (const st of p.strata) {
    if (!st.stoveClass) return null; // a filed-η preset has no SDWS 6 class to map to
    stove[st.stoveClass] += st.share;
  }
  const fuel: FuelShares = { wood: 0, charcoal: 0, lpg: 0, kerosene: 0, coal: 0, electricity: 0 };
  for (const fu of p.fuelMix) {
    const k = fu.fuel as FuelShareKey;
    if (!(k in fuel)) return null;
    fuel[k] += fu.energyFraction;
  }
  return { stove, fuel };
}

/** Resolve a preset's stove strata to concrete η for the given methodology version. */
export function buildPreset(id: PresetId, version: MethodologyVersion): ResolvedPreset {
  const p = PRESETS[id];
  const notes: string[] = [];
  const stoveStrata: ResolvedStratum[] = p.strata.map((s) => {
    if (s.eta !== undefined) return { share: s.share, eta: s.eta, label: s.label };
    return { share: s.share, eta: DEFAULT_STOVE_ETA[version][s.stoveClass!], label: s.label };
  });
  if (p.strata.some((s) => s.stoveClass !== undefined)) {
    const v = version === "paa" ? "V2/PAA (three-stone 0.15)" : "V1/legacy (three-stone 0.10)";
    notes.push(`Stove efficiency uses the ${v} SDWS 11 defaults.`);
  }
  if (p.note) notes.push(p.note);
  const fuelMix = p.fuelMix.map((f) => resolveFuelForVersion(f, version, notes));
  return { id: p.id, label: p.label, method: p.method, version, stoveStrata, fuelMix, cite: p.cite, notes };
}

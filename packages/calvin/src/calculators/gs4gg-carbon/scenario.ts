import type { MethodologyVersion, QuantityMethod } from "./quantity.js";
import { computeQuantity } from "./quantity.js";
import {
  buildPreset, resolveBaselineEdit, countryBaselineDefault, defaultCharcoalConvention,
  type PresetId, type ResolvedStratum, type FuelSpec, type BaselineEdit,
  type CharcoalConvention, type FuelShares, type StoveShares,
} from "./presets.js";
import { computeLegacyEr } from "./emissions-legacy.js";
import { computePaaEr } from "./emissions-paa-v2.js";
import { computeEfb } from "./baseline-ef.js";
import { resolveAgeShares, type ResolvedAgeShares } from "./table9.js";
import type { LegacyErOutput, PaaErOutput, PaaLeakage } from "./types.js";
import type { FallbackStop, FallbackStopKey } from "./fallback.js";

import embodiedJson from "../data/embodied/factors.json" with { type: "json" };
import householdJson from "../data/household-size/countries.json" with { type: "json" };
import fnrbJson from "../data/fnrb/countries.json" with { type: "json" };
import dafJson from "../data/daf/countries.json" with { type: "json" };
import m49Json from "../data/regions/un-m49.json" with { type: "json" };

/**
 * scenario.ts — the Vector calculator orchestrator. Wires the deterministic engine into
 * one call the UI drives: resolves people, quantity (quantity.ts), the baseline profile
 * (presets.ts), and the country lookups (household-size / fNRB / DAF), with a vintage
 * dimension for fNRB — then runs the version's calculator. NO numbers are invented here.
 *
 * A country missing from a lookup gets NO stand-in statistic of ours. fNRB takes the official
 * multi-national value or refuses (ruling (3), 2026-09-21); DAF takes the tool's own fallback,
 * labelled; household size is the project's own or the cited UN figure, else the run refuses and
 * the screens ask for it (Amy, 2026-10-23). The quartile dial (`fallback.ts`) no longer fires.
 */

type HouseholdData = {
  countries: Record<string, { name: string; peoplePerHousehold: number }>;
};
type FnrbMultiNational = {
  cite: string;
  footnote5: string;
  refusal: string;
  regions: Record<string, { label: string; fnrb: number }>;
};
type FnrbVintage = {
  label: string;
  countries: Record<string, { name?: string; fnrb: number }>;
  /**
   * A6.4-AMT-009 Table 2's official multi-national values, keyed by the UN M49 tool region
   * (Amy's ruling (3), 2026-09-21). Present on the default vintage. The quartile dial that
   * stood here until calculator v0.10.0 is struck in the data file, not deleted.
   */
  multiNational?: FnrbMultiNational;
};
type FnrbRuleUpdateData = {
  label: string;
  /** ISO date the current standardised values took effect — the year the report line prints. */
  effective: string;
  instrument: string;
  registrySources: string[];
};
type FnrbData = {
  defaultVintage: string;
  ruleUpdate: FnrbRuleUpdateData;
  vintages: Record<string, FnrbVintage>;
};
type DafData = {
  absolute_floor: { value: number };
  countries: Record<string, { name: string; daf_2026_2030: number; basis: string }>;
};
const household = householdJson as unknown as HouseholdData;
/** Table 10 device classes (`calculators/data/embodied/factors.json`). */
export const EMBODIED_CATEGORIES = embodiedJson.categories;
export type EmbodiedCategory = keyof typeof EMBODIED_CATEGORIES;
const fnrb = fnrbJson as unknown as FnrbData;
const daf = dafJson as unknown as DafData;

export const DEFAULT_SE_O = 360.83; // kJ/L, SDWS / ER tool (§2.6)


export type ScenarioSource = "country" | "global-default" | "override" | "preset" | "default";
/**
 * `preset` = the labelled screening preset; `country-default` = the cited per-country mix ([#227]);
 * `entered` = typed for this project; `override` = a caller's raw strata/fuel list.
 */
export type BaselineMixSource = "preset" | "country-default" | "entered" | "override";
export interface Provenance {
  field: string;
  label: string;
  source: ScenarioSource;
}

/** A global-default fallback that actually fired — the UI shows its dial; only present here on fire. */
export interface FiredFallback {
  parameter: string;
  selectedStop: FallbackStopKey;
  value: number;
  /** The three Low/Median/High stops for the picker. */
  stops: FallbackStop[];
  cite: string;
}

export interface ScenarioInput {
  version: MethodologyVersion;
  method?: QuantityMethod;
  mode?: "ex-ante" | "ex-post";
  // population
  populationMode?: "people" | "households";
  populationCount: number;
  countryIso: string;
  litresPerPersonPerDay: number;
  /**
   * V2 volume basis (Amy's ruling R4, 2026-09-21; [#24]). Default `"table9"` on a PAA run when no
   * per-person volume was entered: Table 9 age tiers weighted by the country's census age shares
   * (`ageShares` may replace them with a project survey). `"flat"` = use `litresPerPersonPerDay`
   * (an entered design or WCFT value). Legacy runs always use the flat value (V1 SDWS 24).
   */
  volumeBasis?: "table9" | "flat";
  ageShares?: { under5: number; age5_18: number; adult19plus: number };
  /** Suppressed demand claimed with Option 1 defaults → Table 9 defaults × 0.95, once (§7.3.11). */
  suppressedDemand?: boolean;
  operationalDays: number;
  meteredVolumeL?: number | null;
  usageRate?: number; // Method 2 (U_p)
  premises?: number; // Method 2 (N_p / HH_p) — decomposes people into premises × per-premises
  /** Method 2, Eq.7 device term: capacity q_i (L/h, SDWS 13); hours t_p (default 5, SDWS 35); devices DN_p (SDWS 37). */
  deviceCapacityLPerHour?: number;
  usageHoursPerDay?: number;
  devicesPerPremises?: number;
  // baseline profile
  preset?: PresetId;
  stoveStrataOverride?: ResolvedStratum[];
  fuelMixOverride?: FuelSpec[];
  /**
   * The shares typed on the seat's stove and fuel rows (Amy's ruling (1), 2026-09-26). Resolved
   * here by `resolveBaselineEdit` — the engine, never the screen, turns shares into strata. A half
   * that fails the 100% guard is held and the preset stands for it; `baselineMix.held` says why.
   * Ignored for a half that a raw `…Override` above already sets.
   */
  baselineEdit?: BaselineEdit;
  /** The V2.0 charcoal factor set for a charcoal share that is not typed (the country default). */
  charcoalConvention?: CharcoalConvention;
  /**
   * Use the cited per-country mix where the country has data (default true — Amy's ruling (5)).
   * `false` pins the screening preset, for a caller that is testing the preset itself.
   */
  countryDefaults?: boolean;
  /** The year the country default's freshness is judged against; defaults to the data's retrieval year. */
  asOfYear?: number;
  /** In-row η control: overrides every stratum's efficiency (both versions) when set. */
  etaOverride?: number;
  SE_o?: number;
  // fNRB (VERSION-SCOPED). PAA (current): fnrbOverride wins → vintage lookup → default vintage.
  // Legacy (V1-faithful): fnrbFiledV1 (the project's filed V1 value) wins → else fNRB is held equal to
  // the V2 value and the page says so (R1). No legacy-source catalog; never a made-up comparator.
  fnrbVintage?: string;
  fnrbOverride?: number | null;
  fnrbFiledV1?: number | null;
  /** A project's own surveyed household size (people/household), overriding the UN 2022 country average — [#225](b). */
  householdSizeOverride?: number | null;
  // eligibility discounts
  C_b?: number;
  X_cleanboil?: number;
  M_qy?: number;
  DAF?: number; // paa; if omitted, resolved from the country lookup
  PE?: number;
  /** PAA: an entered market-leakage figure = Option 2 (detailed assessment); absent = Option 1, the 2% default. */
  LE?: number;
  /**
   * PAA embodied emissions (V2 §9.2): new units in the year, the Table 10 device class, and the
   * route (upfront Eq.18 / amortised Eq.19). Absent → the engine warns and deducts nothing.
   */
  embodied?: { unitsInYear: number; category: EmbodiedCategory; route: "upfront" | "amortised" };
  leakageFivePercent?: boolean;
  // also compute the other version (legacy↔paa) for the transition delta
  transition?: boolean;
}

export interface ScenarioResult {
  version: MethodologyVersion;
  method: QuantityMethod;
  mode: "ex-ante" | "ex-post";
  people: number;
  /** Present only on a `populationMode: "households"` run: the household size (people/household) this run
   *  used to derive `people` from the entered household count — the country average, a filed override,
   *  or the fallback dial's value. Undefined when population was entered as people directly. */
  householdSizeUsed?: number;
  /** Per-person daily volume after the cap (L/p/d) — the value the engine used; for a Table 9 run, the weighted tiered volume. */
  qpwEffective: number;
  /** Which volume basis ran: Table 9 tiers (V2 household default) or the flat per-person value. */
  volumeBasis: "table9" | "flat";
  /** Present on a Table 9 run: the shares used, their source, and each tier's capped volume. */
  table9?: { ageShares: ResolvedAgeShares; tiers: { key: "under5" | "age5_18" | "adult19plus"; share: number; volume: number; capApplied: boolean }[]; suppressedDemandApplied: boolean };
  /** Method 2 only: premises count N_p used (undefined for Method 1 / people-basis fallback). */
  premises?: number;
  /** Method 2 only: individuals per premises HN_p = people / N_p. */
  individualsPerPremises?: number;
  /** Method 2 only: per-premises volume QPW_hh (L/premises/day). */
  qpwPerPremises?: number;
  /** Method 2 only: whether Eq.7's device limit was evaluated (q_i entered), and the q_i · t_p · DN_p term. */
  deviceLimitEvaluated?: boolean;
  deviceCapacityLPerDay?: number;
  deviceMinApplied?: boolean;
  Q_pop: number;
  Q_m: number | null;
  SE_o: number;
  /** Weighted baseline specific energy SE = SE_o / η_weighted (kJ/L). */
  SE: number;
  /** Share-weighted stove efficiency (fraction). */
  etaWeighted: number;
  /** Fuel-energy-weighted combined emission factor (tCO₂/TJ). */
  combinedEF: number;
  fNRB: number;
  fnrbVintage: string;
  /**
   * Present ONLY when A6.4-AMT-009 Table 2's multi-national value stood in for a missing national
   * one. A multi-national value carries a condition (footnote 5), so wherever the number is shown
   * the condition is shown with it — the screen's note and the report's Source line both print
   * `condition` verbatim. Built here, never assembled in a component.
   */
  fnrbMultiNational?: { region: string; value: number; condition: string };
  DAF: number;
  stoveStrata: ResolvedStratum[];
  fuelMix: FuelSpec[];
  /**
   * Where each half of the baseline mix came from, for the seat and the report to label — and the
   * reasons an entered half was held back by the 100% guard. Built here so no surface guesses.
   */
  baselineMix: {
    stove: BaselineMixSource;
    fuel: BaselineMixSource;
    held: string[];
    /** Present per half when the country default is in force: its source label, the mapping notes, and whether it is past the freshness rule. */
    country?: {
      stove?: { label: string; notes: string[]; stale: boolean };
      fuel?: { label: string; notes: string[]; stale: boolean };
    };
    /** The shares in force per half (entered or country default); undefined = the preset's. */
    shares?: { stove?: StoveShares; fuel?: Partial<FuelShares> };
  };
  /** The selected version's calculator output. */
  result: LegacyErOutput | PaaErOutput;
  /** The other version's output when `transition` is set (baseline profile held constant). */
  transitionResult?: LegacyErOutput | PaaErOutput;
  /** Every default / fallback / vintage used — the evidence trail. */
  provenance: Provenance[];
  /** Fallbacks that fired (with their dials); empty when every input had real data. */
  fallbacks: FiredFallback[];
  notes: string[];
}

interface Resolved {
  value: number;
  prov: Provenance;
  fired?: FiredFallback;
}

/**
 * HOUSEHOLD SIZE: the project's own, else the cited UN national average — and nothing else
 * (Amy, 2026-10-23). The 25th-percentile stop of the UN table that stood in for a country with no
 * UN figure was our own statistic, not a published default, and is gone (its record is in the
 * maintainers' archive). With neither, there is NO household size: a run that needs one refuses
 * (`ProjectFactMissingError("householdSize")`) and the screens ask for it.
 */
/**
 * The household size in force: the project's own, else the cited UN figure for the country, else
 * null. Exported so the project record can show the size's grey default without a counting unit,
 * which `derivePopulation` now refuses to go without.
 */
export function resolveHouseholdSize(iso: string, override?: number | null): Resolved | null {
  if (override !== undefined && override !== null && override > 0) {
    return { value: override, prov: { field: "householdSize", label: "Entered — project's surveyed household size", source: "override" } };
  }
  const c = household.countries[iso];
  if (c) return { value: c.peoplePerHousehold, prov: { field: "householdSize", label: `${c.name} — UN 2022 household size`, source: "country" } };
  return null;
}

/** Whether a household size exists for this run: the project's own, or a UN figure for the country. */
export function householdSizeKnown(iso: string, override?: number | null): boolean {
  return resolveHouseholdSize(iso, override) !== null;
}

/**
 * Whether a run needs the household size: a count entered as households (to give people), or a
 * household-treatment run (Method 2) with no premises count of its own (to give N_p, Eq.6).
 */
export function householdSizeNeeded(input: { method?: QuantityMethod | null; populationMode?: "people" | "households" | null; premises?: number | null }): boolean {
  return input.populationMode === "households" || (input.method === 2 && !(input.premises != null && input.premises > 0));
}

/**
 * PEOPLE AND HOUSEHOLDS, DECIDED IN ONE PLACE AND IN BOTH DIRECTIONS
 * ([#225]; Amy's rulings of 2026-09-24, first and second rejections).
 *
 * A household-treatment project is counted two ways and the two are one fact:
 *
 *     households × household size = people          (the count entered as households)
 *     people ÷ household size    = households       (the count entered as people)
 *
 * Whichever way it was entered, the OTHER number is derived here — never on a screen, never
 * twice. `computeScenario` takes its people count from this function; the calculator seat and
 * the project record call it to SHOW both numbers and the size that ties them together.
 *
 * ⚠ WHY BOTH DIRECTIONS, AND WHY IT IS EXPORTED. The first build derived only one way and the
 * screens showed only one number, so a household count sat beside an N_p of the same value and
 * read as "that many people, one per house". The second rejection went further: entering PEOPLE on a
 * household project left the households unknown, so Eq.6 could not run at all. Amy withdrew the
 * earlier "nothing fires on People" instruction for exactly that reason — for HWT/IWT the
 * households are always knowable, and a number in force must be on screen. A second copy of this
 * rule in the UI would drift from the engine's, silently; one function, three readers.
 *
 * ⚠ THE DERIVED HOUSEHOLD COUNT IS NOT ROUNDED. A people count divided by a household size is
 * rarely a whole number, and rounding it would quietly break the identity the screens now print —
 * people ÷ households would stop equalling the household size shown. The figure is displayed as
 * it is used.
 *
 * ⚠ A MISSING COUNTING UNIT IS REFUSED, NEVER READ AS PEOPLE (Amy, 2026-10-25). With no
 * people/households choice this throws `ProjectFactMissingError("countedAs")`, the same refusal
 * `computeScenario` gives, so no caller can get a "people" reading nobody chose.
 *
 * Returns null when there is no count to work from, or no household size to work with (no
 * project figure and no UN figure for the country — `computeScenario` refuses such a run when
 * it needs one).
 */
export function derivePopulation(input: {
  countryIso: string;
  method?: QuantityMethod;
  populationMode?: "people" | "households" | null;
  populationCount?: number | null;
  householdSizeOverride?: number | null;
}): {
  /** The people count every equation is computed from. */
  people: number;
  /** The household count (N_p). Undefined on Method 1 — a water-point project has no households. */
  households?: number;
  householdSize: number;
  /** Which number was entered and which was worked out — the screens label them from this. */
  direction: "households-to-people" | "people-to-households";
  prov: Provenance;
} | null {
  if (input.populationMode == null) throw new ProjectFactMissingError("countedAs");
  const count = input.populationCount;
  if (count == null || !Number.isFinite(count) || count <= 0) return null;
  const hh = resolveHouseholdSize(input.countryIso, input.householdSizeOverride);
  if (!hh) return null;
  if (input.populationMode === "households") {
    return {
      people: count * hh.value,
      households: input.method === 2 ? count : undefined,
      householdSize: hh.value,
      direction: "households-to-people",
      prov: hh.prov,
    };
  }
  return {
    people: count,
    // Only a household-treatment project decomposes people into households (V2 Eq.6, SDWS 33).
    households: input.method === 2 && hh.value > 0 ? count / hh.value : undefined,
    householdSize: hh.value,
    direction: "people-to-households",
    prov: hh.prov,
  };
}

/**
 * fNRB has NO official default for this country — the engine refuses rather than inventing one
 * (Amy's ruling (3)(b), 2026-09-21). A6.4-AMT-009 publishes national values for 90 countries
 * (Table 3) and multi-national values for three regions (Table 2); a country in neither list has
 * no number the tool will stand behind, and a quartile of the countries that happen to be in a
 * table is our own statistic, not a published default. The only way forward is the project's own
 * filed value, entered with its source.
 */
export class FnrbUnavailableError extends Error {
  readonly refusal: FnrbRefusal;
  constructor(refusal: FnrbRefusal) {
    super(refusal.message);
    this.name = "FnrbUnavailableError";
    this.refusal = refusal;
  }
}

export interface FnrbRefusal {
  parameter: "fNRB";
  countryIso: string;
  /** The country's name as the UN M49 geoscheme spells it, or the ISO code when it has no row. */
  countryName: string;
  /** The sentence the seat and the report both print, verbatim. */
  message: string;
  cite: string;
}

/** The UN M49 tool region for a country, or null when it is in none of AMT-009 Table 2's three. */
function toolRegionFor(iso: string): { key: string; countryName: string } | { key: null; countryName: string } {
  const row = (m49Json.countries as Record<string, { name: string; toolRegion: string | null }>)[iso];
  if (!row) return { key: null, countryName: iso };
  return { key: row.toolRegion, countryName: row.name };
}

function fnrbRefusal(iso: string, countryName: string): FnrbRefusal {
  return {
    parameter: "fNRB",
    countryIso: iso,
    countryName,
    message:
      `No official fNRB default covers ${countryName}. Enter your project's own value with its source; ` +
      `the tools publish national values for 90 countries and multi-national values for three regions only.`,
    cite: "A6.4-AMT-009 v01.0 Table 2 (multi-national) and Table 3 (national); UN M49 geoscheme for the region map",
  };
}

/**
 * Is there an fNRB the engine can stand behind for this country? Callers that cannot handle a
 * thrown refusal — the seat, which must render a message instead of a number — ask this first.
 */
export function fnrbAvailability(
  iso: string,
  vintageId?: string,
  override?: number | null,
): { ok: true } | { ok: false; refusal: FnrbRefusal } {
  if (override !== undefined && override !== null) return { ok: true };
  const vId = vintageId && fnrb.vintages[vintageId] ? vintageId : fnrb.defaultVintage;
  const v = fnrb.vintages[vId];
  if (v.countries[iso]) return { ok: true };
  const region = toolRegionFor(iso);
  if (region.key && v.multiNational?.regions[region.key]) return { ok: true };
  return { ok: false, refusal: fnrbRefusal(iso, region.countryName) };
}

/** AMT-009 footnote 5, as the data file holds it — never retyped in a component. */
function multiNationalFootnote5(vintageId: string): string {
  const vId = fnrb.vintages[vintageId] ? vintageId : fnrb.defaultVintage;
  return fnrb.vintages[vId].multiNational?.footnote5 ?? "";
}

/** Each fuel's share of fuel energy, in words — the mix this run used, for footnote 5's condition. */
function describeFuelMix(mix: FuelSpec[]): string {
  const total = mix.reduce((t, m) => t + m.energyFraction, 0);
  if (total <= 0) return "not stated";
  return mix
    .filter((m) => m.energyFraction > 0)
    .sort((a, b) => b.energyFraction - a.energyFraction)
    .map((m) => `${Math.round((m.energyFraction / total) * 100)}% ${m.fuel}`)
    .join(", ") + " by fuel energy";
}

function resolveFnrb(iso: string, vintageId: string, override?: number | null): Resolved & { vintage: string } {
  if (override !== undefined && override !== null) {
    return { value: override, vintage: "filed-override", prov: { field: "fNRB", label: "filed fNRB (project override)", source: "override" } };
  }
  const vId = fnrb.vintages[vintageId] ? vintageId : fnrb.defaultVintage;
  const v = fnrb.vintages[vId];
  const c = v.countries[iso];
  if (c) return { value: c.fnrb, vintage: vId, prov: { field: "fNRB", label: `${c.name ?? iso} fNRB — ${v.label}`, source: "country" } };

  // No national row. The OFFICIAL fallback is Table 2's multi-national value for the country's
  // UN M49 region — never a quartile of the table (struck 2026-09-22, Amy's ruling (3)).
  const region = toolRegionFor(iso);
  const mn = v.multiNational;
  const r = region.key && mn ? mn.regions[region.key] : undefined;
  if (!r || !mn) throw new FnrbUnavailableError(fnrbRefusal(iso, region.countryName));
  return {
    value: r.fnrb,
    vintage: vId,
    prov: {
      field: "fNRB",
      label: `no national default for ${region.countryName}; A6.4-AMT-009 Table 2 multi-national value for ${r.label}`,
      source: "global-default",
    },
  };
}

/**
 * Legacy (V1.0-faithful) fNRB — Amy's ruling R1 (2026-09-21; reviewer comment 1.9 / 2.1):
 *   A. a saved project's FILED V1 value, when entered;
 *   C. otherwise fNRB is HELD EQUAL to the V2 value on both sides, and the page says so in words.
 * Never B silently. The value that stood here until calculator v0.7.0 was the applied value left in
 * Gold Standard's V1.0 CWS workbook (Parameters!E41; the HWT workbook holds another) — not a
 * methodology default (V1 SDWS 21 p.32 points to CDM TOOL30, and the A6.4 fNRB tool's national
 * defaults are the same MoFuSS figures V2 uses). It is never called a default again.
 */
/**
 * THE FILED V1.0 fNRB IS REQUIRED FOR A TRANSITION RUN — "held equal on both sides" is RETIRED
 * (Amy's R1 amendment, 2026-09-24, part 1).
 *
 * Until today a legacy run with no filed value fell back to the V2 value and said so in words.
 * That fallback is gone. A transition compares THIS project's filing against the current rules,
 * and a filing it does not have is not a comparison — it is two runs of the same number wearing
 * different labels. **No filed value, no transition run.** The seat asks for it instead, naming
 * the document and page it comes from, exactly as the country-with-no-fNRB refusal already does.
 *
 * ⚠ A NEW PROJECT NEVER SEES THIS. It has no V1.0 filing to transition from, so it never runs the
 * legacy side at all — it runs the official current value and nothing here fires.
 */
export class FiledFnrbRequiredError extends Error {
  readonly refusal: FiledFnrbRefusal;
  constructor(refusal: FiledFnrbRefusal) {
    super(refusal.message);
    this.name = "FiledFnrbRequiredError";
    this.refusal = refusal;
  }
}

/**
 * A PROJECT FACT THE RUN WOULD OTHERWISE HAVE TO ASSUME (CALCULATOR_SPEC §0.2, Amy 2026-10-23).
 * Project facts are blank until provided, never defaulted. The engine used to take Method 1 from
 * its default baseline preset when a caller gave neither a method nor a preset — a technology
 * nobody said. A caller that names a preset has chosen that preset's method; one that names
 * neither gets this refusal instead of a guess.
 */
export type MissingProjectFact = "technology" | "countedAs" | "householdSize";

const MISSING_FACT_MESSAGE: Record<MissingProjectFact, string> = {
  technology: "This run names no technology (no method and no baseline preset), so the method cannot be chosen. Provide the project's technology.",
  countedAs: "This run does not say whether the count is people or households. Provide how people served were counted.",
  householdSize: "This run needs a household size, and there is no project figure and no UN figure for this country. Provide the project's household size.",
};

export class ProjectFactMissingError extends Error {
  readonly fact: MissingProjectFact;
  constructor(fact: MissingProjectFact) {
    super(MISSING_FACT_MESSAGE[fact]);
    this.name = "ProjectFactMissingError";
    this.fact = fact;
  }
}

export interface FiledFnrbRefusal {
  parameter: "fnrbFiledV1";
  /** The sentence the seat and the report both print, verbatim. */
  message: string;
  /** Where the number comes from — the document and page, so the ask is answerable. */
  cite: string;
}

/** The one place the ask is worded. The seat prints it; the report prints it; nobody retypes it. */
export function filedFnrbRefusal(): FiledFnrbRefusal {
  return {
    parameter: "fnrbFiledV1",
    message:
      "This project's own filed V1.0 fNRB is needed before the transition can run. It is the fraction of non-renewable biomass in the project's V1.0 filing — the figure the project was credited on. Enter that value, with the source it came from, and the transition will run.",
    cite: "V1.0 methodology, SDWS 21, p.32 (which points to CDM TOOL30); the value itself is in the project's own PDD or monitoring report.",
  };
}

/**
 * A transition run's pre-check, mirroring `fnrbAvailability`: ask before computing, so the seat
 * can show the ask rather than catch an exception it then has to word for itself.
 */
export function transitionAvailability(
  filed: number | null | undefined,
): { ok: true } | { ok: false; refusal: FiledFnrbRefusal } {
  return filed != null && Number.isFinite(filed) ? { ok: true } : { ok: false, refusal: filedFnrbRefusal() };
}

function resolveFnrbLegacy(filed: number | null | undefined): Resolved & { vintage: string } {
  if (filed != null && Number.isFinite(filed)) {
    return { value: filed, vintage: "V1-filing", prov: { field: "fNRB", label: "filed value — V1 filing (project record)", source: "override" } };
  }
  throw new FiledFnrbRequiredError(filedFnrbRefusal());
}

function resolveDaf(iso: string, override?: number): { value: number; prov: Provenance } {
  if (override !== undefined) return { value: override, prov: { field: "DAF", label: "DAF (project override)", source: "override" } };
  const c = daf.countries[iso];
  if (c) return { value: c.daf_2026_2030, prov: { field: "DAF", label: `${c.name} DAF 2026-2030 (${c.basis}; Tool 05 Table 03)`, source: "country" } };
  // A country with no row in the data file takes the floor, and the screens print this label beside the
  // value (Amy, 19 Oct). The label states the value, that it is a default and whose fallback it is (Amy,
  // 25 Oct), and nothing about which rows the table holds, because a copy of this engine may carry fewer rows
  // than the tool publishes (Amy, 23 Oct).
  return { value: daf.absolute_floor.value, prov: { field: "DAF", label: `Default value: ${daf.absolute_floor.value} (Gold Standard DAF tool's fallback).`, source: "global-default" } };
}

/** Run one scenario end-to-end, returning the calculator output + a labeled evidence trail. */
export function computeScenario(input: ScenarioInput): ScenarioResult {
  const provenance: Provenance[] = [];
  const fallbacks: FiredFallback[] = [];
  const notes: string[] = [];
  const mode = input.mode ?? "ex-ante";

  // --- baseline profile (preset, version-aware η) or caller overrides ---
  const presetId = input.preset ?? "traditional-wood-cws";
  const preset = buildPreset(presetId, input.version);
  // Each half resolves on its own: a raw caller override, else entered shares that pass the 100%
  // guard, else the preset. The guard's refusals travel in `baselineMix.held` to be printed.
  const edit = input.baselineEdit ? resolveBaselineEdit(input.baselineEdit, input.version) : undefined;
  // THE COUNTRY DEFAULT ([#227]; Amy's ruling (5), 2026-09-26) stands in for the screening preset,
  // per half, wherever the country has data. It runs through the SAME resolver and 100% guard as
  // typed shares, so a country figure and a typed figure are turned into strata the one same way.
  const charcoalConvention = input.baselineEdit?.charcoalConvention ?? input.charcoalConvention ?? defaultCharcoalConvention(input.countryIso);
  const country = input.countryDefaults === false ? {} : countryBaselineDefault(input.countryIso, input.asOfYear);
  const countryResolved = resolveBaselineEdit(
    { stoveShares: country.stove?.shares, fuelShares: country.fuel?.shares, charcoalConvention },
    input.version,
  );
  const countryHeld = countryResolved.held.map((h) => `Country default held: ${h}`);
  const stoveSource: BaselineMixSource = input.stoveStrataOverride ? "override" : edit?.stoveStrata ? "entered" : countryResolved.stoveStrata ? "country-default" : "preset";
  const fuelSource: BaselineMixSource = input.fuelMixOverride ? "override" : edit?.fuelMix ? "entered" : countryResolved.fuelMix ? "country-default" : "preset";
  let stoveStrata = input.stoveStrataOverride ?? edit?.stoveStrata ?? countryResolved.stoveStrata ?? preset.stoveStrata;
  if (input.etaOverride !== undefined && Number.isFinite(input.etaOverride)) {
    stoveStrata = stoveStrata.map((s) => ({ ...s, eta: input.etaOverride! }));
  }
  const fuelMix = input.fuelMixOverride ?? edit?.fuelMix ?? countryResolved.fuelMix ?? preset.fuelMix;
  // The method is a PROJECT FACT (the technology): the caller's, or the method of the preset the
  // caller chose — never the default preset's when the caller named neither (CALCULATOR_SPEC §0.2).
  if (input.method == null && input.preset == null) throw new ProjectFactMissingError("technology");
  const method: QuantityMethod = input.method ?? preset.method;
  // Whether the count is people or households is a PROJECT FACT too: never read as people when
  // the caller did not say (Amy, 2026-10-23).
  if (input.populationMode == null) throw new ProjectFactMissingError("countedAs");
  const describe = (src: BaselineMixSource, half: "stove" | "fuel") =>
    src === "entered" ? `${half} shares entered for this project (SDWS ${half === "stove" ? 6 : 8})`
      : src === "country-default" ? (half === "stove" ? country.stove!.label : country.fuel!.label)
        : `${half} shares from the screening preset "${preset.label}", no source yet — replaced by country data or your baseline survey`;
  if (stoveSource === "override" || fuelSource === "override") {
    provenance.push({ field: "baseline", label: "edited baseline profile (caller override)", source: "override" });
  } else if (stoveSource === "preset" && fuelSource === "preset") {
    provenance.push({ field: "baseline", label: `screening preset "${preset.label}", no source yet — replaced by country data or your baseline survey`, source: "preset" });
    notes.push(...preset.notes);
  } else {
    const anyEntered = stoveSource === "entered" || fuelSource === "entered";
    provenance.push({
      field: "baseline",
      label: `${describe(stoveSource, "stove")}; ${describe(fuelSource, "fuel")}`,
      source: anyEntered ? "override" : "country",
    });
    notes.push(...(edit?.notes ?? []));
    // The country default's own mapping notes (the resolver's "entered for this project" line does
    // not describe it); the charcoal-factor line is kept, because it is true of either route.
    if (stoveSource === "country-default") notes.push(...country.stove!.notes);
    if (fuelSource === "country-default") {
      notes.push(...country.fuel!.notes, ...countryResolved.notes.filter((n) => n.startsWith("Charcoal factors")));
    }
    if (stoveSource === "preset" || fuelSource === "preset") notes.push(...preset.notes);
  }
  const baselineLabels = {
    stove: stoveSource === "country-default" ? { label: country.stove!.label, notes: country.stove!.notes, stale: country.stove!.stale } : undefined,
    fuel: fuelSource === "country-default" ? { label: country.fuel!.label, notes: country.fuel!.notes, stale: country.fuel!.stale } : undefined,
  };
  // The shares in force per half, so the seat's boxes open on the numbers the run is using.
  const sharesInForce = {
    stove: stoveSource === "entered" ? input.baselineEdit?.stoveShares : stoveSource === "country-default" ? country.stove?.shares : undefined,
    fuel: fuelSource === "entered" ? input.baselineEdit?.fuelShares : fuelSource === "country-default" ? country.fuel?.shares : undefined,
  };

  // --- population: people directly, or households × cited household size (fallback dial) ---
  // THE RULE LIVES IN `derivePopulation`, which the screens also call — see its note ([#225]).
  //
  // ⚠ THE HOUSEHOLD SIZE IS RESOLVED ON A PEOPLE-ENTERED RUN TOO, because the screens now show
  // the households it implies. The PEOPLE COUNT IS UNTOUCHED either way — on a people-entered run
  // it is the entered figure, exactly as before — so no existing scenario's arithmetic moves.
  const pop = derivePopulation({ ...input, method });
  // A run that needs a household size and has none refuses rather than guess one (Amy, 2026-10-23).
  const countGiven = Number.isFinite(input.populationCount) && input.populationCount > 0;
  if (countGiven && !pop && householdSizeNeeded({ method, populationMode: input.populationMode, premises: input.premises })) {
    throw new ProjectFactMissingError("householdSize");
  }
  const people = pop ? pop.people : input.populationCount;
  const householdSizeUsed = pop?.householdSize;
  if (input.populationMode === "households" && pop) {
    provenance.push(pop.prov);
  } else {
    provenance.push({ field: "population", label: "people entered directly", source: "default" });
    // The size only earns a provenance line on a people-entered run when the households it
    // implies are actually used — i.e. a Method-2 run, where they become N_p.
    if (pop && method === 2 && pop.households !== undefined) {
      provenance.push(pop.prov);
    }
  }

  // --- unadjusted quantity (version + method aware; emits UNADJUSTED Q_pop) ---
  // --- V2 volume basis: Table 9 tiers on a PAA run unless a flat value was entered (R4) ---
  const useTable9 = input.version === "paa" && (input.volumeBasis ?? "table9") === "table9";
  const ageShares = useTable9 ? resolveAgeShares(input.countryIso, input.ageShares) : undefined;
  if (ageShares) {
    provenance.push({ field: "ageShares", label: ageShares.label, source: ageShares.source === "entered" ? "override" : ageShares.source });
    provenance.push({ field: "volume", label: `V2 Table 9 age-tiered defaults (§7.3.11, SDWS 29 Option 1)${input.suppressedDemand ? " with the suppressed-demand ×0.95" : ""}`, source: "default" });
  } else if (input.version === "paa") {
    provenance.push({ field: "volume", label: `flat per-person volume ${input.litresPerPersonPerDay} L/p/d — entered (design value or WCFT, SDWS 29 Option 2)`, source: "override" });
  }
  const q = computeQuantity({
    version: input.version, method, people,
    litresPerPersonPerDay: input.litresPerPersonPerDay,
    table9: ageShares ? { ageShares, suppressedDemand: input.suppressedDemand, label: ageShares.label } : undefined,
    operationalDays: input.operationalDays,
    meteredVolumeL: input.meteredVolumeL, usageRate: input.usageRate,
    premises: input.premises,
    deviceCapacityLPerHour: input.deviceCapacityLPerHour,
    usageHoursPerDay: input.usageHoursPerDay,
    devicesPerPremises: input.devicesPerPremises,
  });
  notes.push(...q.notes);
  if (method === 2) {
    provenance.push(q.premises != null
      ? { field: "premises", label: `N_p = ${q.premises} premises (record; SDWS 33 sales/distribution records)`, source: "default" }
      : { field: "premises", label: "N_p not entered — Eq.6 could not run; people-basis aggregate used", source: "global-default" });
    provenance.push(q.deviceLimitEvaluated
      ? { field: "device", label: `Eq.7 device term q_i · t_p · DN_p = ${q.deviceCapacityLPerDay} L/premises/day — ${q.deviceMinApplied ? "binds" : "does not bind"}`, source: "default" }
      : { field: "device", label: "device capacity q_i (SDWS 13) not entered — Eq.7 device limit not evaluated", source: "global-default" });
  }

  // --- fNRB (VERSION-SCOPED): PAA on the current vintage (override/lookup/dial); Legacy on the
  //     project's FILED V1 value, or the run refuses (R1 as amended 2026-09-24 — the
  //     "held equal" fallback is retired; see `resolveFnrbLegacy`). ---
  const fPaa = resolveFnrb(input.countryIso, input.fnrbVintage ?? fnrb.defaultVintage, input.fnrbOverride);
  const f = input.version === "legacy" ? resolveFnrbLegacy(input.fnrbFiledV1) : fPaa;
  provenance.push(f.prov);
  if (f.fired) fallbacks.push(f.fired);

  // A multi-national value comes with AMT-009's footnote 5 attached. The condition names the fuel
  // mix because that is what footnote 5 turns on, and the mix is the one this run actually used.
  const mnRegion = f.prov.label.startsWith("no national default for")
    ? f.prov.label.split("multi-national value for ")[1]
    : undefined;
  const fnrbMultiNational = mnRegion
    ? {
        region: mnRegion,
        value: f.value,
        condition: `${multiNationalFootnote5(input.fnrbVintage ?? fnrb.defaultVintage)} This project's fuel mix is ${describeFuelMix(fuelMix)}.`,
      }
    : undefined;

  const SE_o = input.SE_o ?? DEFAULT_SE_O;
  const efb = computeEfb(SE_o, f.value, stoveStrata, fuelMix, input.version); // SE / η / combined EF for the equation rows
  const C_b = input.C_b ?? 0;
  const X_cleanboil = input.X_cleanboil ?? 0; // SDWS 22 ex-ante default
  const M_qy = input.M_qy ?? 1; //               SDWS 18 default

  const legacyInput = {
    method, SE_o, fNRB: f.value, stoveStrata, fuelMix,
    Q_pop: q.Q_pop, Q_m: q.Q_m, C_b, X_cleanboil, M_qy,
    PE: input.PE, LE: input.LE, leakageFivePercent: input.leakageFivePercent,
  };
  const d = resolveDaf(input.countryIso, input.DAF);
  // PAA market leakage (V2 §9.3.2, p.38): an entered LE is a detailed assessment (Option 2, Eq.21);
  // otherwise the methodology's own default, Option 1 — 2% of net reductions (Eq.20). The choice is
  // stated to the engine and written to the trail; the engine never assumes it.
  const paaLeakage: PaaLeakage = input.LE !== undefined && input.LE !== null
    ? { option: 2, LE: input.LE }
    : { option: 1 };
  const leakageProv: Provenance = paaLeakage.option === 1
    ? { field: "leakage", label: "market leakage — Option 1 default, 2% of net reductions (V2 §9.3.2, Eq.20; SDWS 40)", source: "default" }
    : { field: "leakage", label: "market leakage — Option 2 detailed assessment, entered (V2 §9.3.2, Eq.21)", source: "override" };
  // PAA embodied emissions (V2 §9.2): the Table 10 factor for the device class, from the data file.
  const emb = input.embodied;
  const embodiedCat = emb ? EMBODIED_CATEGORIES[emb.category] : undefined;
  if (emb && !embodiedCat) throw new Error(`unknown embodied device class: ${String(emb.category)} (V2 §9.2 Table 10)`);
  const paaEmbodied = emb && embodiedCat ? { unitsInYear: emb.unitsInYear, factor: embodiedCat.factor, route: emb.route } : undefined;
  const embodiedProv: Provenance = paaEmbodied && embodiedCat
    ? { field: "embodied", label: `embodied emissions — ${embodiedCat.label}, ${embodiedCat.factor} tCO₂e/unit (V2 §9.2 Table 10), ${emb!.unitsInYear} new units, ${emb!.route === "upfront" ? "upfront (Eq.18)" : "amortised over 5 years (Eq.19)"}`, source: "default" }
    : { field: "embodied", label: "embodied emissions — not entered (V2 §9.2 requires units and device class; SDWS 41); deducted 0, flagged", source: "default" };
  const paaInput = { method, SE_o, fNRB: f.value, stoveStrata, fuelMix, Q_pop: q.Q_pop, Q_m: q.Q_m, C_b, X_cleanboil, M_qy, U_p: input.usageRate, DAF: d.value, PE: input.PE, leakage: paaLeakage, embodied: paaEmbodied };

  let result: LegacyErOutput | PaaErOutput;
  let transitionResult: LegacyErOutput | PaaErOutput | undefined;
  if (input.version === "paa") {
    provenance.push(d.prov, leakageProv, embodiedProv);
    result = computePaaEr(paaInput);
    if (input.transition) transitionResult = computeLegacyEr(legacyInput);
  } else {
    result = computeLegacyEr(legacyInput);
    if (input.transition) {
      provenance.push(d.prov, leakageProv, embodiedProv);
      transitionResult = computePaaEr(paaInput);
    }
  }
  if (input.transition) notes.push("Transition: the other version is run with the SAME baseline profile (η held constant) to isolate the methodology-structure delta (matches the reference convention).");

  return {
    version: input.version, method, mode,
    people, householdSizeUsed, qpwEffective: q.qpwEffective,
    volumeBasis: q.table9 ? "table9" : "flat",
    table9: q.table9 && ageShares ? { ageShares, tiers: q.table9.tiers, suppressedDemandApplied: q.table9.suppressedDemandApplied } : undefined,
    premises: q.premises, individualsPerPremises: q.individualsPerPremises, qpwPerPremises: q.qpwPerPremises,
    deviceLimitEvaluated: q.deviceLimitEvaluated, deviceCapacityLPerDay: q.deviceCapacityLPerDay, deviceMinApplied: q.deviceMinApplied,
    Q_pop: q.Q_pop, Q_m: q.Q_m,
    SE_o, SE: efb.SE, etaWeighted: efb.eta_weighted, combinedEF: efb.combinedEF,
    fNRB: f.value, fnrbVintage: f.vintage, fnrbMultiNational, DAF: d.value,
    stoveStrata, fuelMix,
    baselineMix: {
      stove: stoveSource,
      fuel: fuelSource,
      held: [...(edit?.held ?? []), ...(stoveSource === "entered" && fuelSource === "entered" ? [] : countryHeld)],
      country: baselineLabels,
      shares: sharesInForce,
    },
    result, transitionResult, provenance, fallbacks, notes,
  };
}

// ── transition decomposition (waterfall) ──────────────────────────────────────

export interface WaterfallStep {
  key: "eta" | "placement" | "volume" | "leakage" | "daf" | "interaction";
  label: string;
  /** Plain-English driver sentence (deterministic; cited). */
  driver: string;
  /** ER impact of this single change (tCO₂e/yr): ER_after − ER_before. */
  impact: number;
  /** Running ER after this step (tCO₂e/yr). */
  runningER: number;
}

/**
 * The "fNRB rule update (<year>)" line — Amy's amended R1 (2026-09-21; reviewer comment 2.1).
 * The fNRB change is a RULE UPDATE that applies under V1.0 and V2.0 alike, not a methodology-version
 * effect, so it is reported on its own and kept OUT of the transition table. It is the legacy (V1.0)
 * ER at the project's FILED fNRB versus the legacy ER at the current standardised-tool value. With no
 * filed value on the record it is `null`, with the reason — never an invented comparator. The year
 * and the citation come from `calculators/data/fnrb/countries.json` (`ruleUpdate`), never from code.
 */
export interface FnrbRuleUpdate {
  /** e.g. "fNRB rule update (2025)" — the year is the data file's `effective` date. */
  label: string;
  effective: string;
  /** The instrument that revised the values, cited by version, table and page (data file). */
  cite: string;
  /** The project's filed V1.0 fNRB, or null when none is on the record. */
  filedFnrb: number | null;
  /** The current standardised-tool value the V2.0 run uses (vintage lookup / dial / entered current value). */
  currentFnrb: number;
  currentSource: string;
  /** Legacy (V1.0) ER at the filed value; null when nothing is filed. */
  legacyErFiled: number | null;
  /** Legacy (V1.0) ER at the current value — where the methodology transition starts. */
  legacyErCurrent: number;
  /** ER_after − ER_before = legacyErCurrent − legacyErFiled; null when nothing is filed. */
  impact: number | null;
  /** Plain-English driver, or the honest reason the line has no number. */
  driver: string;
}

export interface TransitionWaterfall {
  /** The project's V1.0 figure as displayed: at the filed fNRB when one is on the record, else held equal. */
  legacyER: number;
  paaER: number;
  /** paaER − legacyER: the TOTAL difference (rule update + methodology transition). */
  delta: number;
  /** The fNRB rule update, reported apart from the methodology transition (amended R1). */
  fnrbRuleUpdate: FnrbRuleUpdate;
  /** Where the methodology-transition steps start: the V1.0 ER at the current fNRB (= legacyER when nothing is filed). */
  transitionStartER: number;
  /** paaER − transitionStartER: the methodology transition alone; the steps sum exactly to it. */
  transitionDelta: number;
  legacyFnrb: number;
  legacyFnrbSource: string;
  paaFnrb: number;
  paaFnrbSource: string;
  /** True when a filed V1 fNRB was supplied (else the Legacy path held fNRB equal to the V2 value — R1). */
  fnrbFiled: boolean;
  /** The methodology-transition steps (η → placement → volume → leakage → DAF); fNRB is held equal throughout. */
  steps: WaterfallStep[];
}

/**
 * Decompose the Legacy→PAA ER delta into (a) the fNRB RULE UPDATE, reported on its own, and (b) the
 * METHODOLOGY TRANSITION as ordered single-change steps (η → discount placement → volume basis →
 * leakage → DAF → interaction remainder), with fNRB held equal on both sides. Each step is
 * ENGINE-COMPUTED by re-running the scenario with one v2.0 change applied, so the sequence telescopes:
 * legacyER + ruleUpdate.impact (0 when nothing is filed) + Σ steps == paaER, EXACTLY. Endpoints are
 * the natural Legacy/PAA scenarios, so they match the calculator's displayed figures.
 * fNRB is version-scoped: Legacy takes the project's FILED V1 value, and without one there is no
 * transition to compute — this function refuses before it starts (R1 as amended, 2026-09-24).
 *
 * ⚠ THE HOLD-EQUAL *INSIDE* THE DECOMPOSITION IS A DIFFERENT THING AND STAYS. What was retired is
 * the FALLBACK that stood in for a missing filing. The steps below still re-run the legacy side at
 * the CURRENT fNRB on purpose, so the methodology change and the fNRB rule update come out as two
 * separate lines instead of one blended number — that is R1's own amendment of 2026-09-21, and it
 * needs the filed value to exist, not to be substituted for.
 */
export function computeTransitionWaterfall(input: ScenarioInput): TransitionWaterfall {
  // Ask before computing, so the refusal names the missing filing rather than surfacing from
  // somewhere deep in the decomposition with no context attached.
  const available = transitionAvailability(input.fnrbFiledV1);
  if (!available.ok) throw new FiledFnrbRequiredError(available.refusal);
  const legacy = computeScenario({ ...input, version: "legacy" });
  const paa = computeScenario({ ...input, version: "paa" });
  const legacyER = legacy.result.ER;
  const paaER = paa.result.ER;

  const legacyFnrb = legacy.fNRB;
  const paaFnrb = paa.fNRB;
  const v2Eta = paa.etaWeighted;
  const fnrbLabel = (r: ScenarioResult) => r.provenance.find((p) => p.field === "fNRB")?.label ?? `fNRB ${r.fNRB}`;
  const legacyFnrbSource = fnrbLabel(legacy);
  const paaFnrbSource = fnrbLabel(paa);
  const fnrbFiled = input.fnrbFiledV1 != null && Number.isFinite(input.fnrbFiledV1);
  const n = (x: number) => x.toFixed(4).replace(/\.?0+$/, "");
  const pctf = (x: number) => `${(x * 100).toFixed(0)}%`;

  // The fNRB rule update — OUTSIDE the transition (amended R1). V1.0 at the filed value vs V1.0 at the
  // current standardised-tool value. With nothing filed the two are the same run and the line is null.
  const er0 = legacyER;
  const er1 = computeScenario({ ...input, version: "legacy", fnrbFiledV1: paaFnrb }).result.ER;                       // V1.0 at the current fNRB
  const ru = fnrb.ruleUpdate;
  const ruleYear = ru.effective.slice(0, 4);
  const fnrbRuleUpdate: FnrbRuleUpdate = {
    label: `${ru.label} (${ruleYear})`,
    effective: ru.effective,
    cite: ru.instrument,
    filedFnrb: fnrbFiled ? legacyFnrb : null,
    currentFnrb: paaFnrb,
    currentSource: paaFnrbSource,
    legacyErFiled: fnrbFiled ? er0 : null,
    legacyErCurrent: er1,
    impact: fnrbFiled ? er1 - er0 : null,
    driver: fnrbFiled
      ? `In ${ruleYear} the standardised fNRB values were revised (${ru.instrument.split(";")[0]}). This project's filed V1.0 value is ${n(legacyFnrb)}; the current value is ${n(paaFnrb)}. The revision applies under V1.0 and V2.0 alike, so its effect is shown here, apart from the methodology transition. ${paaFnrb < legacyFnrb ? "The current value is lower, so fewer credits." : paaFnrb > legacyFnrb ? "The current value is higher, so more credits." : "The two values are equal, so no change."}`
      : `No filed V1.0 fNRB is on this project's record, so the effect of the ${ruleYear} revision cannot be shown for this project. Enter the filed value for a project-exact figure. Until then the current value (${n(paaFnrb)}) is used on both sides, and the transition below isolates the methodology changes.`,
  };

  // Sequential path — each config is the previous plus ONE v2.0 change; recompute ER. Starts at the
  // V1.0 ER with fNRB already at the current value, so fNRB is held equal through every step.
  const er2 = computeScenario({ ...input, version: "legacy", fnrbFiledV1: paaFnrb, etaOverride: v2Eta }).result.ER;   // η → V2 default
  // V2 formula on the FLAT volume first (no DAF, no leakage), so the placement step is placement only…
  const er2b = computeScenario({ ...input, version: "paa", volumeBasis: "flat", fnrbOverride: paaFnrb, etaOverride: v2Eta, DAF: 0, LE: 0, embodied: undefined }).result.ER;
  // …then the V2 volume basis (Table 9 tiers on a household run; identical to er2b when a flat value was entered).
  const er3 = computeScenario({ ...input, version: "paa", fnrbOverride: paaFnrb, etaOverride: v2Eta, DAF: 0, LE: 0, embodied: undefined }).result.ER; // + volume basis
  const er3b = computeScenario({ ...input, version: "paa", fnrbOverride: paaFnrb, etaOverride: v2Eta, DAF: 0 }).result.ER;      // + V2 leakage: market (Option 1 default, or the entered Option 2 figure) and embodied (if entered)
  const er4 = paaER;                                                                                                  // DAF (full V2)
  const leakageEntered = input.LE !== undefined && input.LE !== null;

  // Drivers read as RULE DIFFERENCES between V1 and v2.0 on the same project data — never as a
  // change over time. (Presentation truthfulness: same-period, two-rulebook comparison.)
  const steps: WaterfallStep[] = [
    { key: "eta", label: "Stove-efficiency default (η)", driver: `V1 credits at its default stove efficiency (${pctf(legacy.etaWeighted)}); v2.0 requires the V2 default (${pctf(v2Eta)}) — a more efficient baseline stove burns less fuel, so fewer credits.`, impact: er2 - er1, runningER: er2 },
    { key: "placement", label: "Discount placement (X_cleanboil / M_q)", driver: `Both rulebooks reduce credits for water that doesn't displace boiling (people who boil anyway, or water that fails quality tests). v2.0 simply applies these reductions at a different point in the math. ${Math.abs(er2b - er2) < 0.05 ? "For this project the effect is zero." : `For this project the effect is ${er2b - er2 >= 0 ? "+" : ""}${(er2b - er2).toFixed(1)} tCO₂e.`}`, impact: er2b - er2, runningER: er2b },
    { key: "volume", label: paa.volumeBasis === "table9" ? "Water volume (Table 9 age tiers)" : "Water volume (entered value)", driver: paa.volumeBasis === "table9"
        ? `v2.0 credits each person's drinking water by age (Table 9: under-5 0.9 L, 5–18 3.0 L, adults 4.0 L a day) instead of one adult figure for everyone. With ${paa.table9?.ageShares.source === "country" ? "this country's census age split" : paa.table9?.ageShares.source === "entered" ? "the project's surveyed age split" : "a global default age split"} the weighted volume is ${n(paa.qpwEffective)} L per person a day${paa.table9?.suppressedDemandApplied ? ", after the 5% suppressed-demand deduction" : ""}. A Water Consumption Field Test can replace it.`
        : `Both rulebooks use the entered per-person volume (${n(paa.qpwEffective)} L a day, capped at 5.5), so no change here.`, impact: er3 - er2b, runningER: er3 },
    { key: "leakage", label: input.embodied ? "Leakage (market 2% default + embodied)" : "Market leakage (2% default)", driver: (leakageEntered
        ? `v2.0 deducts market leakage from net reductions; this project entered a detailed assessment (Option 2, §9.3.2, Eq. 21) of ${n(input.LE as number)} tCO₂e. V1 allowed zero ex-ante.`
        : `New under v2.0: unless a detailed assessment replaces it, 2% of net reductions is deducted for market leakage (Option 1, §9.3.2, Eq. 20). V1 allowed zero ex-ante, so this is a rule change, not a project change.`)
        + (input.embodied ? ` v2.0 also deducts the devices' embodied emissions once per new unit (§9.2, Table 10; ${input.embodied.route === "upfront" ? "Eq. 18, upfront" : "Eq. 19, amortised over 5 years"}).` : " Embodied emissions (§9.2) are not yet entered for this project and are not deducted here."), impact: er3b - er3, runningER: er3b },
    { key: "daf", label: "Ambition adjustment (DAF)", driver: `New under v2.0: Gold Standard trims every project's credits by a small country-specific percentage each period, to keep credited claims deliberately conservative as the world decarbonizes. V1 had no equivalent. (DAF = ${paa.DAF.toFixed(4)}.)`, impact: er4 - er3b, runningER: er4 },
  ];
  // Residual (order-interaction). Zero by construction for the sequential path; kept for exactness.
  const interaction = paaER - (er1 + steps.reduce((s, x) => s + x.impact, 0));
  if (Math.abs(interaction) > 1e-6) {
    steps.push({ key: "interaction", label: "Interaction effects", driver: "Combined effect of the ordered rule differences, not attributable to a single factor (residual).", impact: interaction, runningER: paaER });
  }

  return {
    legacyER, paaER, delta: paaER - legacyER,
    fnrbRuleUpdate, transitionStartER: er1, transitionDelta: paaER - er1,
    legacyFnrb, legacyFnrbSource, paaFnrb, paaFnrbSource, fnrbFiled, steps,
  };
}

import type { ModuleProject } from "../../core/project";
import {
  QPW_PERSON_DEFAULT,
  defaultCharcoalConvention,
  derivePopulation,
  householdSizeKnown,
  validDevicesPerPremises,
  householdSizeNeeded,
  type CharcoalConvention, type FuelShares, type ScenarioInput, type SiteTables, type StoveShares,
} from "../engine";
import { CONDITION_LABEL, FACT_LABEL, NO_CALCULATOR_YET, type Answer } from "@waterbots/core/projectKinds";
import type { SavedAnalysis } from "./analysis";
import { technologyToMethod } from "./method";
import { readMonitoringFlags } from "./monitoring";

/** The project as Calvin receives it: the host's facts, plus Calvin's own saved analysis. */
export type CalvinProject = ModuleProject<SavedAnalysis> & {
  /**
   * WHETHER THIS PROJECT WAS ALREADY CREDITED UNDER V1.0 (ruling 2026-09-21; rulings 2026-11-16). A project
   * fact, set by the site from its own intake: on the sites, the screening sets it.
   *
   * - `true`: a transitioning project. The seat shows both versions and the transition, and asks for the
   *   project's filed V1.0 fNRB before it shows the comparison.
   * - `false` or absent: a new project, on paper or newly built. The seat shows V2.0 only: no V1.0 figure,
   *   no transition, and no ask for a V1.0 filing the project does not have.
   *
   * Absent means V2.0 only because the V2.0 figure is true for every project. Only the comparison needs a
   * V1.0 filing, so leaving it out guesses no figure.
   */
  creditedUnderV1?: boolean;
  /**
   * WHAT POWERS THE PUMP (the maintainer's walk of the open site, 2026-11-16, item 15). The site sets it from its own
   * intake. A hand pump, gravity or solar supply burns nothing to run, so the activity emissions are zero. A pump on
   * diesel or grid power gives off greenhouse gas: the seat then asks for its yearly emissions and shows no figures
   * until they are entered. Left out, the seat keeps today's zero and says when zero is right.
   */
  pumpPower?: PumpPower;
  /**
   * The site's own label for a technology that is not covered yet (core's label list, ruled 2026-11-23). The project
   * then has no `technology`, and the seat says the label is not covered yet rather than asking for it.
   */
  notCoveredYet?: string;
  /**
   * WHAT THE ONE TABLE SAYS FOR THIS PROJECT (core's `carbonAnswer`, 2026-11-25). A project under today's rules has it, and its
   * `technology` is set only where the table counts it. Left out: a project that already exists, as before.
   */
  answer?: Answer;
  /**
   * A PROJECT CREDITED UNDER V1.0: what the one table says under the 2021 version (core's `carbonAnswer`). Each version's
   * figure stands on its own conditions (the maintainer, 2026-11-25). While this one does not count the project, the seat
   * shows V2.0 on its own, and says what the V1.0 side waits for.
   */
  answerV1?: Answer;
};

/** What powers the water system's pump. */
export type PumpPower = "hand" | "gravity" | "solar" | "diesel" | "grid";

/** The ask for activity emissions: set when the pump runs on diesel or grid power and nothing is entered yet. */
export function activityEmissionsAsk(s: Pick<CalcState, "pumpPower" | "activityEmissions">): { power: "diesel" | "grid" } | null {
  if ((s.pumpPower === "diesel" || s.pumpPower === "grid") && s.activityEmissions == null) return { power: s.pumpPower };
  return null;
}

/**
 * True when the seat shows the transition: only for a project the site says was credited under V1.0, and only while the
 * 2021 version counts it. Otherwise V2.0 shows on its own conditions.
 */
export function showsTransition(project: Pick<CalvinProject, "creditedUnderV1" | "answerV1">): boolean {
  return project.creditedUnderV1 === true && (project.answerV1 === undefined || project.answerV1.says === "counted");
}

/** A change to the seat's inputs, kept to V2.0 for a project with no transition: a change of version is dropped. */
export function transitionPatch(p: Partial<CalcState>, transition: boolean): Partial<CalcState> {
  if (transition || p.version === undefined) return p;
  const { version: _dropped, ...rest } = p;
  return rest;
}

/**
 * The calculator's left-rail input state — the subset a consultant edits on the page.
 * Seeded from the saved analysis (`project.analysis`) and the project's facts, and mapped to
 * `computeScenario`'s input. Kept small and serialisable so it can be handed back to the host's
 * `onSave` as a `SavedAnalysis` (the cut, seam S1).
 */
export interface CalcState {
  version: "legacy" | "paa";
  /**
   * PROJECT FACTS ARE NULL UNTIL PROVIDED (ruling 2026-10-23): `method` (from the
   * technology), `countryIso`, `populationMode` and `populationCount`. None is guessed or defaulted;
   * with any one missing the seat computes nothing and asks for it (`missingProjectFacts`).
   */
  method: 1 | 2 | null;
  mode: "ex-ante" | "ex-post";
  countryIso: string | null;
  populationMode: "people" | "households" | null;
  /**
   * People (or households) served. NULL WHEN NOBODY HAS ENTERED IT (ruling 2026-10-23): the seat then
   * shows no figures and asks for the count. There is no stand-in number — a tonnage worked out
   * from a population nobody entered would be a figure about a project that is not this one.
   */
  populationCount: number | null;
  litresPerPersonPerDay: number;
  /**
   * Whether the per-person volume was ENTERED (design value or WCFT, SDWS 29 / V1 SDWS 24) or
   * seeded from the rulebooks' 4 L/p/d household default. The report labels it either way; the
   * v0.1.0 seat seeded a value no rulebook gives and called it a default (reviewer comment 1.4).
   */
  qpwEntered: boolean;
  /**
   * THE PROJECT'S OWN SURVEYED AGE SPLIT (SDWS 30) — undefined until somebody enters one ([#215]).
   *
   * The engine has always accepted it (`ScenarioInput.ageShares`, preferred over the country row by
   * `resolveAgeShares`), and the seat had no field to pass one, so a V2 household run was always
   * credited on the UN WPP 2024 national shares. That is an honest fallback — the held V1.0
   * questionnaire never asks an age — but it is a national CENSUS ESTIMATE standing in for this
   * project's people, and until this field existed the screen never said so.
   *
   * The three shares sum to 1; the row refuses to write a split that does not.
   */
  ageSharesEntered?: { under5: number; age5_18: number; adult19plus: number };
  /**
   * THE PROJECT'S OWN BASELINE MIX (V2.0 SDWS 6 stove shares, SDWS 8 fuel shares) — undefined until
   * somebody types on the stove or fuel rows (ruling (1), 2026-09-26). Until then the labelled
   * screening preset stands. Each list must add up to 100% or the engine holds it back and the row
   * says why; the typed figures are kept either way, so nobody loses what they entered.
   */
  stoveSharesEntered?: StoveShares;
  /** η of the fossil fuel system class — no SDWS 11 default, so it is entered with its share. */
  fossilStoveEta?: number;
  fuelSharesEntered?: Partial<FuelShares>;
  /** The V2.0 charcoal factor set (SDWS 9) the charcoal share uses. Unset = the country's pre-selection, if any. */
  charcoalConvention?: CharcoalConvention;
  operationalDays: number;
  /** Optional metered / planned supplied volume Q_m (L/yr). Method 1 only; null = no metering cap. */
  meteredVolumeL: number | null;
  /** What powers the pump, from the project record (`CalvinProject.pumpPower`). Null when the record does not say. */
  pumpPower: PumpPower | null;
  /** The pump's activity emissions a year, tCO₂e, entered for this project. Null: nothing entered. */
  activityEmissions: number | null;
  /** Water-quality modifier M_qy (fraction of samples passing; 1 ex-ante default). */
  waterQualityFactor: number;
  /** C_b — proportion already using safe water not requiring boiling (in-row; 0 default). */
  cBaseline: number;
  /** X_cleanboil — proportion still boiling the safe water after the project (in-row; 0 until surveyed). */
  xCleanboil: number;
  /** U_p — usage rate (in-row; Method 2 only; 1 assumed ex-ante until the usage survey). */
  usageRate: number;
  /** N_p — premises count (in-row; Method 2 / HWT-IWT only). Seeded from the record's units fact. */
  premises?: number;
  /** Eq.7 device term (Method 2): capacity q_i L/h, usage hours t_p (default 5), devices per premises DN_p (assumed 1). */
  deviceCapacityLPerHour?: number;
  usageHoursPerDay?: number;
  devicesPerPremises?: number;
  /** η override from the in-row control; undefined = use the version's SDWS 11 default. */
  etaOverride?: number;
  /** PAA (current) fNRB override; null/undefined = use the country × vintage lookup. */
  fnrbOverride?: number | null;
  /** Legacy (V1-filing) filed fNRB; null/undefined = held equal to the V2 value on both sides (R1). */
  fnrbFiledV1?: number | null;
  /** A project's own surveyed household size (people/household), overriding the UN 2022 country average — [#225](b). */
  householdSizeOverride?: number | null;
  /**
   * WHETHER EACH MONITORING VALUE WAS ENTERED (ruling 2026-11-21; `monitoring.ts`). False while the value is
   * still its starting value. Ex-ante, an unentered value is labelled assumed. Ex-post, an unentered value is
   * blank and the seat computes nothing until it is entered. Saved with the analysis, so a save keeps them.
   * The ex-ante sliders set the first three too.
   */
  operationalDaysEntered: boolean;
  waterQualityEntered: boolean;
  usageRateEntered: boolean;
  xCleanboilEntered: boolean;
  /** EX-ANTE SLIDERS (`exAnte.ts`): a value typed past a cited end, kept beside the held value so the row can say the credit is capped. */
  slidersTyped?: Partial<Record<"litres" | "days" | "testsPass" | "usage", number>>;
}

/**
 * THE FIELDS THE PROJECT RECORD OWNS — and the ONLY ones a record save may overwrite in a seat
 * that is already open (eyeball of ruling (3), 2026-09-22).
 *
 * Canon: *"Project facts (country, technology, population…) live on the project record; working
 * surfaces READ them and are edited only at the project page."* These three are read straight from
 * the record, with no calculator-side override that could win — so when the record moves, they
 * move. Everything else in `CalcState` seeds from the saved analysis block FIRST (`g.…`), which
 * makes it the user's own working value; a record save must never discard that.
 *
 * Split out so there is ONE definition of what the record decides, read both when the seat is
 * seeded and when the record changes underneath it. Two copies of this list would drift, and the
 * drift would be silent.
 */
/**
 * PROJECT DETAILS THAT ARRIVE AFTER THE SEAT OPENED (the maintainer's walk of the open site, 2026-11-16).
 * On the open site the calculator can open before the water system type or the people served are given.
 * When they arrive, the starting values that hang on them must move too: days of operation starts at 347
 * for a community system and 365 for a household device, and people served starts from the record.
 *
 * The rule, for every field: a value the person has not changed (it still equals the old seed) takes the
 * new seed's value; a value the person changed stays. The fields the record owns (`recordOwnedFacts`)
 * always follow the record. Nothing here does arithmetic: it only chooses between two seeds.
 */
export function followNewSeed(s: CalcState, oldSeed: CalcState, newSeed: CalcState, project: CalvinProject): CalcState {
  const out: Record<string, unknown> = { ...s };
  const keys = new Set([...Object.keys(oldSeed), ...Object.keys(newSeed)]) as Set<keyof CalcState>;
  for (const k of keys) {
    if (JSON.stringify(s[k]) === JSON.stringify(oldSeed[k])) out[k] = newSeed[k];
  }
  return { ...(out as unknown as CalcState), ...recordOwnedFacts(project) };
}

export function recordOwnedFacts(project: CalvinProject): Pick<CalcState, "countryIso" | "method" | "populationMode" | "pumpPower"> {
  const g = project.analysis ?? {};
  const country = project.country?.trim();
  return {
    // A PROJECT FACT: the record's country, else null — never an empty code
    // that a lookup would quietly resolve to something.
    countryIso: country ? country.toUpperCase() : null,
    // Method follows the TECHNOLOGY fact on the record (CWS → 1, HWT → 2); the calculator owns no
    // technology control. No technology (or "other") means NO method — never Method 1 assumed
    // (which retires decision #4's CWS fallback and the saved-method fallback).
    method: technologyToMethod(project.technology) ?? null,
    // Population MODE is a fact on the record (the calculator has no mode control). The COUNT is
    // NOT here: it seeds from a saved analysis override when one exists, so it is working state.
    // No mode on the record or in the saved analysis means null — never "people" assumed.
    populationMode: project.population?.mode ?? g.populationMode ?? null,
    // What powers the pump is a fact on the record too (item 15).
    pumpPower: project.pumpPower ?? null,
  };
}

/** A project fact the seat cannot work without, in the order a person fills them in. */
export interface ProjectFact {
  key: "technology" | "country" | "peopleServed" | "countedAs" | "householdSize";
  /** Lower case, so it drops into a sentence. */
  label: string;
}

/**
 * THE PROJECT FACTS THIS SEAT IS MISSING. Empty means it can compute. The
 * order is the paid site's record check's (technology, country, people served), with "counted as
 * people or households" last, because it only matters once there is a count.
 */
export function missingProjectFacts(s: CalcState, tables?: SiteTables): ProjectFact[] {
  const out: ProjectFact[] = [];
  if (s.method == null) out.push({ key: "technology", label: "technology" });
  if (s.countryIso == null) out.push({ key: "country", label: "country" });
  if (s.populationCount == null) out.push({ key: "peopleServed", label: "people served" });
  else if (s.populationMode == null) out.push({ key: "countedAs", label: "whether people served were counted as people or households" });
  // HOUSEHOLD SIZE, ONLY WHEN THE RUN NEEDS ONE AND NONE EXISTS (ruling 2026-10-23): the project's own,
  // else the cited UN figure for the country — never a stand-in statistic of ours.
  else if (
    s.countryIso != null &&
    householdSizeNeeded({ method: s.method, populationMode: s.populationMode, premises: s.premises }) &&
    !householdSizeKnown(s.countryIso, s.householdSizeOverride, tables)
  ) {
    out.push({ key: "householdSize", label: "household size (there is no UN figure for this country)" });
  }
  return out;
}

const listFacts = (labels: string[]) =>
  labels.length <= 1 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

/**
 * What the seat says INSTEAD OF ANY FIGURE while a project fact is missing — the paid site's
 * record-check wording, with "the project record" in place of its own page name, since a module
 * does not know the host's pages. A technology the calculator does not cover gets its own sentence:
 * it is not missing, so asking for it would be a dead end.
 */
export function missingFactsPrompt(missing: ProjectFact[], technology?: string, uncovered?: string, answer?: Answer): string | null {
  if (missing.length === 0) return null;
  const noTechnology = missing.some((f) => f.key === "technology");
  // HELD FOR NOW, NOT SET UP YET, OR A LABEL THAT IS NOT COVERED YET: nothing is missing, so nothing is asked for again.
  // One sentence for the visitor in every case (the maintainer's words, 2026-11-25). A condition of the method that is not
  // met has a short label: Calvin explains the condition, from its source.
  if (noTechnology && answer?.says === "falls short") return CONDITION_LABEL[answer.because];
  if (noTechnology && (answer === undefined ? uncovered !== undefined : answer.says !== "ask")) return NO_CALCULATOR_YET;
  if (technology === "other" && missing.some((f) => f.key === "technology")) {
    return "The calculator can't run for this project — it covers community water supply and household water treatment, and this project's technology is recorded as other.";
  }
  const it = missing.length === 1 ? "it" : "them";
  return `The calculator can't run yet — this project's record is missing ${listFacts(missing.map((f) => (f.key === "technology" && answer?.says === "ask" ? FACT_LABEL[answer.fact] : f.label)))}. Fill ${it} in on the project record and the numbers will appear here.`;
}

function positiveOrNull(n: number | undefined): number | null {
  return typeof n === "number" && n > 0 ? n : null;
}

/**
 * The people (or households) served, for a view that only exists once the count is known. The
 * seat shows its "enter people served" prompt INSTEAD of every such view, so reaching here without
 * a count is a wiring fault — it FAILS LOUDLY rather than printing a stand-in.
 */
export function peopleServed(s: CalcState): number {
  if (s.populationCount == null) throw new Error("people served is not entered; the seat shows its prompt instead of this view");
  return s.populationCount;
}

/**
 * All four project facts, for the engine. The seat computes nothing while `missingProjectFacts` is
 * non-empty, so reaching here with one missing is a wiring fault — it FAILS LOUDLY.
 */
export function projectFacts(s: CalcState, tables?: SiteTables): { method: 1 | 2; countryIso: string; populationMode: "people" | "households"; populationCount: number } {
  const missing = missingProjectFacts(s, tables);
  if (missing.length > 0) throw new Error(`project facts missing (${missing.map((f) => f.key).join(", ")}); the seat shows its prompt instead`);
  return { method: s.method!, countryIso: s.countryIso!, populationMode: s.populationMode!, populationCount: s.populationCount! };
}

export function seedCalcState(project: CalvinProject): CalcState {
  const g = project.analysis ?? {};
  const enteredQpw = g.litresPerPersonPerDay ?? project.lpcd;
  return {
    ...recordOwnedFacts(project),
    // PAA v2.0 primary; legacy is the transition comparison, and only a transitioning project has one.
    version: showsTransition(project) ? (g.version ?? "paa") : "paa",
    mode: g.mode ?? "ex-ante",
    // COUNT seeds from a saved analysis override if one exists (persists with provenance vs
    // canon), else the record fact. canonPopulation (the fact) drives the in-row override provenance.
    // With neither, it is NULL and the seat asks for it. A count of zero is the field's empty state
    // written as a number, not a fact, so only a positive count on the record counts.
    populationCount: g.populationCount ?? positiveOrNull(project.population?.served),
    // The per-person volume: the record's design/measured value if it has one, else THE RULEBOOKS'
    // OWN DEFAULT (V1 SDWS 24 4 L; V2 Table 9 adults 4.0) — never the v0.1.0 seat's value, which is nobody's default.
    litresPerPersonPerDay: enteredQpw ?? QPW_PERSON_DEFAULT,
    qpwEntered: g.qpwEntered ?? enteredQpw !== undefined,
    ageSharesEntered: g.ageSharesEntered,
    stoveSharesEntered: g.stoveSharesEntered,
    fossilStoveEta: g.fossilStoveEta,
    fuelSharesEntered: g.fuelSharesEntered,
    charcoalConvention: g.charcoalConvention,
    operationalDays: g.operationalDays ?? 365,
    meteredVolumeL: g.meteredVolumeL ?? null,
    activityEmissions: g.activityEmissions ?? null,
    waterQualityFactor: g.mQuality ?? 1,
    cBaseline: g.cBaseline ?? 0,
    xCleanboil: g.xCleanboil ?? 0,
    usageRate: g.usageRate ?? 1,
    // N_p — households served (Method 2). A SAVED ANALYSIS FIGURE ONLY: the record's households
    // come from its ONE count, through `effectivePremises`, in whichever direction it was entered.
    //
    // ⚠ IT NO LONGER READS `scale.units` (rule, 2026-09-24: *a real value lives in one
    // place*). That field is the CWS water-point count now and has no box on a household project;
    // reading it here would let a second, stale figure quietly outrank the count on the record.
    premises: g.premises,
    deviceCapacityLPerHour: g.deviceCapacityLPerHour,
    usageHoursPerDay: g.usageHoursPerDay,
    // DN_p: a saved value is used only if it is a whole number, 1 or more (ruling 2026-10-23).
    devicesPerPremises: validDevicesPerPremises(g.devicesPerPremises) ? g.devicesPerPremises : undefined,
    etaOverride: g.etaOverride,
    fnrbOverride: g.fnrbOverride,
    fnrbFiledV1: g.fnrbFiledV1,
    // Household size: a saved analysis figure wins, else the RECORD's own (glossary,
    // 2026-09-24 — it is a project fact), else undefined and the cited UN average is used.
    householdSizeOverride: g.householdSizeOverride ?? project.population?.householdSize,
    ...readMonitoringFlags(g),
    slidersTyped: g.slidersTyped,
  };
}

/** Map the left-rail state back to the analysis the host saves (Save → `onSave`). */
export function toSavedAnalysis(s: CalcState): SavedAnalysis {
  return {
    version: s.version,
    method: s.method ?? undefined,
    mode: s.mode,
    populationMode: s.populationMode ?? undefined,
    populationCount: s.populationCount ?? undefined,
    litresPerPersonPerDay: s.litresPerPersonPerDay,
    qpwEntered: s.qpwEntered,
    ageSharesEntered: s.ageSharesEntered,
    stoveSharesEntered: s.stoveSharesEntered,
    fossilStoveEta: s.fossilStoveEta,
    fuelSharesEntered: s.fuelSharesEntered,
    charcoalConvention: s.charcoalConvention,
    operationalDays: s.operationalDays,
    meteredVolumeL: s.meteredVolumeL,
    activityEmissions: s.activityEmissions,
    mQuality: s.waterQualityFactor,
    cBaseline: s.cBaseline,
    xCleanboil: s.xCleanboil,
    usageRate: s.usageRate,
    premises: s.premises,
    deviceCapacityLPerHour: s.deviceCapacityLPerHour,
    usageHoursPerDay: s.usageHoursPerDay,
    devicesPerPremises: s.devicesPerPremises,
    etaOverride: s.etaOverride,
    fnrbOverride: s.fnrbOverride,
    fnrbFiledV1: s.fnrbFiledV1,
    householdSizeOverride: s.householdSizeOverride,
    operationalDaysEntered: s.operationalDaysEntered,
    mQualityEntered: s.waterQualityEntered,
    usageRateEntered: s.usageRateEntered,
    xCleanboilEntered: s.xCleanboilEntered,
    slidersTyped: s.slidersTyped,
  };
}

/**
 * The premises count the engine gets for a Method 2 run: an entered N_p wins; otherwise, when the
 * population is entered as households, the household count IS N_p (V2 Eq.6, SDWS 33). The v0.1.0
 * seat passed nothing here for the demo project and printed "—" for the one number it had
 * (reviewer comment 1.1).
 */
export function effectivePremises(s: CalcState, tables?: SiteTables): number | undefined {
  if (s.method !== 2) return undefined;
  if (s.premises != null && s.premises > 0) return s.premises;
  // A missing project fact means nothing to derive.
  if (s.populationCount == null || s.countryIso == null || s.populationMode == null) return undefined;
  // BOTH DIRECTIONS, and the rule is the ENGINE's — called rather than copied, so the seat's N_p,
  // the record's box and the credited figure can never drift ([#225]). Entered as households, the
  // households ARE N_p; entered as people, N_p is people ÷ the household size (the maintainer withdrew the
  // "nothing fires on People" instruction on 2026-09-24: for HWT/IWT the households are always
  // knowable, and without them Eq.6 cannot run at all).
  return derivePopulation({
    countryIso: s.countryIso,
    method: s.method,
    populationMode: s.populationMode,
    populationCount: s.populationCount,
    householdSizeOverride: s.householdSizeOverride,
  }, tables)?.households;
}

/**
 * A SPLIT THAT DOES NOT ADD UP IS NOT PASSED TO THE ENGINE ([#215]).
 *
 * The age-split row lets all three shares be typed, and a half-typed split is the normal state
 * while somebody is typing: change one share and the three briefly sum to less than one. Handing that
 * to `resolveAgeShares` would credit the missing people at nothing and print a weighted volume
 * nobody asked for, silently.
 *
 * So the seat holds what was typed, SAYS on the row that it does not add up, and the engine keeps
 * the last split that did. This function is the single place that decides, because the row's
 * warning and this guard have to agree — a screen that says "not used" while the number IS used is
 * the mock-data failure one level down.
 *
 * Tolerance is 0.005 (half a percentage point), matching the row's own test, so three thirds
 * rounded to one decimal pass and a genuinely wrong split does not.
 */
export function validAgeShares(
  entered: CalcState["ageSharesEntered"],
): CalcState["ageSharesEntered"] {
  if (!entered) return undefined;
  const { under5, age5_18, adult19plus } = entered;
  if (![under5, age5_18, adult19plus].every((v) => Number.isFinite(v) && v >= 0)) return undefined;
  return Math.abs(under5 + age5_18 + adult19plus - 1) < 0.005 ? entered : undefined;
}

/**
 * Three anticipated values exactly as the engine is given them. `toScenarioInput` uses this, and the
 * sliders read the credited value from it, so the two can never differ.
 */
export function anticipatedInput(s: CalcState): Pick<ScenarioInput, "operationalDays" | "M_qy" | "usageRate"> {
  return { operationalDays: s.operationalDays, M_qy: s.waterQualityFactor, usageRate: s.method === 2 ? s.usageRate : undefined };
}

/**
 * Map the left-rail state to a full ScenarioInput (transition on → both versions). `tables` is the
 * site's own country tables (V13), passed by `useCalculatorState`: it decides whether a household size
 * is known, and the charcoal default.
 */
export function toScenarioInput(s: CalcState, tables?: SiteTables): ScenarioInput {
  const facts = projectFacts(s, tables);
  return {
    version: s.version,
    method: facts.method,
    mode: s.mode,
    countryIso: facts.countryIso,
    populationMode: facts.populationMode,
    populationCount: facts.populationCount,
    litresPerPersonPerDay: s.litresPerPersonPerDay,
    // V2 volume basis (R4): Table 9 age tiers with the country's census shares unless a per-person
    // value was ENTERED (design or WCFT), in which case the flat value is the project's own.
    volumeBasis: s.qpwEntered ? "flat" : "table9",
    // SDWS 30: a surveyed split wins over the country's census shares inside `resolveAgeShares`.
    // Only a Table 9 run reads it, so an entered flat QPW makes it moot rather than conflicting.
    ageShares: validAgeShares(s.ageSharesEntered),
    ...anticipatedInput(s),
    // Q_m is a Method 1 (CWT/CWS) parameter — SDWS 28; the engine ignores it for Method 2 too.
    meteredVolumeL: s.method === 1 ? (s.meteredVolumeL ?? null) : null,
    C_b: s.cBaseline,
    X_cleanboil: s.xCleanboil,
    // The pump's activity emissions, when entered (item 15). The engine's own input; left out, it is zero.
    PE: s.activityEmissions ?? undefined,
    premises: effectivePremises(s, tables),
    deviceCapacityLPerHour: s.method === 2 ? s.deviceCapacityLPerHour : undefined,
    usageHoursPerDay: s.method === 2 ? s.usageHoursPerDay : undefined,
    devicesPerPremises: s.method === 2 && validDevicesPerPremises(s.devicesPerPremises) ? s.devicesPerPremises : undefined,
    etaOverride: s.etaOverride,
    fnrbOverride: s.fnrbOverride,
    fnrbFiledV1: s.fnrbFiledV1,
    householdSizeOverride: s.householdSizeOverride,
    preset: "traditional-wood-cws", // default profile; a preset picker can come later
    // The typed stove/fuel shares. The ENGINE applies the 100% guard (`resolveBaselineEdit`) so the
    // row's warning and the number in force can never disagree.
    baselineEdit: s.stoveSharesEntered || s.fuelSharesEntered
      ? {
          stoveShares: s.stoveSharesEntered,
          fossilStoveEta: s.fossilStoveEta,
          fuelShares: s.fuelSharesEntered,
          charcoalConvention: s.charcoalConvention ?? defaultCharcoalConvention(facts.countryIso, tables),
        }
      : undefined,
    // For a charcoal share that comes from the COUNTRY DEFAULT rather than a typed box ([#227]).
    charcoalConvention: s.charcoalConvention ?? defaultCharcoalConvention(facts.countryIso, tables),
    // The country default's freshness (V2.0 SDWS 6/8, three years from the data year) is judged
    // against today's year — a date, not a methodology value, so the seat may supply it.
    asOfYear: new Date().getFullYear(),
    // version + transition are set per-version by the client (it computes both).
  };
}

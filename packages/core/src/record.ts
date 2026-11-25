/**
 * THE SHARED PROJECT RECORD (J3; agent rule 10). One record for one project. Every agent reads it and adds its own
 * facts and results, and the paid site reads it. The proposal is `docs/proposals/shared-project-record.md`.
 *
 * `core` holds only the record's shape and its checks, never a project's data. The data lives on the site: on the
 * open site it stays in the visit until the visitor saves; on the paid site it is the Project Record page. In the
 * Agent Commons an agent may build a temporary record of the same shape from what the visitor types.
 *
 * A project fact is never guessed. While it is missing it is left out: a blank never counts as zero. Every value says
 * where it came from.
 */
import type { Technology } from "./project";
import {
  KINDS_SINCE,
  KIND_FACTS,
  NEEDS_EVIDENCE,
  PROJECT_RULES,
  carbonAnswerFor,
  carbonVersions,
  kindFactsOf,
  kindRow,
  readKindFacts,
  waterAnswerFor,
  type Answer,
  type CarbonVersion,
  type GivenKindFacts,
  type KindFact,
  type Treatment,
  type WaterSource,
} from "./projectKinds.js";
import { checkRange, rangeMessage } from "./ranges.js";
import type { StandardId } from "./standards";
import { TECHNOLOGY_CLASSES, TECHNOLOGY_LABELS, technologyCoverage, technologyOfClass, waterCoverage, type TechnologyClass } from "./technologyLabels.js";

/** The shape's version. A site can tell an older record from a newer one. */
export const RECORD_VERSION = 1 as const;

/** The five agents. */
export const AGENTS = ["wellington", "phoebe", "bridget", "calvin", "violet"] as const;
export type AgentId = (typeof AGENTS)[number];

/** A pathway's reading. Never "ruled out". */
export const READINGS = ["likely", "more to learn", "unlikely"] as const;
export type Reading = (typeof READINGS)[number];

/** Who set a value, and from what. */
export interface Source {
  by: "person" | "site intake" | AgentId;
  note: string;
}

/** One project fact with where it came from. */
export interface Fact<T> {
  value: T;
  source: Source;
}

/** One pathway's reading, with its reason and what would change it. Written by the eligibility agent. */
export interface PathwayReading {
  reading: Reading;
  /** Why, in plain words. */
  reason: string;
  /** What would change the reading, in plain words: a missing fact, or a change to the project. */
  wouldChange: string;
  /** "more to learn" only: the information that is missing. */
  missing?: readonly string[];
  source: Source;
}

/** People served, as they were entered. No unit is ever filled in on its own (J6). */
export interface Population {
  /** Whether `served` counts people or households. Left out until the person says. */
  mode?: "people" | "households";
  /** The count, in whichever `mode` it was entered. */
  served?: number;
  /** People per household, when the project has its own figure. */
  householdSize?: number;
}

/** The project facts: what the person tells us about the project. */
export interface ProjectFacts {
  name?: string;
  /** The site's own label, word for word, and the code the label list gives it (none when the list does not know it). */
  technology?: { label: string; code?: Technology; source: Source };
  population?: Fact<Population>;
  /** Litres per person a day, when the project has its own figure. */
  lpcd?: Fact<number>;
  pumpPower?: Fact<"hand" | "gravity" | "solar" | "diesel" | "grid">;
  /** Already credited under the carbon method's V1.0: a transitioning project. */
  creditedUnderV1?: Fact<boolean>;
  accessLevel?: Fact<"full" | "limited">;
  /** Water the supply gave each year before the project, in m³. 0 for a new supply. */
  withoutProjectM3PerYear?: Fact<number>;
  /** What the project does, in the visitor's own words. */
  does?: Fact<string>;
  /** The one project type it matches: an id from the sites' shared list. */
  type?: Fact<ProjectTypeId>;
  /** The kind of drinking-water technology. Only beside type C-19. */
  technologyClass?: Fact<TechnologyClass>;
  /** Where the project is in its life. */
  stage?: Fact<ProjectStage>;
  /** Whether people use the water at home. Asked of a new or alternative supply, which could be reuse or irrigation. */
  homeUse?: Fact<HomeUse>;
  /**
   * THE VERSION OF THE PROJECT RULES these facts were given under (`PROJECT_RULES`). A new project has it from the start
   * (`newProjectRecord`), or from the first fact about its source or technology. A project made before these rules has
   * none, and keeps its old answers. A site saves it and hands it back as it came; it never fills one in.
   */
  rules?: number;
  /** A new source, one brought back after it had stopped, or one people already use. */
  waterSource?: Fact<WaterSource>;
  /** Where the project treats the water. */
  treatment?: Fact<Treatment>;
  /** Each of these is asked only when it applies (`projectKinds.ts`). */
  sourceSafe?: Fact<boolean>;
  outThreeMonths?: Fact<boolean>;
  repairPlanned?: Fact<boolean>;
  noRepairThreeMonths?: Fact<boolean>;
  publicPiped?: Fact<boolean>;
  pipedShownUnsafe?: Fact<boolean>;
}

/** Whether people use the water at home. "not sure" is an answer: nobody is asked again, and nothing is counted yet. */
export const HOME_USES = ["yes", "no", "not sure"] as const;
export type HomeUse = (typeof HOME_USES)[number];

/** The project types both sites list: the guidebook's C-1 to C-20, and none of these. */
export const PROJECT_TYPE_IDS = [
  "C-1", "C-2", "C-3", "C-4", "C-5", "C-6", "C-7", "C-8", "C-9", "C-10",
  "C-11", "C-12", "C-13", "C-14", "C-15", "C-16", "C-17", "C-18", "C-19", "C-20",
  "NONE",
] as const;
export type ProjectTypeId = (typeof PROJECT_TYPE_IDS)[number];

/** The one type that also has a class. */
export const DRINKING_WATER_TYPE = "C-19" satisfies ProjectTypeId;
/** A new or alternative water supply. Covered for the water pathway for home use; it has no technology code yet. */
export const NEW_SUPPLY_TYPE = "C-11" satisfies ProjectTypeId;

/** On paper, being built, or already running. */
export const PROJECT_STAGES = ["paper", "building", "running"] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

/** The longest text a fact in the visitor's own words may hold. A longer one is left out whole, never cut. */
export const TEXT_LIMITS = { name: 160, does: 280, placeWords: 160 } as const;

/** Place facts. Bridget adds the basin. */
export interface PlaceFacts {
  /** ISO 3166-1 alpha-3. */
  country?: Fact<string>;
  region?: Fact<string>;
  /** Where it is, in the visitor's own words. Never used to look a value up. */
  words?: Fact<string>;
  /** The river basin the person pinned on Bridget's map, with the map's own reading of it. */
  basin?: Fact<Basin>;
}

/** A pinned basin, as the map reads it. The map's data stays with the site. */
export interface Basin {
  /** The basin's id in the map's data. */
  id: number;
  /** The size of basin the map was showing. */
  level: 4 | 6;
  areaKm2: number;
  /** The map's water-stress label, word for word. */
  stressLabel: string;
}

/** An agent's estimate. Always the engine's answer; the record only keeps it. */
export interface Estimate {
  figure: number;
  unit: string;
  method: string;
  engineVersion: string;
  /** Such as "Draft — pending expert review". */
  standing?: string;
}

/** Each agent's own part of the record. */
export interface AgentPart {
  /** The agent's saved inputs. Their shape belongs to the agent. */
  inputs?: unknown;
  estimate?: Estimate;
  /** Questions the agent asked the person on this walk. A fact read from the record is not a question. */
  questionsAsked?: number;
  /** The agent has done its task and reported back to Wellington. */
  done?: boolean;
  /**
   * The person's notes on the agent's values, by the value's key (J5, one calculator screen). Written on the Paid
   * site, to give context to a number. An agent never writes here.
   */
  notes?: ValueNotes;
}

/** The longest note, in characters. */
export const NOTE_LIMIT = 2000;

/** A person's note on one value. */
export interface ValueNote {
  text: string;
  /** Who wrote it: a role, never a person's name. Left out on a note written before this was kept: a person. */
  by?: Source["by"];
  /** When the note was last changed, as an ISO date and time. */
  changed: string;
  /** The value's name when the note was written, so an export can name it. No number is kept here. */
  label?: string;
}

/** The person's notes on one agent's values, by the value's key. */
export type ValueNotes = Record<string, ValueNote>;

// ── Phoebe's rows ───────────────────────────────────────────────────────────────────────────────────────────────

/** A row's state. `applies` and `does-not-apply` are for a row that says whether the pathway is in play at all. */
export const ROW_STATES = ["unchecked", "met", "fixable", "unknown", "blocked", "applies", "does-not-apply"] as const;
export type RowState = (typeof ROW_STATES)[number];

export interface EligibilityRow {
  state: RowState;
  /** The one sentence the state carries. */
  because?: string;
  /** Route-card ids, on a fixable row. */
  routes?: string[];
}

/** One pack's rows, by the row's own id. A row that is not here has not been looked at: that is never a verdict. */
export interface EligibilitySheet {
  rows: Record<string, EligibilityRow>;
  /** The class and the version her own tests settled. */
  sorts?: string[];
}

/** The longest sentence a row may carry. */
export const BECAUSE_LIMIT = 500;

/**
 * Reads one pack's rows as they came, keeping only what holds: a state on the list, and a sentence that is not too
 * long. A row that does not hold is left out whole. Which row ids a pack has is Phoebe's to check, with her worksheet.
 */
export function readEligibilitySheet(value: unknown): EligibilitySheet {
  const out: EligibilitySheet = { rows: {} };
  if (typeof value !== "object" || value === null) return out;
  const { rows, sorts } = value as { rows?: unknown; sorts?: unknown };
  if (typeof rows === "object" && rows !== null) {
    for (const [id, raw] of Object.entries(rows as Record<string, unknown>)) {
      if (typeof raw !== "object" || raw === null) continue;
      const r = raw as { state?: unknown; because?: unknown; routes?: unknown };
      const state = ROW_STATES.find((x) => x === r.state);
      const because = typeof r.because === "string" ? r.because.trim() : "";
      if (state === undefined || because.length > BECAUSE_LIMIT) continue;
      const routes = Array.isArray(r.routes) ? r.routes.filter((x): x is string => typeof x === "string") : [];
      out.rows[id] = { state, ...(because ? { because } : {}), ...(routes.length > 0 ? { routes } : {}) };
    }
  }
  const words = Array.isArray(sorts) ? sorts.filter((x): x is string => typeof x === "string") : [];
  if (words.length > 0) out.sorts = words;
  return out;
}

/** Writes one pack's rows. Returns a new record; the one handed in is not changed. */
export function setEligibilitySheet(record: ProjectRecord, pack: string, sheet: unknown): ProjectRecord {
  const out = structuredClone(record);
  out.eligibility = { ...out.eligibility, [pack]: readEligibilitySheet(sheet) };
  return out;
}

export interface ProjectRecord {
  recordVersion: typeof RECORD_VERSION;
  facts: ProjectFacts;
  pathways: Partial<Record<StandardId, PathwayReading>>;
  place: PlaceFacts;
  agents: Partial<Record<AgentId, AgentPart>>;
  /** The eligibility worksheet, by its pack: Phoebe's rows as she set them. The reading comes from them, never from her words. */
  eligibility?: Record<string, EligibilitySheet>;
  /** The version of the agent map last run on this record. */
  mapVersion?: number;
}

// ── New projects and projects that already exist (2026-11-25) ────────────────────────────────────────────────────

/** True for a project under today's rules: its kind is worked out from its facts, never from a label. */
export function underTodaysRules(facts: ProjectFacts): boolean {
  return (facts.rules ?? 0) >= KINDS_SINCE;
}

/**
 * True for a project that already exists: made before these rules, with a technology, a type or a figure on its record. It
 * keeps its old answers until its owner changes a fact the rules touch, or chooses to redo it. A site does nothing to
 * say so: it hands back the record as it was saved, with no `facts.rules`.
 */
export function projectExists(record: Pick<ProjectRecord, "facts" | "agents">): boolean {
  const { rules, technology, type, technologyClass } = record.facts;
  if (rules !== undefined) return rules < KINDS_SINCE;
  return technology !== undefined || type !== undefined || technologyClass !== undefined || Object.values(record.agents).some((a) => a?.estimate !== undefined || a?.inputs !== undefined);
}

/** Whether these are a drinking-water project's facts, and whether home use still has to be said. Null: yes, and no. */
function drinkingWater(facts: ProjectFacts, askHomeUse: boolean): Answer | null {
  const { type, technology, homeUse } = facts;
  const other: Answer = { says: "another kind of project" };
  if (type !== undefined && type.value !== DRINKING_WATER_TYPE && type.value !== NEW_SUPPLY_TYPE) return other;
  if (technology?.code === "other") return other;
  if (homeUse?.value === "no") return other;
  if (homeUse?.value === "yes") return null;
  // A community supply's own label, or the drinking-water type, has already said it.
  const label = technology === undefined ? "not known" : waterCoverage(technology.label);
  const couldBeOther = label === "covered for home use" || (type?.value === NEW_SUPPLY_TYPE && label !== "covered");
  if (!couldBeOther && (!askHomeUse || type?.value === DRINKING_WATER_TYPE || label !== "not known")) return null;
  return homeUse?.value === "not sure" ? { says: "held for now" } : { says: "ask", fact: "homeUse" };
}

/**
 * What Calvin does with a project under today's rules, read from the one table. A restored source's conditions are those of
 * the version in use: `versions` names them, and left out they follow the record.
 */
export function carbonAnswer(facts: ProjectFacts, versions: readonly CarbonVersion[] = carbonVersions(facts)): Answer {
  const scope = drinkingWater(facts, false);
  if (scope?.says === "another kind of project") return scope;
  const a = carbonAnswerFor(kindFactsOf(facts), versions);
  return a.says === "counted" && scope !== null ? scope : a;
}

/** What Violet does with a project under today's rules, read from the one table. */
export function waterAnswer(facts: ProjectFacts): Answer {
  const scope = drinkingWater(facts, true);
  if (scope?.says === "another kind of project") return scope;
  const a = waterAnswerFor(kindFactsOf(facts));
  return a.says === "counted" && scope !== null ? scope : a;
}

/**
 * True when today's rules would give a project that already exists a different answer. It keeps its old one; its screen
 * shows a plain note that a newer way exists, with a choice to redo it (`redoUnderTodaysRules`).
 */
export function newerWay(record: Pick<ProjectRecord, "facts" | "agents">, pathway: StandardId): boolean {
  if (underTodaysRules(record.facts) || !projectExists(record)) return false;
  const { technology, type, technologyClass, homeUse } = record.facts;
  const label = technology?.label ?? technologyOfFacts(type?.value, technologyClass?.value)?.label;
  const kinds = TECHNOLOGY_LABELS.find((t) => label !== undefined && t.label.toLowerCase() === label.trim().toLowerCase())?.kinds ?? [];
  if (kinds.length === 0 || homeUse?.value === "no") return false;
  // Only carbon's answers changed with version 1 of the rules.
  return pathway === "carbon" && recordTechnology(record) === undefined && kinds.every((k) => kindRow(k).carbon.code !== null);
}

/** The plain note on a project that already exists, where `newerWay` is true. */
export const NEWER_WAY_NOTE = "There is now a newer way to work this out. Your project keeps its answer unless you choose to redo it.";

/** The choice to redo it: the project moves to today's rules. Its facts stay, and the agents ask for what is missing. */
export function redoUnderTodaysRules(record: ProjectRecord): ProjectRecord {
  const out = structuredClone(record);
  out.facts.rules = PROJECT_RULES;
  return out;
}

/**
 * The technology code an agent may work with. Under today's rules it is worked out from the project facts, and a label
 * cannot change it. A project that already exists keeps the code it was saved with; a label that is not covered yet has
 * none.
 */
export function recordTechnology(record: Pick<ProjectRecord, "facts">): Technology | undefined {
  if (underTodaysRules(record.facts)) {
    const a = carbonAnswer(record.facts);
    return a.says === "counted" ? a.code : undefined;
  }
  const t = record.facts.technology;
  return t === undefined || technologyCoverage(t.label) === "not covered yet" ? undefined : t.code;
}

/**
 * The technology the open facts name: the class beside a drinking-water type, or a type that is not covered yet. Null
 * when they name none. A site writes it on the record with its source, so both sites read a project the same way.
 */
export function technologyOfFacts(type: ProjectTypeId | undefined, technologyClass: TechnologyClass | undefined): { label: string; code?: Technology } | null {
  if (type === NEW_SUPPLY_TYPE) return { label: "New or alternative water supply" };
  if (type !== DRINKING_WATER_TYPE || technologyClass === undefined) return null;
  const { label, code } = technologyOfClass(technologyClass);
  return { label, ...(code !== undefined ? { code } : {}) };
}

/**
 * Whether Violet's D-3 counts the project, from the facts as they stand. "another kind of project": the guidebook has
 * other methods for it, or the project is neither a supply nor treatment. "not known": the facts do not say yet.
 */
export type WaterSupply = "covered" | "not covered yet" | "another kind of project" | "not known";

/** A table answer, in the map's words. "ask" is not known yet, and "held for now" is not covered yet. */
function supplyOf(a: Answer): WaterSupply {
  if (a.says === "counted") return "covered";
  if (a.says === "ask") return "not known";
  return a.says === "another kind of project" || a.says === "not set up yet" ? "another kind of project" : "not covered yet";
}

/**
 * Whether Calvin is called for the project. A blank fact of his own, or a method condition the project does not meet yet,
 * keeps him called: he asks, or shows how to fix it. A project that already exists is as it was.
 */
export function recordCarbon(facts: ProjectFacts): WaterSupply | "not set up yet" {
  if (!underTodaysRules(facts)) return "covered";
  const a = carbonAnswer(facts);
  if (a.says === "ask") return (a.fact === "waterSource" || a.fact === "treatment") && a.fix !== true ? "not known" : "covered";
  if (a.says === "counted" || a.says === "falls short") return "covered";
  return a.says === "held for now" ? "not covered yet" : a.says;
}

/** What each fact that names a technology says about water, and the label it says it by. */
function waterAnswers(facts: ProjectFacts): { label: string; says: WaterSupply }[] {
  const named = [facts.technology ?? null, technologyOfFacts(facts.type?.value, facts.technologyClass?.value)].filter((t) => t !== null);
  return named.map(({ label, code }) => {
    const listed = waterCoverage(label);
    if (listed === "covered for home use") {
      const home = facts.homeUse?.value;
      return { label, says: home === "yes" ? "covered" : home === "no" ? "another kind of project" : home === "not sure" ? "not covered yet" : "not known" };
    }
    if (listed !== "not known") return { label, says: listed };
    // A label the list does not know: only a code the site gave it can say.
    return { label, says: code === "CWS" ? "covered" : code === "other" ? "another kind of project" : "not covered yet" };
  });
}

/**
 * Violet is called for the kinds of project that give people water, and for nothing else (ruled 2026-11-24). Where two
 * facts disagree, or a label is not on the list and has no code, it is not sure, so she has nothing to count yet. A
 * new or alternative supply is asked first whether people use the water at home.
 */
export function recordWaterSupply(facts: ProjectFacts): WaterSupply {
  if (underTodaysRules(facts)) return supplyOf(waterAnswer(facts));
  const type = facts.type?.value;
  if (type !== undefined && type !== DRINKING_WATER_TYPE && type !== NEW_SUPPLY_TYPE) return "another kind of project";
  const says = waterAnswers(facts).map((a) => a.says);
  return says.find((x) => x === "another kind of project" || x === "not covered yet") ?? says.find((x) => x === "covered") ?? "not known";
}

/** True when the one thing Violet's method still needs to know is whether people use the water at home. */
export function needsHomeUse(facts: ProjectFacts): boolean {
  if (underTodaysRules(facts)) {
    const a = waterAnswer(facts);
    return a.says === "ask" && a.fact === "homeUse";
  }
  return recordWaterSupply(facts) === "not known" && waterAnswers(facts).length > 0;
}

/** The site's own label for a technology Violet's method does not count yet, or null. */
export function waterNotCovered(facts: ProjectFacts): string | null {
  if (underTodaysRules(facts)) return recordWaterSupply(facts) === "not covered yet" ? (facts.technology?.label ?? null) : null;
  return recordWaterSupply(facts) === "not covered yet" ? (waterAnswers(facts).find((a) => a.says === "not covered yet")?.label ?? null) : null;
}

/** A new project's record: every fact blank, under today's rules. A site starts every new project with it. */
export function newProjectRecord(): ProjectRecord {
  return { ...emptyRecord(), facts: { rules: PROJECT_RULES } };
}

/** An empty record: every fact blank, no reading, no agent part. */
export function emptyRecord(): ProjectRecord {
  return { recordVersion: RECORD_VERSION, facts: {}, pathways: {}, place: {}, agents: {} };
}

// ── The fact check ───────────────────────────────────────────────────────────────────────────────────────────────
// One check for every number a person enters. The host runs it where the fact is entered and refuses a fact that
// fails, before it reaches the record. An agent handed a record runs `checkRecord` and says what is wrong, rather
// than calling the fact missing. The check gives a code, never words: each agent says it in its own words.

/** The numbers the check covers. */
export type CheckedFact = "population.served" | "population.householdSize" | "lpcd" | "withoutProjectM3PerYear";

/** Why a number is refused. */
export type Problem = "not a number" | "below zero" | "zero" | "not a whole number";

export type EntryCheck = { ok: true } | { ok: false; fact: CheckedFact; problem: Problem };

/** Checks one number where it is entered, against its range (`ranges.ts`). A count below zero is refused. */
export function checkEntry(fact: CheckedFact, value: unknown): EntryCheck {
  const c = checkRange(fact, value);
  // These four values have no top, so "outside the range" never comes up for them.
  return c.ok ? { ok: true } : { ok: false, fact, problem: c.problem as Problem };
}

/** The message for a fact the check refused: the value's name and its range. A count of households says so. */
export function entryMessage(fact: CheckedFact, mode?: Population["mode"]): string {
  return rangeMessage(fact, fact === "population.served" && mode === "households" ? { name: "Households served" } : {});
}

/** Every number in a record that fails the check. Empty means the record's numbers are fine. Blanks are not checked. */
export function checkRecord(record: ProjectRecord): Array<Extract<EntryCheck, { ok: false }>> {
  const { facts } = record;
  const entries: Array<[CheckedFact, unknown]> = [];
  const pop = facts.population?.value;
  if (pop?.served !== undefined) entries.push(["population.served", pop.served]);
  if (pop?.householdSize !== undefined) entries.push(["population.householdSize", pop.householdSize]);
  if (facts.lpcd !== undefined) entries.push(["lpcd", facts.lpcd.value]);
  if (facts.withoutProjectM3PerYear !== undefined) entries.push(["withoutProjectM3PerYear", facts.withoutProjectM3PerYear.value]);
  return entries.map(([fact, value]) => checkEntry(fact, value)).filter((c): c is Extract<EntryCheck, { ok: false }> => !c.ok);
}

// ── Adding to the record ─────────────────────────────────────────────────────────────────────────────────────────
// Agent rule 10: an agent checks the record first and asks only for what is missing. It adds the facts it asked for,
// and its results. A fact already on the record is never changed here: it is edited where the host keeps it. Each
// fact an agent adds is one question it asked; a fact read from the record is not a question.

/** Every fact an agent may add, named by where it sits in the record. */
export const FACT_KEYS = [
  "name",
  "technology",
  "population.served",
  "population.mode",
  "population.householdSize",
  "lpcd",
  "pumpPower",
  "creditedUnderV1",
  "accessLevel",
  "withoutProjectM3PerYear",
  "country",
  "region",
  "basin",
  "does",
  "type",
  "technologyClass",
  "stage",
  "placeWords",
  "homeUse",
  ...KIND_FACTS,
] as const;
export type FactKey = (typeof FACT_KEYS)[number];

/** Facts as the person gave them to an agent. Each has the record's shape, without its source. */
export interface GivenFacts extends GivenKindFacts {
  name?: string;
  technology?: { label: string; code?: Technology };
  /** As entered. A count with no `mode` stays that way: no unit is filled in on its own (J6). */
  population?: Population;
  lpcd?: number;
  pumpPower?: "hand" | "gravity" | "solar" | "diesel" | "grid";
  creditedUnderV1?: boolean;
  accessLevel?: "full" | "limited";
  withoutProjectM3PerYear?: number;
  country?: string;
  region?: string;
  basin?: Basin;
  does?: string;
  type?: ProjectTypeId;
  technologyClass?: TechnologyClass;
  stage?: ProjectStage;
  homeUse?: HomeUse;
  /** Where it is, in the visitor's own words. */
  placeWords?: string;
}

/** True when the record does not hold this fact yet. */
export function isBlank(record: ProjectRecord, key: FactKey): boolean {
  const { facts, place } = record;
  const pop = facts.population?.value;
  switch (key) {
    case "name":
      return facts.name === undefined;
    case "technology":
      return facts.technology === undefined;
    case "population.served":
      return pop?.served === undefined;
    case "population.mode":
      return pop?.mode === undefined;
    case "population.householdSize":
      return pop?.householdSize === undefined;
    case "country":
      return place.country === undefined;
    case "region":
      return place.region === undefined;
    case "basin":
      return place.basin === undefined;
    case "placeWords":
      return place.words === undefined;
    default:
      return facts[key] === undefined;
  }
}

/** The needed facts the record does not hold yet, in the order given. Each agent names the facts it needs. */
export function blankFacts(record: ProjectRecord, needed: readonly FactKey[]): FactKey[] {
  return needed.filter((k) => isBlank(record, k));
}

export interface AddedFacts {
  /** A new record. The one handed in is not changed. */
  record: ProjectRecord;
  /** The facts added. Each one counts as a question the agent asked. */
  added: FactKey[];
  /** Numbers that failed the fact check. They are not added; the agent says what is wrong, in its own words. */
  refused: Array<Extract<EntryCheck, { ok: false }>>;
  /** Facts left out whole: a text too long, a word not on its list, or a class beside a type that has none. */
  dropped: FactKey[];
}

/** The first fact about what kind of project it is puts a blank record under today's rules. */
function stampRules(out: ProjectRecord): void {
  if (out.facts.rules === undefined && !projectExists(out)) out.facts.rules = PROJECT_RULES;
}

function setKindFact(facts: ProjectFacts, key: KindFact, value: WaterSource | Treatment | boolean, source: Source): void {
  const note = NEEDS_EVIDENCE.includes(key) ? `${source.note}; evidence will be needed` : source.note;
  Object.assign(facts, { [key]: { value, source: { ...source, note } } });
}

/**
 * Adds the facts the person gave an agent. Only blank facts are filled; a fact already on the record stays as it is.
 * Each number is checked first, and one that fails is refused. The agent's question count goes up by one for each
 * fact added. A project that already exists takes no fact about its kind here: its owner gives it on the Project Record
 * page (`changeFacts`), so nothing said in a chat changes its answer.
 */
export function addGivenFacts(record: ProjectRecord, agent: AgentId, given: GivenFacts): AddedFacts {
  const out = structuredClone(record);
  const added: FactKey[] = [];
  const refused: AddedFacts["refused"] = [];
  const dropped: FactKey[] = [];
  const source: Source = { by: "person", note: `given to ${agent}` };
  const checked = (fact: CheckedFact, value: number): boolean => {
    const c = checkEntry(fact, value);
    if (!c.ok) refused.push(c);
    return c.ok;
  };
  const blank = (key: FactKey): boolean => isBlank(out, key);
  const { facts, place } = out;

  /** A text in the visitor's own words, trimmed; a blank one or one past its limit is left out whole. */
  const text = (key: keyof typeof TEXT_LIMITS, value: string | undefined): string | undefined => {
    if (value === undefined || !blank(key)) return undefined;
    const t = value.trim();
    if (t === "" || t.length > TEXT_LIMITS[key]) {
      dropped.push(key);
      return undefined;
    }
    return t;
  };
  const listed = <T extends string>(key: FactKey, list: readonly T[], value: T | undefined): T | undefined => {
    if (value === undefined || !blank(key)) return undefined;
    if (!list.includes(value)) dropped.push(key);
    return list.includes(value) ? value : undefined;
  };

  const name = text("name", given.name);
  if (name !== undefined) {
    facts.name = name;
    added.push("name");
  }
  const does = text("does", given.does);
  if (does !== undefined) {
    facts.does = { value: does, source };
    added.push("does");
  }
  const old = projectExists(out);
  const kind = readKindFacts(given);
  for (const key of KIND_FACTS) {
    if (given[key] === undefined || !blank(key)) continue;
    const value = kind[key];
    if (value === undefined || old) {
      dropped.push(key);
      continue;
    }
    stampRules(out);
    setKindFact(facts, key, value, source);
    added.push(key);
  }
  const type = listed("type", PROJECT_TYPE_IDS, given.type);
  if (type !== undefined) {
    stampRules(out);
    facts.type = { value: type, source };
    added.push("type");
  }
  // A class is a fact about a drinking-water project and nothing else.
  const technologyClass = listed("technologyClass", TECHNOLOGY_CLASSES, given.technologyClass);
  if (technologyClass !== undefined) {
    if (facts.type?.value === DRINKING_WATER_TYPE) {
      facts.technologyClass = { value: technologyClass, source };
      added.push("technologyClass");
    } else dropped.push("technologyClass");
  }
  const stage = listed("stage", PROJECT_STAGES, given.stage);
  if (stage !== undefined) {
    facts.stage = { value: stage, source };
    added.push("stage");
  }
  const homeUse = listed("homeUse", HOME_USES, given.homeUse);
  if (homeUse !== undefined) {
    facts.homeUse = { value: homeUse, source };
    added.push("homeUse");
  }
  if (given.technology !== undefined && blank("technology")) {
    // A label that is not covered yet gets no code, whoever hands one in.
    const { code, label } = given.technology;
    stampRules(out);
    facts.technology = { label, ...(code !== undefined && technologyCoverage(label) !== "not covered yet" ? { code } : {}), source };
    added.push("technology");
  }
  if (given.population !== undefined) {
    const pop: Population = { ...facts.population?.value };
    const before = added.length;
    const { served, mode, householdSize } = given.population;
    if (served !== undefined && blank("population.served") && checked("population.served", served)) {
      pop.served = served;
      added.push("population.served");
    }
    if (mode !== undefined && blank("population.mode")) {
      pop.mode = mode;
      added.push("population.mode");
    }
    if (householdSize !== undefined && blank("population.householdSize") && checked("population.householdSize", householdSize)) {
      pop.householdSize = householdSize;
      added.push("population.householdSize");
    }
    if (added.length > before) {
      // One source for the count: a part already on the record keeps who gave it, and the note says what was added.
      const was = facts.population?.source;
      const note = `${added.slice(before).join(", ")} given to ${agent}`;
      facts.population = { value: pop, source: was === undefined ? source : { by: was.by, note: `${was.note}; ${note}` } };
    }
  }
  if (given.lpcd !== undefined && blank("lpcd") && checked("lpcd", given.lpcd)) {
    facts.lpcd = { value: given.lpcd, source };
    added.push("lpcd");
  }
  if (given.pumpPower !== undefined && blank("pumpPower")) {
    facts.pumpPower = { value: given.pumpPower, source };
    added.push("pumpPower");
  }
  if (given.creditedUnderV1 !== undefined && blank("creditedUnderV1")) {
    facts.creditedUnderV1 = { value: given.creditedUnderV1, source };
    added.push("creditedUnderV1");
  }
  if (given.accessLevel !== undefined && blank("accessLevel")) {
    facts.accessLevel = { value: given.accessLevel, source };
    added.push("accessLevel");
  }
  if (given.withoutProjectM3PerYear !== undefined && blank("withoutProjectM3PerYear") && checked("withoutProjectM3PerYear", given.withoutProjectM3PerYear)) {
    facts.withoutProjectM3PerYear = { value: given.withoutProjectM3PerYear, source };
    added.push("withoutProjectM3PerYear");
  }
  if (given.country !== undefined && blank("country")) {
    place.country = { value: given.country, source };
    added.push("country");
  }
  if (given.region !== undefined && blank("region")) {
    place.region = { value: given.region, source };
    added.push("region");
  }
  const words = text("placeWords", given.placeWords);
  if (words !== undefined) {
    place.words = { value: words, source };
    added.push("placeWords");
  }
  if (given.basin !== undefined && blank("basin")) {
    place.basin = { value: { ...given.basin }, source };
    added.push("basin");
  }

  if (added.length > 0) {
    const part = out.agents[agent] ?? {};
    out.agents[agent] = { ...part, questionsAsked: (part.questionsAsked ?? 0) + added.length };
  }
  return { record: out, added, refused, dropped };
}

// ── When the facts change (2026-11-25) ───────────────────────────────────────────────────────────────────────────

export interface ChangedFacts extends AddedFacts {
  /** The facts whose answer changed: those the kind is worked out from, and home use. */
  changed: (KindFact | "homeUse")[];
  /** A saved project: kind facts the visitor changed in a chat. They stay as they are; the owner changes them on the Project Record page. */
  onRecordPage: (KindFact | "homeUse")[];
  /** The agents whose figure no longer fits. It is off the record, and their part is not done. */
  figuresOff: AgentId[];
}

/** What each calculator would work with, to see whether its figure still fits. */
function fits(record: ProjectRecord): { calvin: string; violet: string } {
  return { calvin: recordTechnology(record) ?? "", violet: recordWaterSupply(record.facts) === "covered" ? (record.facts.waterSource?.value ?? "covered") : "" };
}

/** Takes off a figure that no longer fits the facts. The inputs stay, so nothing a person typed is lost. */
function takeOff(before: ProjectRecord, after: ProjectRecord): AgentId[] {
  // A project that already exists keeps every figure it has.
  if (!underTodaysRules(after.facts)) return [];
  const was = fits(before);
  const now = fits(after);
  return (["calvin", "violet"] as const).filter((a) => {
    if (was[a] === now[a] && now[a] !== "") return false;
    const part = after.agents[a];
    if (part === undefined || (part.estimate === undefined && part.done !== true)) return false;
    delete part.estimate;
    if (part.done === true) part.done = false;
    return true;
  });
}

/** The facts the rules read. */
const TOUCHED: readonly FactKey[] = [...KIND_FACTS, "type", "technology", "technologyClass", "homeUse", "creditedUnderV1"];

/**
 * THE VISITOR CHANGES A FACT (2026-11-25). In a screening, what they say in any agent's chat changes the record, the kind is
 * worked out again, and a figure that no longer fits comes off. On a saved project only the owner changes it, on the
 * Project Record page: there the site passes `by: "owner"`, which also moves a project made before these rules to them.
 * Facts that are not about the kind are added as ever, only where blank. Returns a new record.
 */
export function changeFacts(record: ProjectRecord, agent: AgentId, given: GivenFacts, options: { saved?: boolean; by?: "agent" | "owner" } = {}): ChangedFacts {
  const owner = options.by === "owner";
  const start = structuredClone(record);
  const wanted = readKindFacts(given);
  const onRecordPage: ChangedFacts["onRecordPage"] = [];
  const changed: ChangedFacts["changed"] = [];
  const differs = KIND_FACTS.filter((k) => wanted[k] !== undefined && start.facts[k]?.value !== wanted[k]);
  if (owner && differs.length > 0) start.facts.rules = PROJECT_RULES;
  const old = projectExists(start);
  for (const key of differs) {
    const onRecord = start.facts[key] !== undefined;
    if (!owner && (old || (options.saved === true && onRecord))) onRecordPage.push(key);
    else if (onRecord) {
      setKindFact(start.facts, key, wanted[key]!, { by: "person", note: owner ? "changed on the Project Record page" : `changed in ${agent}'s chat` });
      changed.push(key);
    }
  }
  // Home use is read by the rules too, and changes the same way. A project that already exists may still be told it once.
  const was = start.facts.homeUse?.value;
  if (given.homeUse !== undefined && was !== undefined && was !== given.homeUse && HOME_USES.includes(given.homeUse)) {
    if (!owner && (old || options.saved === true)) onRecordPage.push("homeUse");
    else {
      start.facts.homeUse = { value: given.homeUse, source: { by: "person", note: owner ? "changed on the Project Record page" : `changed in ${agent}'s chat` } };
      changed.push("homeUse");
    }
  }
  // The water the source gave before the project was said about the other source, so it is asked again.
  if (changed.includes("waterSource") && given.withoutProjectM3PerYear === undefined) delete start.facts.withoutProjectM3PerYear;
  const rest: GivenFacts = { ...given };
  for (const key of onRecordPage) delete rest[key];
  const out = addGivenFacts(start, agent, rest);
  const touched = changed.length > 0 || out.added.some((k) => TOUCHED.includes(k));
  return { ...out, changed, onRecordPage, figuresOff: touched ? takeOff(record, out.record) : [] };
}

// ── The save ticket (2026-11-25) ─────────────────────────────────────────────────────────────────────────────────

/** The kind facts and the rules they were given under, as they cross from a screening to a saved project. */
export interface KindTicket extends GivenKindFacts {
  rules?: number;
}

/** What a site puts in its save ticket. Plain values, so it can be stored as it is. */
export function kindTicket(record: Pick<ProjectRecord, "facts">): KindTicket {
  return { ...kindFactsOf(record.facts), ...(record.facts.rules !== undefined ? { rules: record.facts.rules } : {}) };
}

/** Reads a save ticket back on to a record. A value that does not hold is left out; a fact already there stays. */
export function addKindTicket(record: ProjectRecord, ticket: unknown): ProjectRecord {
  const out = structuredClone(record);
  const rules = typeof ticket === "object" && ticket !== null ? (ticket as { rules?: unknown }).rules : undefined;
  if (out.facts.rules === undefined && typeof rules === "number" && Number.isInteger(rules) && rules >= 1 && rules <= PROJECT_RULES) out.facts.rules = rules;
  const given = readKindFacts(ticket);
  for (const key of KIND_FACTS) {
    const value = given[key];
    if (value !== undefined && out.facts[key] === undefined) setKindFact(out.facts, key, value, { by: "person", note: "given in the screening" });
  }
  return out;
}

/** An agent's results for the record. `estimate: null` clears an estimate that no longer holds. */
export interface AgentResults {
  inputs?: unknown;
  estimate?: Estimate | null;
  done?: boolean;
}

/**
 * Writes an agent's results to its own part of the record: its inputs, its estimate and whether it is done. Its
 * question count stays as it is. Returns a new record; the one handed in is not changed.
 */
export function setAgentResults(record: ProjectRecord, agent: AgentId, results: AgentResults): ProjectRecord {
  const out = structuredClone(record);
  const part: AgentPart = { ...out.agents[agent] };
  if (results.inputs !== undefined) part.inputs = structuredClone(results.inputs);
  if (results.estimate === null) delete part.estimate;
  else if (results.estimate !== undefined) part.estimate = { ...results.estimate };
  if (results.done !== undefined) part.done = results.done;
  out.agents[agent] = part;
  return out;
}

// ── Notes on values (J5, one calculator screen) ─────────────────────────────────────────────────────────────────

/** The person's notes on an agent's values. Empty when there are none. */
export function valueNotes(record: ProjectRecord, agent: AgentId): ValueNotes {
  return { ...(record.agents[agent]?.notes ?? {}) };
}

/** The words for a note that is too long. */
export const NOTE_TOO_LONG = `A note can be up to ${NOTE_LIMIT.toLocaleString("en-US")} characters.`;

/** Who wrote a note. One written before the writer was kept was a person's. */
export function noteBy(note: ValueNote): Source["by"] {
  return note.by ?? "person";
}

/**
 * Writes the person's note on one of an agent's values. An empty note removes it, and one past the limit changes nothing. Returns a new record; the one
 * handed in is not changed. Nothing is saved here: the site saves the record when the person chooses (rulings 5).
 */
export function setValueNote(record: ProjectRecord, agent: AgentId, key: string, text: string, changed: string, label?: string): ProjectRecord {
  const out = structuredClone(record);
  const part: AgentPart = { ...out.agents[agent] };
  const notes = withNote(part.notes ?? {}, key, text, changed, label);
  if (Object.keys(notes).length === 0) delete part.notes;
  else part.notes = notes;
  out.agents[agent] = part;
  return out;
}

/** The notes with one note set and its writer named, or removed when its text is empty. The notes handed in are not changed. */
export function withNote(notes: ValueNotes, key: string, text: string, changed: string, label?: string, by: Source["by"] = "person"): ValueNotes {
  const out = { ...notes };
  const trimmed = text.trim();
  // A note past the limit is not cut: the note stays as it was, and the box says why (`NOTE_TOO_LONG`).
  if (trimmed.length > NOTE_LIMIT) return out;
  if (trimmed === "") delete out[key];
  else out[key] = label !== undefined ? { text: trimmed, changed, by, label } : { text: trimmed, changed, by };
  return out;
}

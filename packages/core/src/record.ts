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
import type { StandardId } from "./standards";

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
}

/** Place facts. The map agent adds the point and the basin later. */
export interface PlaceFacts {
  /** ISO 3166-1 alpha-3. */
  country?: Fact<string>;
  region?: Fact<string>;
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

/** A person's note on one value. */
export interface ValueNote {
  text: string;
  /** When the note was last changed, as an ISO date and time. */
  changed: string;
  /** The value's name when the note was written, so an export can name it. No number is kept here. */
  label?: string;
}

/** The person's notes on one agent's values, by the value's key. */
export type ValueNotes = Record<string, ValueNote>;

export interface ProjectRecord {
  recordVersion: typeof RECORD_VERSION;
  facts: ProjectFacts;
  pathways: Partial<Record<StandardId, PathwayReading>>;
  place: PlaceFacts;
  agents: Partial<Record<AgentId, AgentPart>>;
  /** The version of the agent map last run on this record. */
  mapVersion?: number;
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

/** What each number must be. */
const RULES: Record<CheckedFact, { whole: boolean; zeroAllowed: boolean }> = {
  // A count of people or households: a whole number, at least 1.
  "population.served": { whole: true, zeroAllowed: false },
  // People per household: above zero; it may be an average such as 4.6.
  "population.householdSize": { whole: false, zeroAllowed: false },
  // A volume can't be below zero.
  lpcd: { whole: false, zeroAllowed: true },
  // 0 for a brand-new supply.
  withoutProjectM3PerYear: { whole: false, zeroAllowed: true },
};

/** Checks one number where it is entered. A count below zero is refused. */
export function checkEntry(fact: CheckedFact, value: unknown): EntryCheck {
  const rule = RULES[fact];
  if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, fact, problem: "not a number" };
  if (value < 0) return { ok: false, fact, problem: "below zero" };
  if (value === 0 && !rule.zeroAllowed) return { ok: false, fact, problem: "zero" };
  if (rule.whole && !Number.isInteger(value)) return { ok: false, fact, problem: "not a whole number" };
  return { ok: true };
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
] as const;
export type FactKey = (typeof FACT_KEYS)[number];

/** Facts as the person gave them to an agent. Each has the record's shape, without its source. */
export interface GivenFacts {
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
}

/**
 * Adds the facts the person gave an agent. Only blank facts are filled; a fact already on the record stays as it is.
 * Each number is checked first, and one that fails is refused. The agent's question count goes up by one for each
 * fact added.
 */
export function addGivenFacts(record: ProjectRecord, agent: AgentId, given: GivenFacts): AddedFacts {
  const out = structuredClone(record);
  const added: FactKey[] = [];
  const refused: AddedFacts["refused"] = [];
  const source: Source = { by: "person", note: `given to ${agent}` };
  const checked = (fact: CheckedFact, value: number): boolean => {
    const c = checkEntry(fact, value);
    if (!c.ok) refused.push(c);
    return c.ok;
  };
  const blank = (key: FactKey): boolean => isBlank(out, key);
  const { facts, place } = out;

  if (given.name !== undefined && blank("name")) {
    facts.name = given.name;
    added.push("name");
  }
  if (given.technology !== undefined && blank("technology")) {
    facts.technology = { ...given.technology, source };
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

  if (added.length > 0) {
    const part = out.agents[agent] ?? {};
    out.agents[agent] = { ...part, questionsAsked: (part.questionsAsked ?? 0) + added.length };
  }
  return { record: out, added, refused };
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

/**
 * Writes the person's note on one of an agent's values. An empty note removes it. Returns a new record; the one
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

/** The notes with one note set, or removed when its text is empty. The notes handed in are not changed. */
export function withNote(notes: ValueNotes, key: string, text: string, changed: string, label?: string): ValueNotes {
  const out = { ...notes };
  const trimmed = text.trim();
  if (trimmed === "") delete out[key];
  else out[key] = label !== undefined ? { text: trimmed, changed, label } : { text: trimmed, changed };
  return out;
}

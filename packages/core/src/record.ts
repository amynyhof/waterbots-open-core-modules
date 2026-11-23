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
}

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

// Violet and the shared project record (J3; agent rule 10).
//
// Violet reads the record first, and asks only for what it does not hold. She adds the facts she asked for, and her
// results: her inputs and her water figure, with its standing. A fact read from the record is not a question.
//
// People served keep the way they were entered. A count with no unit stays that way, and she asks: "people" is never
// filled in on its own (J6). Nothing here does a sum: the figure written to the record is the engine's answer.

import type { ModuleProject } from "@waterbots/core/project";
import {
  blankFacts,
  changeFacts,
  checkRecord,
  setAgentResults,
  type ChangedFacts,
  type EntryCheck,
  type FactKey,
  type GivenFacts,
  type ProjectRecord,
} from "@waterbots/core/record";
import { D3_ENGINE_VERSION } from "./d3/defaults.js";
import { D3_STATUS, type D3Input, type D3Option, type D3Result, type D3View } from "./d3/types.js";

/** The record facts Violet's tool needs for each way of working out the volume. Meter and flow readings are hers. */
const NEEDS: Record<D3Option, readonly FactKey[]> = {
  beneficiaries: ["population.served", "population.mode", "accessLevel", "withoutProjectM3PerYear"],
  capacity: ["withoutProjectM3PerYear"],
  metered: ["withoutProjectM3PerYear"],
};

/**
 * The facts Violet needs that the record does not hold yet (agent rule 11: a needed fact left blank stays blank).
 * People per household is needed only when the count is of households.
 */
export function violetNeeds(record: ProjectRecord, option: D3Option = "beneficiaries"): FactKey[] {
  const needed: FactKey[] = [...NEEDS[option]];
  if (option === "beneficiaries" && record.facts.population?.value.mode === "households") needed.push("population.householdSize");
  return blankFacts(record, needed);
}

/** Violet's project, read from the record, for her screen. Nothing is filled in that the record does not hold. */
export function violetProjectFromRecord(record: ProjectRecord): ModuleProject {
  const project: ModuleProject = { name: record.facts.name ?? "", standards: [] };
  if (record.facts.population !== undefined) project.population = { ...record.facts.population.value };
  return project;
}

/** Numbers on the record that Violet reads and the fact check refuses, such as people served below zero (W1). */
export function violetRecordProblems(record: ProjectRecord): Array<Extract<EntryCheck, { ok: false }>> {
  return checkRecord(record).filter((p) => p.fact !== "lpcd");
}

/**
 * Violet's starting input, read from the record: people served as entered, the access level and the water the supply
 * gave before the project. Facts the record does not hold stay unset: awaited. A number the fact check refuses is
 * left out too, and `violetRecordProblems` names it.
 */
export function d3InputFromRecord(record: ProjectRecord, view: D3View): D3Input {
  const input: D3Input = { view, option: view === "ex-post" ? "metered" : "beneficiaries" };
  const refused = new Set(violetRecordProblems(record).map((p) => p.fact));
  const pop = record.facts.population?.value;
  if (pop !== undefined) {
    const population: NonNullable<D3Input["population"]> = {};
    if (pop.mode !== undefined) population.mode = pop.mode;
    if (pop.served !== undefined && !refused.has("population.served")) population.served = pop.served;
    if (pop.householdSize !== undefined && !refused.has("population.householdSize")) population.householdSize = pop.householdSize;
    if (Object.keys(population).length > 0) input.population = population;
  }
  if (record.facts.accessLevel !== undefined) input.accessLevel = record.facts.accessLevel.value;
  const without = record.facts.withoutProjectM3PerYear?.value;
  if (without !== undefined && !refused.has("withoutProjectM3PerYear")) input.withoutProjectM3PerYear = without;
  return input;
}

/** The project facts in Violet's input, for `addVioletFacts`. Readings and sliders are hers, not project facts. */
export function violetGivenFacts(input: D3Input): GivenFacts {
  const given: GivenFacts = {};
  if (input.population !== undefined) given.population = { ...input.population };
  if (input.accessLevel !== undefined) given.accessLevel = input.accessLevel;
  if (input.withoutProjectM3PerYear !== undefined) given.withoutProjectM3PerYear = input.withoutProjectM3PerYear;
  return given;
}

/**
 * Adds the facts the person gave Violet. Only blank facts are added, and each one counts as a question. A fact about the
 * source or the treatment that the visitor changes is changed (core's `changeFacts`); on a saved project (`saved`) it stays,
 * and `onRecordPage` names it.
 */
export function addVioletFacts(record: ProjectRecord, given: GivenFacts, options: { saved?: boolean } = {}): ChangedFacts {
  return changeFacts(record, "violet", given, options);
}

/**
 * Writes Violet's results to her part of the record: her input, and the engine's water figure with its standing when
 * there is one. With no figure (something is still awaited), an old figure is cleared.
 */
export function addVioletResults(record: ProjectRecord, results: { input: D3Input; result: D3Result; done?: boolean }): ProjectRecord {
  const figure = results.result.vwbM3PerYear;
  const estimate =
    figure === null ? null : { figure, unit: "m³ a year", method: "vwba-d3", engineVersion: D3_ENGINE_VERSION, standing: D3_STATUS };
  return setAgentResults(record, "violet", {
    inputs: results.input,
    estimate,
    ...(results.done !== undefined ? { done: results.done } : {}),
  });
}

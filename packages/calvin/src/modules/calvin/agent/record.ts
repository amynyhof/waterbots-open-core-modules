/**
 * CALVIN AND THE SHARED PROJECT RECORD (J3; agent rule 10). Added by this repo, not part of the seed.
 *
 * Calvin reads the record first, and asks only for what it does not hold. He adds the facts he asked for, and his
 * results: his saved inputs and his V2.0 figure. A fact read from the record is not a question.
 *
 * People served keep the way they were entered. When the record has a count and no unit, Calvin's project has none
 * either, and he asks: "people" is never filled in on its own (J6).
 *
 * Nothing here does a sum. The figure written to the record is the engine's answer, as it came.
 */
import type { StandardId } from "@waterbots/core/standards";
import {
  addGivenFacts,
  blankFacts,
  checkEntry,
  setAgentResults,
  type AddedFacts,
  type EntryCheck,
  type FactKey,
  type GivenFacts,
  type ProjectRecord,
} from "@waterbots/core/record";
import { GS4GG_CALCULATOR_VERSION, type ScenarioResult } from "../engine";
import type { SavedAnalysis } from "../screen/analysis";
import type { CalcState, CalvinProject } from "../screen/state";

/**
 * The record facts Calvin's tool needs before it can run, in the order a person fills them in. Household size is
 * needed too, but only for a country with no UN figure, and only the calculator knows that: it asks then.
 */
export const CALVIN_NEEDS: readonly FactKey[] = ["technology", "country", "population.served", "population.mode"];

/** The facts Calvin needs that the record does not hold yet (agent rule 11: a needed fact left blank stays blank). */
export function calvinNeeds(record: ProjectRecord): FactKey[] {
  return blankFacts(record, CALVIN_NEEDS);
}

/** Calvin's project, read from the record. Nothing is filled in that the record does not hold. */
export function calvinProjectFromRecord(record: ProjectRecord): CalvinProject {
  const { facts, place, pathways } = record;
  const standards = (Object.keys(pathways) as StandardId[]).filter((p) => {
    const reading = pathways[p]?.reading;
    return reading !== undefined && reading !== "unlikely";
  });
  const project: CalvinProject = { name: facts.name ?? "", standards };
  if (facts.technology?.code !== undefined) project.technology = facts.technology.code;
  if (place.country !== undefined) project.country = place.country.value;
  if (place.region !== undefined) project.region = place.region.value;
  if (facts.population !== undefined) project.population = { ...facts.population.value };
  if (facts.lpcd !== undefined) project.lpcd = facts.lpcd.value;
  if (facts.creditedUnderV1 !== undefined) project.creditedUnderV1 = facts.creditedUnderV1.value;
  if (facts.pumpPower !== undefined) project.pumpPower = facts.pumpPower.value;
  const saved = record.agents.calvin?.inputs;
  if (saved !== undefined) project.analysis = structuredClone(saved) as SavedAnalysis;
  return project;
}

/**
 * A count on the project that the fact check refuses, such as people served below zero (W1). Calvin says what is
 * wrong with it, rather than calling it missing. Blanks are not checked.
 */
export function calvinRecordProblems(project: Pick<CalvinProject, "population">): Array<Extract<EntryCheck, { ok: false }>> {
  const out: Array<Extract<EntryCheck, { ok: false }>> = [];
  const pop = project.population;
  if (pop?.served !== undefined) {
    const c = checkEntry("population.served", pop.served);
    if (!c.ok) out.push(c);
  }
  if (pop?.householdSize !== undefined) {
    const c = checkEntry("population.householdSize", pop.householdSize);
    if (!c.ok) out.push(c);
  }
  return out;
}

/**
 * The project facts Calvin's screen holds, for `addCalvinFacts`: people served, how they were counted and people per
 * household. Only a fact the record lacks is added. His other inputs are his own, kept in his part of the record.
 */
export function calvinGivenFacts(state: Pick<CalcState, "populationCount" | "populationMode" | "householdSizeOverride">): GivenFacts {
  const population: NonNullable<GivenFacts["population"]> = {};
  if (state.populationCount != null) population.served = state.populationCount;
  if (state.populationMode != null) population.mode = state.populationMode;
  if (state.householdSizeOverride != null) population.householdSize = state.householdSizeOverride;
  return Object.keys(population).length > 0 ? { population } : {};
}

/** Adds the facts the person gave Calvin. Only blank facts are added, and each one counts as a question. */
export function addCalvinFacts(record: ProjectRecord, given: GivenFacts): AddedFacts {
  return addGivenFacts(record, "calvin", given);
}

/**
 * Writes Calvin's results to his part of the record: his saved inputs, and the engine's V2.0 figure when there is
 * one. With no figure (a fact is still missing), an old figure is cleared, so the record never keeps one that no
 * longer holds.
 */
export function addCalvinResults(
  record: ProjectRecord,
  results: { analysis: SavedAnalysis; paaResult: ScenarioResult | null; done?: boolean },
): ProjectRecord {
  const estimate =
    results.paaResult === null
      ? null
      : { figure: results.paaResult.result.ER, unit: "tCO2e a year", method: "carbon-v2.0", engineVersion: GS4GG_CALCULATOR_VERSION };
  return setAgentResults(record, "calvin", {
    inputs: results.analysis,
    estimate,
    ...(results.done !== undefined ? { done: results.done } : {}),
  });
}

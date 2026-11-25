// How Violet's screen reads the project record: what it opens on, what it follows, and the messages for a number the
// fact check refuses. No React, no sums.

import type { ModuleProject } from "@waterbots/core/project";
import { checkEntry, entryMessage, type ProjectRecord } from "@waterbots/core/record";
import type { D3Input, D3View } from "../d3/types.js";
import { violetRecordProblems } from "../record.js";

/**
 * A count the record holds and the fact check accepts, or nothing. Zero is an empty field written as a number, not a
 * fact (as in Calvin).
 */
function accepted(fact: "population.served" | "population.householdSize", n: number | undefined): number | undefined {
  return n !== undefined && checkEntry(fact, n).ok ? n : undefined;
}

/** The messages for numbers on the record that the fact check refuses. They are never used (ruled 2026-11-23). */
export function recordRefusals(project: ModuleProject | undefined, record?: ProjectRecord): string[] {
  const mode = project?.population?.mode;
  if (record !== undefined) return violetRecordProblems(record).filter((p) => p.problem !== "zero").map((p) => entryMessage(p.fact, mode));
  return (["served", "householdSize"] as const).flatMap((k) => {
    const v = project?.population?.[k];
    const c = v === undefined || v === 0 ? null : checkEntry(`population.${k}`, v);
    return c === null || c.ok ? [] : [entryMessage(c.fact, mode)];
  });
}

/**
 * People served, from the project record, the way Calvin takes it (0.5.0): only a count above zero counts, with
 * whether it counts people or households, and people per household when the record has them. Nothing is guessed. A
 * number the fact check refuses is left out, and `recordRefusals` gives its message.
 */
export function recordPopulation(project: ModuleProject | undefined): D3Input["population"] {
  const pop = project?.population;
  if (pop === undefined) return undefined;
  const served = accepted("population.served", pop.served);
  const householdSize = accepted("population.householdSize", pop.householdSize);
  const out = {
    ...(pop.mode !== undefined ? { mode: pop.mode } : {}),
    ...(served !== undefined ? { served } : {}),
    ...(householdSize !== undefined ? { householdSize } : {}),
  };
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The record's facts, as the screen's starting input. Facts the record does not hold stay unset: awaited. */
export function seedD3Input(project: ModuleProject | undefined, view: D3View): D3Input {
  const input: D3Input = { view, option: view === "ex-post" ? "metered" : "beneficiaries" };
  const population = recordPopulation(project);
  if (population !== undefined) input.population = population;
  return input;
}

/**
 * The input with people served as the record now gives them (0.5.0). Every other value stays as it is. The record
 * is the one place people served are kept, so a count that leaves the record leaves the input too.
 */
export function followRecord(input: D3Input, project: ModuleProject | undefined): D3Input {
  const next = { ...input };
  const population = recordPopulation(project);
  if (population === undefined) delete next.population;
  else next.population = population;
  return next;
}

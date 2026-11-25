// Which projects D-3 counts, for her tool, her chat and her screen. The answer is core's, read from the one table
// (`recordWaterSupply`, `waterAnswer`), the same one the agent map calls her by, so she refuses the same projects at every
// door. A project's kind is worked out from its facts (decided by the maintainer on 2026-11-25). A project that already
// exists keeps the answer its label gave it.

import { HOME_USES, NEW_SUPPLY_TYPE, needsHomeUse, recordWaterSupply, technologyOfFacts, underTodaysRules, waterAnswer, waterNotCovered, type GivenFacts, type HomeUse, type ProjectFacts } from "@waterbots/core/record";
import { NO_CALCULATOR_YET, factsWithKind, readKindFacts, type GivenKindFacts } from "@waterbots/core/projectKinds";
import { TECHNOLOGY_CLASSES, technologyOfClass } from "@waterbots/core/technologyLabels";

/** The labels a project that already exists may have: the four drinking-water classes, and a new or alternative supply. */
export const D3_TECHNOLOGIES = [...TECHNOLOGY_CLASSES, NEW_SUPPLY_TYPE] as const;
export type D3Technology = (typeof D3_TECHNOLOGIES)[number];

/** One of those, as the label list names it. */
export function d3Technology(kind: D3Technology): NonNullable<GivenFacts["technology"]> {
  if (kind === NEW_SUPPLY_TYPE) return technologyOfFacts(kind, undefined)!;
  const { label, code } = technologyOfClass(kind);
  return { label, ...(code !== undefined ? { code } : {}) };
}

/** The facts about the source and the treatment, and home use, in an answer or a tool call, kept only where they hold. */
export function readKind(raw: unknown): GivenKindFacts & { homeUse?: HomeUse } {
  const homeUse = HOME_USES.find((h) => h === (raw as { homeUse?: unknown } | null)?.homeUse);
  return { ...readKindFacts(raw), ...(homeUse !== undefined ? { homeUse } : {}) };
}

/** Project facts that hold only those, under today's rules. */
export function kindFacts(kind: GivenKindFacts & { homeUse?: HomeUse }): ProjectFacts {
  return { ...factsWithKind(kind), ...(kind.homeUse !== undefined ? { homeUse: { value: kind.homeUse, source: { by: "person", note: "given to violet" } } } : {}) };
}

/** Why she works out nothing for a project. "not covered yet" is held for now, and its label is the site's own. */
export type D3Stop =
  | { because: "not covered yet"; label: string | null }
  | { because: "another kind of project" }
  | { because: "home use not given" }
  | { because: "fact not given"; fact: "waterSource" | "treatment" };

/** Why she works out nothing for a project with these facts, or null: D-3 counts it, or a project that already exists does not say. */
export function d3Stop(facts: ProjectFacts): D3Stop | null {
  if (underTodaysRules(facts)) {
    const a = waterAnswer(facts);
    if (a.says === "ask" && (a.fact === "waterSource" || a.fact === "treatment")) return { because: "fact not given", fact: a.fact };
  }
  const supply = recordWaterSupply(facts);
  if (supply === "not covered yet") return { because: supply, label: waterNotCovered(facts) };
  if (supply === "another kind of project") return { because: supply };
  return needsHomeUse(facts) ? { because: "home use not given" } : null;
}

/** True while one blank fact decides it: what the person says still fills her screen, and no figure shows. */
export function d3Waits(stop: D3Stop | null): boolean {
  return stop?.because === "home use not given" || stop?.because === "fact not given";
}

/** What her screen says then. Where no figure can show, the maintainer's one sentence (2026-11-25). */
export function d3StopMessage(stop: D3Stop): string {
  return d3Waits(stop) ? "The calculator can't run for this project yet." : NO_CALCULATOR_YET;
}

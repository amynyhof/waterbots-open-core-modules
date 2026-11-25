// Which projects D-3 counts, for her tool, her chat and her screen. The answer is core's (`recordWaterSupply`), the same one
// the agent map calls her by, so she refuses the same projects at every door (ruled by the maintainer on 2026-11-24).

import { HOME_USES, NEW_SUPPLY_TYPE, needsHomeUse, recordWaterSupply, technologyOfFacts, waterNotCovered, type GivenFacts, type HomeUse, type ProjectFacts } from "@waterbots/core/record";
import { NO_CALCULATOR_YET, TECHNOLOGY_CLASSES, notCoveredYet, technologyOfClass } from "@waterbots/core/technologyLabels";

/** The kinds of project her tool and her chat name: the four drinking-water classes, and a new or alternative supply. */
export const D3_TECHNOLOGIES = [...TECHNOLOGY_CLASSES, NEW_SUPPLY_TYPE] as const;
export type D3Technology = (typeof D3_TECHNOLOGIES)[number];

/** A kind of project, as the label list names it. */
export function d3Technology(kind: D3Technology): NonNullable<GivenFacts["technology"]> {
  if (kind === NEW_SUPPLY_TYPE) return technologyOfFacts(kind, undefined)!;
  const { label, code } = technologyOfClass(kind);
  return { label, ...(code !== undefined ? { code } : {}) };
}

/** The kind of project and home use in an answer or a tool call, kept only where they are on their lists. */
export function readKind(raw: unknown): { technology?: D3Technology; homeUse?: HomeUse } {
  if (typeof raw !== "object" || raw === null) return {};
  const o = raw as { technology?: unknown; homeUse?: unknown };
  const technology = D3_TECHNOLOGIES.find((t) => t === o.technology);
  const homeUse = HOME_USES.find((h) => h === o.homeUse);
  return { ...(technology !== undefined ? { technology } : {}), ...(homeUse !== undefined ? { homeUse } : {}) };
}

/** Project facts that hold only a kind of project and home use. */
export function kindFacts(kind: { technology?: D3Technology; homeUse?: HomeUse }): ProjectFacts {
  const source = { by: "person", note: "given to violet" } as const;
  return {
    ...(kind.technology !== undefined ? { technology: { ...d3Technology(kind.technology), source } } : {}),
    ...(kind.homeUse !== undefined ? { homeUse: { value: kind.homeUse, source } } : {}),
  };
}

/** Why she works out nothing for a project. The label is the one that is not covered yet. */
export type D3Stop = { because: "not covered yet"; label: string | null } | { because: "another kind of project" } | { because: "home use not given" };

/** Why she works out nothing for a project with these facts, or null: D-3 counts it, or the facts do not say its kind. */
export function d3Stop(facts: ProjectFacts): D3Stop | null {
  const supply = recordWaterSupply(facts);
  if (supply === "not covered yet") return { because: supply, label: waterNotCovered(facts) };
  if (supply === "another kind of project") return { because: supply };
  return needsHomeUse(facts) ? { because: "home use not given" } : null;
}

/** What her screen says then. The words for another kind of project are core's; the rest are ones Calvin's screen shows. */
export function d3StopMessage(stop: D3Stop): string {
  if (stop.because === "another kind of project") return NO_CALCULATOR_YET;
  const words = "The calculator can't run for this project yet.";
  return stop.because === "not covered yet" && stop.label !== null ? `${words} ${notCoveredYet(stop.label)}` : words;
}

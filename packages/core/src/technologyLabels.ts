/**
 * THE ONE TECHNOLOGY LABEL LIST (J3). Each site shows its own words for a project's technology. This list says which kinds
 * of project each label could name. What each calculator does with a kind is in the one table (`projectKinds.ts`), and
 * this list reads it: it holds no answer of its own.
 *
 * A LABEL NEVER DECIDES A NEW PROJECT'S KIND (2026-11-25). The kind is worked out from the project facts. The list reads a
 * project that already exists, made before those facts were kept, and gives each site's label its code.
 *
 * The record keeps the site's label word for word next to the code. A label the list does not know gets no code:
 * the agent says the label is not known yet and shows it, and the label is then added here. A label is never
 * turned into `other` by guess. `other` is for a project the person says is neither a community water supply nor
 * household water treatment.
 *
 * COMMUNITY LEVEL TREATMENT IS COUNTED FOR CARBON AGAIN, treatment only included (decided by the maintainer on
 * 2026-11-25). Institutional treatment is not set up yet, and a new or alternative water supply could be for homes, for
 * reuse or for fields: neither has a code.
 *
 * The labels come from the open site's list, carried on 2026-11-23, and from the site walk of 2026-11-21.
 */
import type { Technology } from "./project";
import { kindRow, type Kind } from "./projectKinds.js";

export { NO_CALCULATOR_YET } from "./projectKinds.js";
import { NO_CALCULATOR_YET } from "./projectKinds.js";

/** A drinking-water class, as both sites name the four: its id in the sites' own lists. */
export const TECHNOLOGY_CLASSES = ["HWT", "IWT", "CWT", "CWS"] as const;
export type TechnologyClass = (typeof TECHNOLOGY_CLASSES)[number];

export interface TechnologyLabel {
  /** The site's label, word for word. */
  label: string;
  /** The kinds of project the label could name. */
  kinds: readonly Kind[];
  /** The record's code, from the one table. Left out: no calculator counts it by its label. */
  code?: Exclude<Technology, "other">;
  /** The drinking-water class the label names, when it names one. */
  classId?: TechnologyClass;
  /** Where the label comes from, and why it gets this code, or none. */
  why: string;
  /** Whether Violet's D-3 counts it (VWBA 2.0). Apart from the code, which the carbon method reads. */
  water: Exclude<WaterCoverage, "not known">;
  /** Why, with the source. */
  whyWater: string;
}

/** A label's two answers, read from the table. `homeUseFirst`: the label could also be reuse or irrigation. */
function listed(label: string, kinds: readonly [Kind, ...Kind[]], why: string, more: { classId?: TechnologyClass; homeUseFirst?: true } = {}): TechnologyLabel {
  const rows = kinds.map(kindRow);
  const code = more.homeUseFirst ? null : rows[0]!.carbon.code;
  const counts = rows.every((r) => r.water.answer.says === "counted");
  return {
    label,
    kinds,
    ...(code !== null ? { code } : {}),
    ...(more.classId !== undefined ? { classId: more.classId } : {}),
    why: `${why} ${code === null ? "It gets no code." : `Its code is ${code}.`} ${more.homeUseFirst ? "It could also be reuse or irrigation." : rows[0]!.carbon.source}`,
    water: !counts ? "not covered yet" : more.homeUseFirst ? "covered for home use" : "covered",
    whyWater: `${counts ? "The guidebook lists it for D-3 (VWBA 2.0, Appendix C, Table C-1, pp.37 to 39; Appendix D, D-3, pp.44 to 46)." : rows[0]!.water.source}${more.homeUseFirst ? " It could also be reuse or irrigation, so home use is asked first." : ""}`,
  };
}

const SUPPLY = ["K1", "K2", "K3"] as const;
const COMMONS_SOURCE = "A new water source a community collects from";

export const TECHNOLOGY_LABELS: readonly TechnologyLabel[] = [
  listed("Community water supply", SUPPLY, "The code's own name."),
  listed("Household water treatment", ["K6"], "The code's own name."),
  listed("Household water treatment technologies", ["K6"], "The open site's full class name.", { classId: "HWT" }),
  listed("Institutional water treatment technologies", ["K5"], "The open site's full class name.", { classId: "IWT" }),
  listed("Community level water treatment technologies", ["K4"], "The open site's full class name.", { classId: "CWT" }),
  listed("Community water supply technologies", SUPPLY, "The open site's full class name.", { classId: "CWS" }),
  listed("New or alternative water supply", SUPPLY, "The open site's project type C-11, which a new well can be logged as.", { homeUseFirst: true }),
  listed(COMMONS_SOURCE, ["K1", "K2"], "The open site's Agent Commons form."),
  listed("Water made safe in the home", ["K6"], "The open site's Agent Commons form."),
];

/** Upper or lower case, and runs of spaces, do not matter. */
const normal = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

function find(label: string): TechnologyLabel | undefined {
  const wanted = normal(label);
  return TECHNOLOGY_LABELS.find((t) => normal(t.label) === wanted);
}

/** The record's code for a site's label, or undefined when the list does not know the label or does not cover it yet. */
export function technologyCode(label: string): Exclude<Technology, "other"> | undefined {
  return find(label)?.code;
}

/** Whether a label has a code, is known and not covered yet, or is not on the list. */
export type Coverage = "covered" | "not covered yet" | "not known";

export function technologyCoverage(label: string): Coverage {
  const t = find(label);
  if (t === undefined) return "not known";
  return t.code === undefined ? "not covered yet" : "covered";
}

/** A label's answer for the water pathway. "covered for home use": only where people use the water at home. */
export type WaterCoverage = Coverage | "covered for home use";

/** Whether Violet's D-3 counts a project with this label. It says nothing about the carbon method. */
export function waterCoverage(label: string): WaterCoverage {
  return find(label)?.water ?? "not known";
}

/** The label for a drinking-water class's id, so a site that keeps the id can read the list by it. */
export function technologyOfClass(classId: TechnologyClass): TechnologyLabel {
  return TECHNOLOGY_LABELS.find((t) => t.classId === classId)!;
}

/** The older words for a technology that is not covered yet. A visitor now reads `NO_CALCULATOR_YET` (2026-11-25). */
export function notCoveredYet(label: string): string {
  return `“${label}” is not covered yet.`;
}

/** What a visitor reads on a saved treatment project that holds a water figure Violet no longer works out. */
export const SAVED_WATER_FIGURE_STAYS = `Your saved water figure stays on your record. ${NO_CALCULATOR_YET}`;

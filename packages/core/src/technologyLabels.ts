/**
 * THE ONE TECHNOLOGY LABEL LIST (J3). Each site shows its own words for a project's technology. This list turns
 * each site's label into the record's code, so both sites read a project the same way.
 *
 * The record keeps the site's label word for word next to the code. A label the list does not know gets no code:
 * the agent says the label is not known yet and shows it, and the label is then added here. A label is never
 * turned into `other` by guess. `other` is for a project the person says is neither a community water supply nor
 * household water treatment.
 *
 * NOT COVERED YET (ruled by the maintainer on 2026-11-23). Community level treatment, institutional treatment, and a
 * new well logged as an alternative water supply get no code until the experts answer. They are known labels, so
 * nobody is asked to fill in a technology they already gave: the agent says it is not covered yet.
 *
 * THE WATER PATHWAY HAS ITS OWN ANSWER (ruled by the maintainer on 2026-11-24). The code is what the carbon method
 * reads. Each label also says whether Violet's D-3 counts it: a supply that gives people water at home or in a
 * community is covered, and treatment is not covered yet. A new or alternative water supply could be for homes, for
 * reuse or for fields, so it is covered only where people use the water at home, and that is asked first. It has no
 * code.
 *
 * The labels come from the open site's list, carried on 2026-11-23, and from the site walk of 2026-11-21.
 */
import type { Technology } from "./project";

/** A drinking-water class, as both sites name the four: its id in the sites' own lists. */
export const TECHNOLOGY_CLASSES = ["HWT", "IWT", "CWT", "CWS"] as const;
export type TechnologyClass = (typeof TECHNOLOGY_CLASSES)[number];

export interface TechnologyLabel {
  /** The site's label, word for word. */
  label: string;
  /** The record's code. Left out: not covered yet. */
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

const WAITS = "Not covered yet: it gets no code until the experts answer (ruled 2026-11-23).";

/** A supply that gives people water to use at home or in a community. */
const SUPPLY = {
  water: "covered",
  whyWater: "The guidebook lists it for D-3 (VWBA 2.0, Appendix C, Table C-1, pp.37 to 39; Appendix D, D-3, pp.44 to 46). Ruled 2026-11-24.",
} as const;
/** A supply that could be for homes, for reuse or for fields. */
const HOME_USE = {
  water: "covered for home use",
  whyWater:
    "The guidebook lists new water supply for domestic use for D-3 (VWBA 2.0, Appendix C, Table C-1, pp.37 to 39). The " +
    "label could also be reuse or irrigation, so home use is asked first. Ruled 2026-11-24.",
} as const;
/** Treatment. */
const TREATMENT = {
  water: "not covered yet",
  whyWater:
    "The guidebook names treatment for D-3 but does not say how to count water people already collected untreated " +
    "(VWBA 2.0, Appendix D, D-3, pp.44 to 46). Not covered yet (ruled 2026-11-24).",
} as const;

export const TECHNOLOGY_LABELS: readonly TechnologyLabel[] = [
  {
    label: "Community water supply",
    code: "CWS",
    why: "The code's own name. The carbon method counts it by Method 1.",
    ...SUPPLY,
  },
  {
    label: "Household water treatment",
    code: "HWT",
    why: "The code's own name. The carbon method counts it by Method 2.",
    ...TREATMENT,
  },
  {
    label: "Household water treatment technologies",
    code: "HWT",
    classId: "HWT",
    why: "The open site's full class name.",
    ...TREATMENT,
  },
  {
    label: "Institutional water treatment technologies",
    classId: "IWT",
    why: `The open site's full class name. ${WAITS}`,
    ...TREATMENT,
  },
  {
    label: "Community level water treatment technologies",
    classId: "CWT",
    why: `The open site's full class name. ${WAITS}`,
    ...TREATMENT,
  },
  {
    label: "Community water supply technologies",
    code: "CWS",
    classId: "CWS",
    why: "The open site's full class name.",
    ...SUPPLY,
  },
  {
    label: "New or alternative water supply",
    why: `The open site's project type C-11, which a new well can be logged as. ${WAITS}`,
    ...HOME_USE,
  },
  {
    label: "A new water source a community collects from",
    code: "CWS",
    why: "The open site's Agent Commons form.",
    ...SUPPLY,
  },
  {
    label: "Water made safe in the home",
    code: "HWT",
    why: "The open site's Agent Commons form.",
    ...TREATMENT,
  },
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

/** The words for a technology that is not covered yet. The label is the site's own. */
export function notCoveredYet(label: string): string {
  return `“${label}” is not covered yet.`;
}

/** What a visitor reads for another kind of project, one no calculator here covers (the maintainer's words, 2026-11-25). */
export const NO_CALCULATOR_YET =
  "We do not have a calculator for this kind of project yet. To ask for it to be added, contact WaterBots at hello@waterbots.ai.";

/** What a visitor reads on a saved treatment project that holds a water figure Violet no longer works out. */
export const SAVED_WATER_FIGURE_STAYS = `Your saved water figure stays on your record. ${NO_CALCULATOR_YET}`;

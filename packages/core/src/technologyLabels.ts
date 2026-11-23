/**
 * THE ONE TECHNOLOGY LABEL LIST (J3). Each site shows its own words for a project's technology. This list turns
 * each site's label into the record's code, so both sites read a project the same way.
 *
 * The record keeps the site's label word for word next to the code. A label the list does not know gets no code:
 * the agent says the label is not known yet and shows it, and the label is then added here. A label is never
 * turned into `other` by guess. `other` is for a project the person says is neither a community water supply nor
 * household water treatment.
 *
 * Still missing: the free site's full list of labels and the paid site's. They arrive as carries; until then the
 * list holds only the labels this repo knows.
 */
import type { Technology } from "./project";

export interface TechnologyLabel {
  /** The site's label, word for word. */
  label: string;
  code: Exclude<Technology, "other">;
  /** Where the label comes from, and why it gets this code. */
  why: string;
}

export const TECHNOLOGY_LABELS: readonly TechnologyLabel[] = [
  {
    label: "Community water supply",
    code: "CWS",
    why: "The code's own name. The carbon method counts it by Method 1.",
  },
  {
    label: "Household water treatment",
    code: "HWT",
    why: "The code's own name. The carbon method counts it by Method 2.",
  },
  {
    label: "Community level water treatment technologies",
    code: "CWS",
    why:
      "A site's label, from the site walk of 2026-11-21 (W3). Community water treatment counts with community supply " +
      "under Method 1 (CWS/CWT), as Calvin's tool says.",
  },
];

/** Upper or lower case, and runs of spaces, do not matter. */
const normal = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

/** The record's code for a site's label, or undefined when the list does not know the label. */
export function technologyCode(label: string): Exclude<Technology, "other"> | undefined {
  const wanted = normal(label);
  return TECHNOLOGY_LABELS.find((t) => normal(t.label) === wanted)?.code;
}

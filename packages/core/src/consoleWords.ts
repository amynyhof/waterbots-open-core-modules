/**
 * THE CONSOLE'S WORDS: one copy, which both sites show (shared console page, family 4). A site never types its own.
 * The maintainer may change any of them; until then they are today's words:
 *
 * - The six steps are the six phases of the crew list (`roster.yaml`), in the journey's order. The first three are
 *   the shared page's own (24 Nov): Eligibility with Phoebe, Partners with Bridget, Quantify with the calculator agents.
 * - The beta note is the status sheet's "What WaterBots covers today", with the words of rule 3 (in beta, and it can
 *   get things wrong). The exact words wait on the maintainer.
 * - The export words follow rule 13: one name for the button, and a line that says to choose "Save as PDF".
 */

/** The six steps of the journey, in order. */
export const CONSOLE_STEPS = ["Eligibility", "Partners", "Quantify", "Plan", "Monitor", "Communicate"] as const;
export type ConsoleStep = (typeof CONSOLE_STEPS)[number];

/**
 * A hand-off button's words (shared page of 24 Nov, item 8): the step, its number among the steps the map calls, and
 * the next agent. For example "Step 2 of 3: Partners. Meet Bridget".
 */
export function handoffLabel(step: ConsoleStep, number: number, of: number, agentName: string): string {
  return `Step ${number} of ${of}: ${step}. Meet ${agentName}`;
}

/** The note just above the typing box on every screen (rule 3). */
export const BETA_NOTE =
  "WaterBots is in beta and can get things wrong. We are currently focused on carbon crediting and water benefits for safe water supply, with more impact funding pathways for more project types planned in the near future.";

/** The export's words (rule 13). */
export const EXPORT_WORDS = {
  /** The one name of every Export button, on both sites. */
  button: "Export report (PDF)",
  /** The line beside it. */
  hint: 'Your browser opens a print window. Choose "Save as PDF" there.',
  /** When no print window opened, and the report opened in its own tab. */
  inTab: 'No print window opened, so the report is open in its own tab. Use your browser\'s print or share menu there, and choose "Save as PDF".',
  /** When no print window opened and the tab could not open either. */
  failed: "No print window opened, and the report could not open in its own tab. Your browser may be blocking new tabs. Allow them for this site, or open the site in a full browser, and try again.",
} as const;

/** The chip that keeps the visitor talking with the agent they are with (rule 4). */
export const KEEP_CHATTING = "Keep chatting";

/** The warning before unsaved work is lost (rule 12). */
export const UNSAVED_WARNING = "You have work that is not saved. If you leave now, it will be lost.";

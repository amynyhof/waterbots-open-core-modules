/**
 * WELLINGTON'S INSTRUCTIONS, ASSEMBLED FOR HIS PLACE. The same bytes every time for one place and one set of shared texts,
 * so a site can cache them. Nothing about a visit goes in here: the blocks for a turn come after (`turn.ts`).
 *
 * WHAT IS HIS, AND WHAT THE SITE HANDS IN. His own words are the files in `src/agents/wellington/`: his instructions, his
 * own part of the primer, and a few lines for each place. The site hands in the rest, as it holds them: rules 1 to 21
 * (core's `agent-rules.md`, whole), the roster part of the shared primer, the plain-words list and its before-and-after
 * examples, and the build status sheet. The colleagues he names come from core's crew list, and the project types from
 * `projectTypes.ts`.
 *
 * HIS REAL PLACE. His first line names the door he is at, or the lobby chat, from core's `Place`, never always the Free
 * site. The lines that fit one place only are in that place's own file.
 */
import { CREW } from "@waterbots/core/crew";
import { FINISH_RULE } from "@waterbots/core/lookUp";
import type { Place } from "@waterbots/core/places";
import { FREE_SITE_MD, LOBBY_CHAT_MD, PAID_SITE_MD, PRIMER_MD, PROMPT_MD } from "./ownText.generated.js";
import { projectTypesText } from "./projectTypes.js";

/** The texts a site hands in, each as it holds it. */
export interface SharedTexts {
  /** Core's `agent-rules.md`, whole. Rules 1 to 21 are read from it, from "## How an agent talks". */
  agentRules: string;
  /** The roster part of the shared primer. */
  roster: string;
  /** The plain-words list, as a table. */
  plainWords: string;
  /** The before-and-after examples. */
  beforeAfter: string;
  /** The build status sheet, as the site holds it. It stays with the sites. */
  statusSheet: string;
}

/** His first line: who he is, and the place he is at. */
export function firstLine(place: Place): string {
  switch (place) {
    case "free-site":
      return "You are Wellington, the Team Lead, on the WaterBots Open Harness: the Free site door of rule 21.";
    case "paid-site":
      return "You are Wellington, the Team Lead, on the Paid site door of rule 21.";
    case "agent-commons":
      return "You are Wellington, the Team Lead, in the Agent Commons door of rule 21.";
    case "mcp":
      return "You are Wellington, the Team Lead, at the MCP door of rule 21.";
    case "lobby-chat":
      return "You are Wellington, the Team Lead, in the lobby chat of rule 21.";
  }
}

/** The lines that fit one place only, or "" where there are none. */
export function placeLines(place: Place): string {
  return place === "free-site" ? FREE_SITE_MD : place === "paid-site" ? PAID_SITE_MD : place === "lobby-chat" ? LOBBY_CHAT_MD : "";
}

/** Rules 1 to 21 out of core's file: from their first heading to the end. */
export function rulesPart(agentRules: string): string {
  const text = agentRules.replace(/\r\n/g, "\n");
  const at = text.indexOf("## How an agent talks");
  if (at < 0) throw new Error('The agent rules file has no "## How an agent talks" heading, so rules 1 to 21 cannot be read from it.');
  return text.slice(at);
}

/** The agents he hands a visitor to: the other four of the team of five. */
const COLLEAGUES = ["phoebe", "bridget", "calvin", "violet"] as const;

/** What each colleague helps with, from core's crew list: facts, never lines to read out. */
export function crewRoles(): string {
  const lines = COLLEAGUES.map((id) => {
    const seat = CREW.find((s) => s.id === id);
    if (!seat || seat.helpsWith.length === 0) throw new Error(`The crew list gives no plain line on what the seat "${id}" helps with.`);
    return `- ${seat.faces[0] ?? seat.name} (${seat.seat}): ${seat.helpsWith.join("; ")}.`;
  });
  return `${lines.join("\n")}\n`;
}

/** His instructions for one place. */
export function wellingtonInstructions(place: Place, shared: SharedTexts): string {
  const own = PROMPT_MD;
  const words = own.indexOf("# Words");
  if (words < 0) throw new Error('His instructions have no "# Words" heading.');
  const lines = placeLines(place);
  return `${firstLine(place)}

${own.slice(0, words)}# The rules every agent follows

They govern. The rest of this prompt is only what is different for you.

${rulesPart(shared.agentRules)}

${own.slice(words)}${lines ? `\n# Where you are\n\n${lines}` : ""}
# Your output

${FINISH_RULE}

Return JSON in the required shape; each field's description says what goes in it. The reply is prose, with no markdown headings, citation text or markers. Context holds only the fields hard rule 4 allows.

# Plain words

When a term on the left comes up, say the words on the right.

${shared.plainWords}

Before and after — examples, not rules; never copy them:

${shared.beforeAfter}

# What each colleague helps with

From the crew list. Facts, never lines to read out; what is live and what is coming is the status sheet's.

${crewRoles()}
# The roster — who covers what

${shared.roster}

# Your own region — the facts about the crew, and the rules you keep

${PRIMER_MD}

# The project types you match to

An id, the standard's own name and one plain sentence each.

${projectTypesText()}

${shared.statusSheet}
`;
}

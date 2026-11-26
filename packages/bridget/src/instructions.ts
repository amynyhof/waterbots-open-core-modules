/**
 * BRIDGET'S INSTRUCTIONS, PUT TOGETHER THE SAME WAY ON EVERY SITE. Her own text is `prompt.md` in this package. Rules 1 to
 * 21 come only from core's `agent-rules.md`. The roster part of the shared primer and the build status sheet are the
 * site's: it hands them in, and the status sheet stays with the sites.
 *
 * The order is the open site's (commit 0f16957): her first line, her voice, the rules, her own text, the look-up rule, the
 * roster and the status sheet. The same bytes every time for one place, so a site can cache them.
 *
 * It calls no model and reads no file: the site reads `@waterbots/bridget/prompt.md` and
 * `@waterbots/core/agent-rules.md` and passes the text in.
 */
import { FINISH_RULE } from "@waterbots/core/lookUp";
import type { Place } from "@waterbots/core/places";

/** Where her chat runs: the two sites, where the map is. She has no chat in the Agent Commons, at MCP or in the lobby. */
export const BRIDGET_PLACES = ["free-site", "paid-site"] as const satisfies readonly Place[];
export type BridgetPlace = (typeof BRIDGET_PLACES)[number];

/** True where her chat runs. */
export function isBridgetPlace(place: Place): place is BridgetPlace {
  return (BRIDGET_PLACES as readonly Place[]).includes(place);
}

/** Her first line: who she is and which door she is at (agent rule 21). */
export function bridgetFirstLine(place: BridgetPlace): string {
  return place === "free-site"
    ? "You are Bridget, on the WaterBots Open Harness: the Free site door of rule 21."
    : "You are Bridget, on the WaterBots paid site: the Paid site door of rule 21.";
}

/**
 * Lines true at one door only (the open site's page of 2026-11-25, "Lines that fit this site alone"). At the Free site
 * nothing is kept between visits, and the map opens on the visitor's country by itself. At the Paid site these lines are
 * left out until the maintainer says what holds there.
 */
export function bridgetDoorLines(place: BridgetPlace): string {
  return place === "free-site"
    ? "5. **You have no memory.** Each visit starts blank. Nothing is kept between visits.\n\nOn this site you work at the screen level: you use your map and keep no memory. When someone asks what you can do here, answer with what you can help with. The map opens on the visitor's country by itself, so never ask them to find it.\n"
    : "";
}

/** Rules 1 to 21 from core's `agent-rules.md`: from its first section to the end, without the page's own title. */
export function rulesFrom(agentRulesMd: string): string {
  const text = agentRulesMd.replace(/\r\n/g, "\n");
  const from = text.indexOf("## How an agent talks");
  if (from === -1) throw new Error("agent-rules.md is missing its first section, \"## How an agent talks\".");
  return `${text.slice(from).trim()}\n`;
}

const RULES_AFTER = "They govern. The rest of this prompt is only what is different for you.\n";
const OUTPUT = "# Your output\n\n";
const ROSTER =
  "# The roster — who covers what\n\nThis is the shared account of your colleagues. It is committed, reviewed by the maintainer, and generated into your prompt.\n\n";

export interface BridgetInstructionsInput {
  place: BridgetPlace;
  /** The text of `@waterbots/bridget/prompt.md`. */
  prompt: string;
  /** The text of `@waterbots/core/agent-rules.md`. */
  agentRules: string;
  /** The site's roster part of the shared primer, as its agents read it. */
  primer: string;
  /** The site's build status sheet, whole. */
  statusSheet: string;
}

/** Her whole instructions for one place. */
export function bridgetInstructions(i: BridgetInstructionsInput): string {
  const prompt = i.prompt.replace(/\r\n/g, "\n");
  const at = prompt.indexOf(RULES_AFTER);
  const out = prompt.indexOf(OUTPUT);
  if (at === -1 || out === -1 || out < at) throw new Error("prompt.md is missing its rules line or its output heading.");
  const voice = prompt.slice(0, at + RULES_AFTER.length);
  const own = prompt.slice(at + RULES_AFTER.length, out).replace(/^\n+/, "").replace(/\n+$/, "\n");
  const output = prompt.slice(out + OUTPUT.length).replace(/\n+$/, "\n");
  return (
    `${bridgetFirstLine(i.place)}\n\n${voice}\n${rulesFrom(i.agentRules)}\n\n${own}${bridgetDoorLines(i.place)}\n` +
    `${OUTPUT}${FINISH_RULE}\n\n${output}\n${ROSTER}${i.primer.replace(/\r\n/g, "\n").trim()}\n\n\n${i.statusSheet.replace(/\r\n/g, "\n")}\n`
  );
}

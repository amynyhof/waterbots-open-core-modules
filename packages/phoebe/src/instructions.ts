/**
 * WHAT PHOEBE IS TOLD, in two parts. Carried from the open site (`api/_systemPrompt.ts`, commit 0f16957).
 *
 * The static part, `phoebeInstructions`, is the same bytes on every turn at one door, so a site can cache it. It is her
 * own text (`agents/phoebe/prompt.md`) with the parts filled in: her first line from the door she is at, rules 1 to 21,
 * her tool, and the texts the site hands in (the primer's roster part, the status sheet, the plain words and the
 * before-and-after examples). Lines that fit one site alone come from that site too (`siteLines`).
 *
 * The staged part, `cardsBlock`, is the card sets this turn has reached (the maintainer's ruling R6 of 25 Sep 2026):
 * the applies cards first, a pack's full cards once a pathway applies and the next question is on it, never a pack
 * whose pathway does not apply, and the considerations only when she asks or every row is Met.
 *
 * It does no sums and calls no model. Rules 1 to 21 are never restated here: the site adds them whole.
 */
import { ANSWERS_SCHEMA } from "@waterbots/core/chips";
import { FINISH_RULE } from "@waterbots/core/lookUp";
import type { Place } from "@waterbots/core/places";
import { HAND_BACKS } from "@waterbots/core/reply";
import {
  CARBON_APPLIES_MD,
  CARBON_ELIGIBILITY_MD,
  CARBON_ROUTES_MD,
  WATER_APPLIES_MD,
  WATER_ELIGIBILITY_MD,
  WATER_FEASIBILITY_MD,
  WATER_ROUTES_MD,
} from "./generated/cards.generated.js";
import { PHOEBE_PROMPT_MD } from "./generated/prompt.generated.js";
import { PHOEBE_TOOL_MD } from "./generated/tool.generated.js";
import { HER_PACKS, READINESS_READS, ROW_STATES, section } from "./generated/worksheet.generated.js";

/** Every set she can be given, named the way her instructions and a site name it. */
export const CARD_SETS = ["water:applies", "water:eligibility", "water:routes", "water:feasibility", "carbon:applies", "carbon:eligibility", "carbon:routes"] as const;
export type CardSet = (typeof CARD_SETS)[number];

/** Any set this turn does not carry may be asked for: a set she has not been given is not a missing card. */
export const ON_REQUEST: readonly CardSet[] = CARD_SETS;

/** How many times one question may go to the model before it has to end in an answer (24 Nov 2026). */
export const MAX_PASSES = 3;

const SET_TEXT: Record<CardSet, { title: string; note: string; text: string }> = {
  "water:applies": { title: "The water pathway — does this apply", note: "Two questions that say whether the water pathway is in play at all. They never say eligible.", text: WATER_APPLIES_MD },
  "water:eligibility": {
    title: "The water pathway — the six eligibility criteria",
    note: 'The rows of your worksheet on this pathway, each with its own words, its evidence list, and its "Can it be fixed?" line.',
    text: WATER_ELIGIBILITY_MD,
  },
  "water:routes": {
    title: "The water pathway — the routes",
    note: "One cited fix per common gap. A route you name must be one of these, by its id, and a row may only name the routes its own tool row lists.",
    text: WATER_ROUTES_MD,
  },
  "water:feasibility": {
    title: "The water pathway — the ten considerations",
    note: "Guidance for choosing between projects that already qualify. Never a gate, never a verdict, never a score.",
    text: WATER_FEASIBILITY_MD,
  },
  "carbon:applies": {
    title: "The carbon pathway — does this apply",
    note: "Four questions that say whether the carbon pathway is in play, which of the four technology classes the project is, and which version of the method it is judged on. They never say eligible.",
    text: CARBON_APPLIES_MD,
  },
  "carbon:eligibility": {
    title: "The carbon pathway — the thirty-two requirements",
    note: 'The rows of your worksheet on this pathway, in three parts: the methodology\'s own gate, the Paris-alignment framework, and the rules every Gold Standard project keeps. Each card carries its own words, its evidence list, its "Can it be fixed?" line and, where it has one, the class or version it applies to.',
    text: CARBON_ELIGIBILITY_MD,
  },
  "carbon:routes": {
    title: "The carbon pathway — the routes",
    note: "One cited fix per common gap. A route you name must be one of these, by its id, and a row may only name the routes its own tool row lists.",
    text: CARBON_ROUTES_MD,
  },
};

/**
 * The card sets one turn is given. A pack opens in full only when the next question is on it, water first; a project
 * already running opens a pack that applies at once, because its start date is her first question (14 Nov 2026). A set
 * the visit has already been given stays.
 */
export function setsFor(input: { pathways: { pack: string; state: string; open?: number }[]; loaded?: readonly string[]; allMet?: boolean; running?: boolean }): CardSet[] {
  const out = new Set<CardSet>();
  let earlierOpen = false;
  const isSet = (s: string): s is CardSet => (CARD_SETS as readonly string[]).includes(s);
  for (const pack of HER_PACKS) {
    const found = section(pack);
    if (!found) continue;
    const given = input.pathways.find((p) => p.pack === pack);
    const state = given?.state ?? "unchecked";
    const open = given?.open ?? 0;
    const applies = `${found.sectionId}:applies`;
    if (state === "does-not-apply") continue;
    if (isSet(applies)) out.add(applies);
    if (state === "applies" && (!earlierOpen || input.running)) {
      for (const set of [`${found.sectionId}:eligibility`, `${found.sectionId}:routes`]) if (isSet(set)) out.add(set);
    }
    if (state === "unchecked" || (state === "applies" && open > 0)) earlierOpen = true;
  }
  // A pathway that does not apply leaves her with nothing; the applies cards are the smallest honest floor.
  if (out.size === 0) {
    for (const pack of HER_PACKS) {
      const found = section(pack);
      const applies = found ? `${found.sectionId}:applies` : "";
      if (isSet(applies)) out.add(applies);
    }
  }
  for (const set of input.loaded ?? []) if (isSet(set)) out.add(set);
  if (input.allMet) out.add("water:feasibility");
  return CARD_SETS.filter((set) => out.has(set));
}

/**
 * The sets a call is given when the one before it did not end in an answer (24 Nov 2026). A set she asks for comes with
 * the one it is used with; with nothing new to give, or on the last call, it is every set of every pack still in play.
 */
export function nextSets(input: { used: readonly CardSet[]; asked: CardSet | "none"; pathways: { pack: string; state: string }[]; last: boolean }): CardSet[] {
  const out = new Set<CardSet>(input.used);
  if (input.asked !== "none" && !out.has(input.asked)) {
    out.add(input.asked);
    const [part, set] = input.asked.split(":");
    const pair = set === "eligibility" ? "routes" : set === "routes" ? "eligibility" : null;
    const other = `${part}:${pair}`;
    if (pair && (CARD_SETS as readonly string[]).includes(other)) out.add(other as CardSet);
    if (!input.last) return CARD_SETS.filter((s) => out.has(s));
  }
  const closed = new Set(input.pathways.filter((p) => p.state === "does-not-apply").map((p) => section(p.pack)?.sectionId));
  return CARD_SETS.filter((s) => out.has(s) || !closed.has(s.split(":")[0]));
}

/** The staged part: the cards this turn has, and how to ask for one it does not. */
export function cardsBlock(sets: readonly CardSet[]): string {
  const missing = CARD_SETS.filter((set) => !sets.includes(set));
  const parts: string[] = [
    "# The cards you have on this turn",
    "",
    "These are your cards for this answer, in full. A card that is not here is one you have not been given yet — you do not remember it, you do not summarise it, and you never answer from it.",
    "",
    `You have: ${sets.map((set) => SET_TEXT[set].title).join("; ")}.`,
  ];
  if (missing.length) {
    const askable = missing.filter((set) => ON_REQUEST.includes(set));
    parts.push("", `Not on this turn: ${missing.map((set) => SET_TEXT[set].title).join("; ")}.`);
    if (askable.length) {
      parts.push(
        "",
        `If a question needs one of those, set needCards to its name — ${askable
          .map((set) => `\`${set}\``)
          .join(", ")} — and leave the reply empty. The console asks the same question again at once with that set in front of you, and the visitor sees only that answer. Never tell the visitor you are looking something up, never answer such a question from memory, and never tell the visitor you have no card for it: you do have it, it is simply not in front of you yet. One set per turn; ask for the one the question needs.`,
      );
    }
  }
  for (const set of sets) {
    const { title, note, text } = SET_TEXT[set];
    parts.push("", `## ${title}`, "", note, "", text);
  }
  return parts.join("\n");
}

// ── The static part ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The places she is opened at: the four doors. The lobby chat is Wellington's alone. */
export type PhoebeDoor = Exclude<Place, "lobby-chat">;

/** A door by the name rule 21 gives it. */
export const DOOR_NAME: Record<PhoebeDoor, string> = { "free-site": "Free site", "paid-site": "Paid site", "agent-commons": "Agent Commons", mcp: "MCP" };

/** Her first line: who she is, and the door she is at. */
export function whereLine(door: PhoebeDoor): string {
  return `You are Phoebe, at the ${DOOR_NAME[door]} door of rule 21.`;
}

/** What the site hands in. Each is used as it is given, with no change. */
export interface PhoebeInstructionsInput {
  door: PhoebeDoor;
  /** Rules 1 to 21, as core ships them (`@waterbots/core/agent-rules.md`). */
  agentRules: string;
  /** The roster part of the agent primer. */
  primer: string;
  /** The build status sheet. */
  statusSheet: string;
  /** The plain-words list. */
  plainWords: string;
  /** The before-and-after examples. */
  beforeAfter: string;
  /** Lines true at this site alone, such as the names of its own screens and boxes. Each is one bullet. */
  siteLines?: readonly string[];
}

const STATE_RULES = ROW_STATES.filter((state) => state.id !== "unchecked")
  .map((state) => `- **${state.label}** — ${state.carries}.`)
  .join("\n");
const READ_RULES = READINESS_READS.map((read) => `- **${read.label}** — ${read.carries}.`).join("\n");

/** Fills one marker; a marker that is missing, or text that still holds one, throws rather than sending a wrong prompt. */
function fill(text: string, marker: string, value: string): string {
  const token = `{{${marker}}}`;
  if (!text.includes(token)) throw new Error(`Phoebe's instructions have no ${token}.`);
  return text.split(token).join(value);
}

/** Her whole static instructions for one door. */
export function phoebeInstructions(input: PhoebeInstructionsInput): string {
  const lf = (s: string): string => s.replace(/\r\n/g, "\n");
  const site = (input.siteLines ?? []).map((l) => l.trim()).filter((l) => l !== "");
  let text = PHOEBE_PROMPT_MD;
  const parts: [string, string][] = [
    ["WHERE", whereLine(input.door)],
    // The rules sit under her own heading, so the file's own title, when it carries one, is left off.
    ["RULES", lf(input.agentRules).replace(/^# [^\n]*\n+/, "").trim() + "\n"],
    ["TOOL", PHOEBE_TOOL_MD],
    ["ROW_STATES", STATE_RULES],
    ["READS", READ_RULES],
    ["FINISH_RULE", FINISH_RULE],
    ["SITE_LINES", site.length ? `\n\n# Lines for this site\n\n${site.map((l) => `- ${l}`).join("\n")}` : ""],
    ["PLAIN_WORDS", lf(input.plainWords)],
    ["BEFORE_AFTER", lf(input.beforeAfter)],
    ["PRIMER", lf(input.primer)],
    ["STATUS_SHEET", lf(input.statusSheet)],
  ];
  for (const [marker, value] of parts) text = fill(text, marker, value);
  if (/\{\{[A-Z_]+\}\}/.test(text)) throw new Error("Phoebe's instructions still hold a marker.");
  return text;
}

// ── The shape of her answer ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * The shape she returns. Ids and tokens are stated in prose: the answer is checked against the tool files' own lists
 * either way (`readPhoebeAnswer`), and a row, a state or a route that is not on a list is dropped rather than shown.
 */
export const PHOEBE_ANSWER_SCHEMA = {
  type: "object" as const,
  properties: {
    // First and required: a site that streams her reply knows from it whether this pass is shown at all.
    needCards: {
      type: "string",
      enum: ["none", ...CARD_SETS],
      description: 'The name of a card set this turn does not carry, when the question needs it — the console asks the same question again with that set. "none" on every other turn.',
    },
    reply: {
      type: "string",
      description: "Phoebe's message. Prose only - no citation text, no card markers, no page numbers, no links. Four sentences and 400 characters at most. Empty only when needCards names a set.",
    },
    answers: ANSWERS_SCHEMA,
    closes: {
      type: "array",
      description: "Every funding path this reply tells the visitor is closed: the pack, the id of the row or test that closes it, and the card's reason in one sentence. [] on every other turn.",
      items: {
        type: "object",
        properties: { pack: { type: "string" }, id: { type: "string", description: "The row's or test's own id, e.g. 'G12'." }, because: { type: "string" } },
        required: ["pack", "id", "because"],
        additionalProperties: false,
      },
    },
    showTool: { type: "boolean", description: "True only on the message that says the eligibility quiz is on the Tool tab." },
    learnMore: { type: "string", description: 'A few words naming one idea worth a "Learn more about …" button, such as "baseline survey", or "".' },
    cited: { type: "array", description: "Every card token this reply rests on, as section:set/id.", items: { type: "string" } },
    rows: {
      type: "array",
      description: "Only the rows whose state changed this turn. Omit when nothing changed.",
      items: {
        type: "object",
        properties: {
          pack: { type: "string", description: "The pack the row belongs to, e.g. 'vwba-2.0'." },
          id: { type: "string", description: "The row's own id, e.g. '4'." },
          state: { type: "string", enum: ["met", "fixable", "unknown", "blocked"] },
          because: { type: "string", description: "What the state carries: what settled a Met row, what to find out on an Unknown one, the card's own reason on a Blocked one." },
          routes: { type: "array", description: "Required on a Fixable row: the route card ids this row may name.", items: { type: "string" } },
        },
        required: ["pack", "id", "state"],
        additionalProperties: false,
      },
    },
    pathways: {
      type: "array",
      description: "Only the applies tests answered this turn.",
      items: {
        type: "object",
        properties: {
          pack: { type: "string" },
          id: { type: "string", description: "The test's own id, e.g. 'W1'." },
          state: { type: "string", enum: ["applies", "does-not-apply"] },
          because: { type: "string", description: "The reason, in one sentence." },
        },
        required: ["pack", "id", "state"],
        additionalProperties: false,
      },
    },
    // A list, not a map: the model's schema refuses a map under additionalProperties.
    sorts: {
      type: "array",
      description: "What a pack's own tests settled about which rows this project has: its technology class, its version, or both.",
      items: {
        type: "object",
        properties: { pack: { type: "string" }, value: { type: "string", description: "The word, from that pack's own list of classes or versions." } },
        required: ["pack", "value"],
        additionalProperties: false,
      },
    },
    handBack: {
      type: "string",
      enum: [...HAND_BACKS],
      description: '"wellington" when the visitor\'s way on is back to Wellington — the worksheet is done, or the question is out of your lane; "none" on every other turn. The console acts on it.',
    },
    abstained: { type: "boolean", description: "True when declining because no card covers the question." },
    abstentionTopic: { type: "string", description: "A few words naming what was asked about, when abstaining." },
  },
  required: ["needCards", "reply", "answers", "closes", "cited", "handBack", "abstained"],
  additionalProperties: false,
};

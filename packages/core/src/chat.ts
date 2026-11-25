/**
 * A CALCULATOR AGENT'S CHAT (J5). What Calvin's chat and Violet's chat share, so they behave the same on both sites.
 *
 * The chat opens first: the agent checks the project record, asks only for what is missing, one question at a time, and
 * fills its calculator as the visitor answers.
 *
 * THE RULE (the maintainer, 2026-11-24): an agent asks for project facts only. A method value stays at its cited
 * default and is called "default". An anticipated value stays at its cited start and is called "assumed". The agent
 * says so, and changes one only if the visitor asks.
 *
 * This file gives facts and instructions, never lines to say: each agent finds its own words (agent rule 6). It does
 * no sums, and calls no model. The site makes the call, with its own key and its own limits.
 */
import { hasProjectRecord, type Place } from "./places.js";
import { REPLY_LIMIT, type ReplyLength } from "./reply.js";

/** One thing an agent asks for. Always a project fact, or a monitored figure once the project runs. */
export interface Ask {
  key: string;
  /** What is asked for. */
  about: string;
  /** What it is for (agent rule 11). */
  why: string;
  /** Where it usually comes from (agent rule 11). */
  from: string;
  /** True when no figure can show without it. Otherwise it may be left blank, and the figure still shows. */
  needed: boolean;
}

/** A value an agent does not ask for. It is said, and changed only if the visitor asks. */
export interface Kept {
  key: string;
  label: string;
  /** What the agent calls it. */
  called: "default" | "assumed";
  /** The value as the screen shows it. */
  shown: string;
  /** Where it comes from. */
  source: string;
}

/** The settings a chat runs on. Each agent's are in its `config.yaml` too, and a test keeps the two the same. */
export interface ChatSettings {
  model: string;
  effort: "low" | "medium" | "high";
  /** The most the model may write for one answer, its own thinking included. It is not the length of the reply. */
  maxOutputTokens: number;
  /** How long the reply itself may be (`reply.ts` counts it). */
  reply: ReplyLength;
}

export const CHAT_REPLY: ReplyLength = REPLY_LIMIT;

/** The turn the site sends when it opens the chat, so the agent speaks first. No visitor typed it, and none sees it. */
export function openedTurn(agentName: string): string {
  return `(The visitor opened ${agentName}'s chat.)`;
}

/** The still-open asks: those not answered and not left for now. The first one is the one question. */
export function openAsks(asks: readonly Ask[], leftForNow: readonly string[] = []): Ask[] {
  return asks.filter((a) => !leftForNow.includes(a.key));
}

/** True when the agent's part is done: nothing it needs is blank, and its figure shows. */
export function partIsDone(asks: readonly Ask[], figureShows: boolean): boolean {
  return figureShows && !asks.some((a) => a.needed);
}

/** What an agent does when its part is done, at each place. Instructions, not lines to say. */
export function whenDone(place: Place, saved = false): string {
  switch (place) {
    case "free-site":
      return "Give the figure and what it rests on. Wellington comes next: say he will join this chat with the next step, and set handBack to \"wellington\". Leave that step for him to name.";
    case "paid-site":
      return saved
        ? "Give the figure and what it rests on. Their changes are kept when they press Save. Wellington comes next: he is on call in Dispatches, or by typing @wellington. Set handBack to \"wellington\"."
        : "Give the figure and what it rests on. It is kept only if they save. Wellington comes next: say he will join this chat with the next step, and set handBack to \"wellington\". Leave that step for him to name.";
    case "agent-commons":
      return "Give the figure and what it rests on. Wellington is not here, so hand back to no one and leave handBack \"none\".";
    case "mcp":
      return "There is no chat here. Your tool gives the figure, its sources and what was left blank or assumed, and the visitor's own AI says it. Hand back to no one.";
    case "lobby-chat":
      return "You are not called here.";
  }
}

/** What the place gives an agent (agent rule 21). */
function placeLine(place: Place): string {
  switch (place) {
    case "free-site":
      return "You are at the Free site. The project record is below.";
    case "paid-site":
      return "You are at the Paid site. The project record is below.";
    case "agent-commons":
      return "You are in the Agent Commons.";
    case "mcp":
      return "You are at MCP.";
    case "lobby-chat":
      return "You are not called in the lobby chat.";
  }
}

export interface ChatContextInput {
  place: Place;
  /** Paid site: the project is saved. */
  saved?: boolean;
  /** This is the opening turn: the agent speaks first. */
  opened?: boolean;
  /** Introduce yourself (the Agent Commons). On the sites Wellington has already done it (agent rule 17). */
  introduce?: boolean;
  /** What the record already holds, as lines. Left out where there is no record. */
  known?: readonly string[];
  /** The open asks, in order (`openAsks`). */
  asks: readonly Ask[];
  kept: readonly Kept[];
  /** True when the figure shows. */
  figureShows: boolean;
  /** Messages for numbers the visitor gave that were refused since the last turn. */
  refused?: readonly string[];
  /** What the agent can see of its screen. */
  screen: string;
}

/** The block a site adds after the agent's instructions, worked out fresh for each turn. */
export function chatContext(c: ChatContextInput): string {
  const [next, ...later] = c.asks;
  const lines: string[] = ["# This turn", "", placeLine(c.place)];
  if (c.opened) {
    lines.push(
      c.introduce
        ? "The visitor has just opened your chat, and has not met you. Speak first."
        : "The visitor has just opened your chat, and has already met you. Speak first, from what you see on their record.",
    );
  }
  if (hasProjectRecord(c.place)) {
    lines.push("", "## Already on the project record", ...(c.known && c.known.length > 0 ? c.known.map((k) => `- ${k}`) : ["- Nothing yet."]));
  }
  if (c.refused !== undefined && c.refused.length > 0) {
    lines.push("", "## Refused since the last turn. Not filled in.", ...c.refused.map((r) => `- ${r}`), "Say what the range is first.");
  }
  lines.push("", "## What to ask");
  if (next === undefined) lines.push("Nothing is missing.");
  else {
    lines.push(
      `The one thing to ask now: ${next.about}.`,
      `It is for: ${next.why}. It usually comes from: ${next.from}.`,
      next.needed ? "No figure can show without it." : "It may be left blank, and the figure still shows.",
    );
    if (later.length > 0) lines.push(`Later, in this order: ${later.map((a) => a.about).join("; ")}.`);
  }
  if (c.kept.length > 0) {
    lines.push(
      "",
      "## Values you do not ask for",
      "Each one keeps its value. Say that it is a default or assumed, and change it only if the visitor asks.",
      ...c.kept.map((k) => `- ${k.label}: ${k.shown}, called "${k.called}" (${k.source}).`),
    );
  }
  if (partIsDone(c.asks, c.figureShows)) lines.push("", "## Your part is done", whenDone(c.place, c.saved));
  lines.push("", "## Your screen", c.screen);
  return lines.join("\n");
}

// ── The answer ───────────────────────────────────────────────────────────────────────────────────────────────────

/** The fields every calculator agent's answer holds beside its own facts and values. */
export const ANSWER_FIELDS = {
  reply: { type: "string", description: "What you say. Plain prose: no headings, no lists." },
  handBack: { type: "string", enum: ["none", "wellington"], description: "\"wellington\" when your part is done and the place has him; \"none\" otherwise." },
  leftForNow: { type: "array", items: { type: "string" }, description: "The keys of asks the visitor said to leave for now." },
} as const;

/** Reads the keys left for now: only ones this agent asks for. */
export function readLeft(value: unknown, keys: readonly string[]): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string" && keys.includes(v)))] : [];
}

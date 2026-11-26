/**
 * THE GUARD ON AN AGENT'S FACTS (2026-11-26), the same for every agent on both sites.
 *
 * A project fact is blank until the person gives it. It is never guessed (the rulings page, section 2). The guard on an
 * agent's numbers (`numberGuard.ts`) checks numbers; this one checks every other fact an agent can fill: the source,
 * the treatment, the yes-or-no facts, home use, and words from a list such as the country or the unit of a count.
 *
 * - A fact the record already holds, with the same value, changes nothing. It is left out, with no fault.
 * - A fact the agent is asking about in the same reply has not been given. It is refused.
 * - A yes-or-no fact, and home use, is taken only as the answer to the question just asked about it: the visitor's
 *   last message must be an answer, not a question, and not "not sure".
 * - Any other fact is taken only when the agent hands the visitor's own words for it, and those words are in the
 *   visitor's own messages.
 * - A fact that fails is dropped quietly. It stays blank, so no figure rests on it, and the visitor sees nothing about
 *   it: an agent may never guess, so no line is needed (the maintainer, 2026-11-26). The agent is told once, in the same
 *   turn, that the fact is still blank, so it asks for it in its own words, as for any blank fact.
 *
 * It reads words, and calls no model. The site makes the call, and passes what was asked.
 */

/** One fact in an agent's answer. */
export interface AnswerFact {
  /** The fact's key, the same as the key of the question that asks for it. */
  key: string;
  /** What the fact is, as the visitor reads it. */
  name: string;
  value: string | boolean;
  /** What the record or the screen holds now. */
  held?: string | boolean | null | undefined;
  /** True for a yes-or-no fact and home use: taken only as the answer to the question just asked about it. */
  onlyAsAnswer?: boolean;
}

/** The visitor's own words a fact rests on, as the agent copied them from their message. */
export interface Heard {
  fact: string;
  words: string;
}

export interface ChatFacts {
  /** The visitor's own messages in this chat, oldest first. Never the agent's. */
  messages: readonly string[];
  /** The key of the question the visitor's last message answers: the one the agent's last reply asked (its `asking`). */
  asked?: string | undefined;
  /** The key of the question this reply asks (its own `asking`). */
  asking?: string | undefined;
  /** The visitor's words each fact rests on (its own `heard`). */
  heard?: readonly Heard[] | undefined;
}

export type FactFault = "asked in this reply" | "not the question just asked" | "not an answer" | "not sure" | "not in the visitor's words";

export interface FactCheck {
  /** Kept: the visitor gave them. */
  kept: string[];
  /** The record already holds them. Left out, with no fault. */
  held: string[];
  /** Not given. Left out, and blank. */
  refused: { fact: AnswerFact; why: FactFault }[];
}

/** A turn no visitor typed, such as "(The visitor opened Calvin's chat.)". */
const NOT_TYPED = /^\s*\(The visitor\b[^)]*\)\s*$/;

const UNSURE = /\b(?:not sure|unsure|not certain|don'?t know|do not know|no idea|no clue|can'?t say|cannot say|maybe|perhaps)\b/i;

/** Folds words for matching: no case, no accents, no marks between words. */
export function foldWords(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** True when these words are in the message, whole words, in this order. */
function holds(message: string, words: string): boolean {
  const w = foldWords(words);
  return w !== "" && ` ${foldWords(message)} `.includes(` ${w} `);
}

/** True when every sentence of the message is a question. */
function onlyQuestions(message: string): boolean {
  const sentences = message.trim().split(/(?<=[.!?])\s+/).filter((s) => /[\p{L}\p{N}]/u.test(s));
  return sentences.length > 0 && sentences.every((s) => /\?["”’)]*$/.test(s.trim()));
}

/** Checks every fact in an agent's answer. */
export function checkAnswerFacts(facts: readonly AnswerFact[], chat: ChatFacts): FactCheck {
  const out: FactCheck = { kept: [], held: [], refused: [] };
  const typed = chat.messages.filter((m) => !NOT_TYPED.test(m));
  const last = typed.at(-1);
  for (const f of facts) {
    const words = (chat.heard ?? []).filter((h) => h.fact === f.key).map((h) => h.words);
    const refuse = (why: FactFault): void => {
      out.refused.push({ fact: f, why });
    };
    if (f.held !== undefined && f.held !== null && f.held === f.value) out.held.push(f.key);
    else if (chat.asking !== undefined && chat.asking === f.key) refuse("asked in this reply");
    else if (chat.asked !== undefined && chat.asked === f.key) {
      if (last === undefined || onlyQuestions(last)) refuse("not an answer");
      else if (UNSURE.test(last) && f.value !== "not sure") refuse("not sure");
      else if (words.length > 0 && !words.some((w) => holds(last, w))) refuse("not in the visitor's words");
      else out.kept.push(f.key);
    } else if (f.onlyAsAnswer === true) refuse("not the question just asked");
    else if (words.some((w) => typed.some((m) => holds(m, w)))) out.kept.push(f.key);
    else refuse("not in the visitor's words");
  }
  return out;
}

const WHY: Record<FactFault, string> = {
  "asked in this reply": "you are asking for it in this same reply",
  "not the question just asked": "it is taken only as the answer to a question about it",
  "not an answer": "their last message did not answer it",
  "not sure": "they are not sure",
  "not in the visitor's words": "it is not in the visitor's messages",
};

/**
 * What goes back to the agent, once, in the same turn: the facts that are still blank, and why. Facts and an
 * instruction, never a line to say. Null: nothing to say. Nothing is ever shown to the visitor about a refused fact.
 */
export function factsReturnedToAgent(refused: FactCheck["refused"]): string | null {
  if (refused.length === 0) return null;
  return `Still blank, because the visitor has not given them: ${refused.map((r) => `${r.fact.name} (${WHY[r.why]})`).join("; ")}. Answer this turn again with them blank, and never say them as if they were known. Ask for one at a time, and put the visitor's own words for each fact you fill in heard.`;
}

/** Reads the key a reply asks for: one of the agent's own keys, or nothing. */
export function readAsking(value: unknown, keys: readonly string[]): string | undefined {
  return typeof value === "string" && keys.includes(value) ? value : undefined;
}

/** Reads the visitor's words for each fact: only facts the agent fills, each with words. */
export function readHeard(value: unknown, keys: readonly string[]): Heard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const o = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
    return typeof o.fact === "string" && keys.includes(o.fact) && typeof o.words === "string" && o.words.trim() !== "" ? [{ fact: o.fact, words: o.words.trim() }] : [];
  });
}

/** The two fields an agent's answer adds for this guard, as a JSON shape. `facts`: the keys of the facts it fills. */
export function factFields(facts: readonly string[]): Record<string, Record<string, unknown>> {
  return {
    asking: {
      type: "string",
      description: 'The key of the one fact your reply asks for (the field its answer would fill), or "none". A fact you ask for in this reply is never filled in it.',
    },
    heard: {
      type: "array",
      description: "For each fact you fill, the visitor's own words it rests on, copied from their message. A fact with no words of theirs is not filled.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fact", "words"],
        properties: { fact: { type: "string", enum: [...facts] }, words: { type: "string" } },
      },
    },
  };
}

/** Joins what two guards say, or null when neither says anything. */
export function joinGuards(...parts: readonly (string | null)[]): string | null {
  const said = parts.filter((p): p is string => p !== null);
  return said.length === 0 ? null : said.join(" ");
}

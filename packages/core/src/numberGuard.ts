/**
 * THE GUARDS ON AN AGENT'S NUMBERS (2026-11-25), the same on both sites.
 *
 * - A number in an agent's answer is kept only if it is in the visitor's own messages in this chat.
 * - A number the screen already holds is dropped, and that is no fault.
 * - A zero is taken from "none" or "brand-new", as the answer to the question just asked.
 * - A number that does not pass goes back to the agent once, in the same turn. The second time it is taken out, and the
 *   visitor is told.
 * - A number outside its range shows its message for the fact just asked, whether or not the agent sent it.
 *
 * It reads words and compares numbers. It does no sums on a value, and calls no model: the site makes the call.
 */
import { readNumbers, sameNumber } from "./numbers.js";
import { RANGES, rangeRefusal, type Range, type RangeKey, type RangeWords } from "./ranges.js";

/** One number in an agent's answer. */
export interface AnswerNumber {
  /** Where it sits in the answer. */
  id: string;
  /** The value's name, as the visitor reads it. */
  name: string;
  value: number;
  /** What the screen or the record holds now. */
  held?: number | null | undefined;
  /** The key of the question this number answers, so "none" can be read as its zero. */
  ask?: string;
  /** A share, kept as a fraction: "80" and "80%" both give 0.8. */
  share?: boolean;
}

export interface ChatNumbers {
  /** The visitor's own messages in this chat, oldest first. Never the agent's. */
  messages: readonly string[];
  /** The key of the question just asked. */
  asked?: string | undefined;
}

export interface NumberCheck {
  /** Kept: the visitor gave them. */
  kept: string[];
  /** The screen already holds them. Left out, with no fault. */
  held: string[];
  /** Not in the visitor's messages. */
  faults: AnswerNumber[];
}

const NONE = /\b(?:none|nothing|nil|no water|brand[ -]?new)\b/i;

/** True when the visitor's messages hold the number. */
function given(n: AnswerNumber, { messages, asked }: ChatNumbers): boolean {
  const last = messages.at(-1) ?? "";
  if (n.value === 0 && asked !== undefined && n.ask === asked && NONE.test(last)) return true;
  return messages.some((m) =>
    readNumbers(m).some((w) => w.readings.some((r) => sameNumber(r, n.value) || (n.share === true && sameNumber(Number((r / 100).toPrecision(12)), n.value)))),
  );
}

/** Checks every number in an agent's answer. */
export function checkAnswerNumbers(numbers: readonly AnswerNumber[], chat: ChatNumbers): NumberCheck {
  const out: NumberCheck = { kept: [], held: [], faults: [] };
  for (const n of numbers) {
    if (n.held !== undefined && n.held !== null && sameNumber(n.held, n.value)) out.held.push(n.id);
    else if (given(n, chat)) out.kept.push(n.id);
    else out.faults.push(n);
  }
  return out;
}

/** What goes back to the agent, once, in the same turn. Facts and an instruction, never a line to say. Null: nothing to say. */
export function returnToAgent(faults: readonly AnswerNumber[]): string | null {
  if (faults.length === 0) return null;
  return `Not filled in, because these numbers are not in the visitor's messages: ${faults.map((f) => `${f.name} ${f.value}`).join("; ")}. Answer this turn again, with the number as the visitor gave it, or without it.`;
}

/** What the visitor is told when a number is taken out. Null: nothing was. */
export function takenOut(faults: readonly AnswerNumber[]): string | null {
  if (faults.length === 0) return null;
  const names = [...new Set(faults.map((f) => f.name))];
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names.at(-1)!}`;
  return `${list}: not filled in, because the number is not in your messages. Please type it again.`;
}

/** True for a value kept as a fraction from 0 to 1. */
export function isShare(key: RangeKey): boolean {
  return (RANGES[key] as Range).max === 1;
}

/**
 * The out-of-range message for the fact just asked, from the visitor's own words, whether or not the agent sent the number.
 * It shows only when no number in their last message could be the answer. Null: nothing to show.
 */
export function askedOutOfRange(range: RangeKey, message: string, words: RangeWords = {}): string | null {
  const numbers = readNumbers(message);
  if (numbers.length === 0) return null;
  const share = isShare(range);
  const fine = numbers.some((w) => {
    const first = w.readings[0]!;
    const tries = share ? [first, Number((first / 100).toPrecision(12))] : [first];
    return tries.some((n) => rangeRefusal(range, n, words) === null);
  });
  return fine ? null : rangeRefusal(range, numbers[0]!.readings[0]!, words);
}

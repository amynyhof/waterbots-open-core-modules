/**
 * AN ANSWER COMES IN THE SAME TURN (the maintainer's ruling of 2026-11-24, the shared console behaviours, line 4). An agent
 * that says it will look something up finishes in the same turn. Carried from the open site (`api/_lookUp.ts`, commit
 * 0f16957) with its patterns unchanged, so both sites read a reply the same way.
 *
 * Every live agent's instructions carry `FINISH_RULE`. A site reads each finished reply with `leavesWaiting`: one that ends
 * by promising a look-up is never sent. The same question goes again at once with `FINISH_NOTE`. While a reply is still
 * being written, `showable` holds back a promise until an answer follows it.
 *
 * It calls no model and has no dependency.
 */

/** In every live agent's instructions. */
export const FINISH_RULE =
  "Every answer is finished in the reply itself. Nothing is sent after it, so never say you will look something up, check or come back.";

/** What an agent is told when the same question goes again. Never shown. */
export const FINISH_NOTE =
  "# Answer now\n\nThe visitor is waiting for this answer, and it is the last one they get until they write again. Give the whole answer in this reply, in your usual way, and never say you will look something up, check or come back.";

/** The opening of a sentence in which an agent speaks of what it is about to do. */
const OPENER =
  /^\W*(?:(?:ok|okay|sure|yes|right|good question|of course|thanks|thank you)[,.!]?\s+)?(?:let me|allow me|i['’]ll|i will|i['’]m|i am|one moment|one second|give me|hold on|just a (?:moment|second|minute)|bear with me)\b/i;

/** What a look-up is called. Each is a whole phrase, so "I'll get you to Phoebe" is not one. */
const LOOK = [
  "pull(?:ing)? (?:up|out|that|this|the)",
  "look(?:ing)? (?:up|into|at|for|that|this|it|through)",
  "check(?:ing)?",
  "double-check",
  "(?:fetch|fetching)",
  "find(?:ing)? (?:out|that|this|the)",
  "bring(?:ing)? up",
  "dig(?:ging)? (?:into|out|up)",
  "read(?:ing)? (?:up|through|over)",
  "see (?:what|whether|if)",
  "grab(?:bing)?",
  "get(?:ting)? (?:the|that|those|this) (?:detail|details|card|cards|answer|information|facts?|figures?|numbers?)",
  "get(?:ting)? back to you",
  "come back (?:to you|with)",
].join("|");

const PROMISES: readonly RegExp[] = [
  new RegExp(
    `\\b(?:let me|allow me to|i['’]ll|i will|i['’]m going to|i am going to|give me (?:a|one) (?:moment|second|minute)(?: to)?|(?:one|a) (?:moment|second) while i|hold on while i)\\s+(?:(?:just|quickly|first|now|go|and|then|try to|need to)\\s+)*(?:${LOOK})\\b`,
    "i",
  ),
  /\bi(?:['’]m| am)\s+(?:(?:just|now|quickly)\s+)*(?:pulling|looking (?:up|into|for|that|this|it)|checking|fetching|finding|bringing|digging|getting (?:the|that|those))\b/i,
  /^\W*(?:one|just a|give me a) (?:moment|second|minute)(?:,? please)?\W*$/i,
];

/** Each sentence and where it starts. A mark ends one only where a space, a quote or the end follows it, so "2.5" does not. */
function sentences(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  let from = 0;
  for (const match of text.matchAll(/[.?!…]+["”’)]*(?=\s|$)|\n+/g)) {
    const end = (match.index ?? 0) + match[0].length;
    if (text.slice(from, end).trim() !== "") out.push({ start: from, text: text.slice(from, end) });
    from = end;
  }
  if (text.slice(from).trim() !== "") out.push({ start: from, text: text.slice(from) });
  return out;
}

/** Enough text after a promise to be its answer: the same floor a reply has to clear (`MIN_REPLY_CHARS`, `reply.ts`). */
const ANSWER_CHARS = 40;

/** Where the promise of a look-up starts, when no answer follows it in the same reply; -1 otherwise. */
export function waitingFrom(reply: string): number {
  const parts = sentences(reply);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const { start, text } = parts[i]!;
    // "Let me check one thing: is the borehole new?" is a question, and the visitor has something to answer.
    if (/\?["”’)]*\s*$/.test(text)) continue;
    if (!PROMISES.some((pattern) => pattern.test(text.trim()))) continue;
    return reply.slice(start + text.length).trim().length < ANSWER_CHARS ? start : -1;
  }
  return -1;
}

/** True when a reply ends by promising a look-up, with no answer after it. */
export function leavesWaiting(reply: string): boolean {
  return waitingFrom(reply) !== -1;
}

/**
 * The part of a reply still being written that may be shown. A last sentence that has begun like a promise is held until
 * it is finished, and a finished promise until an answer follows it, so the visitor never reads one that is about to be
 * thrown away.
 */
export function showable(reply: string): string {
  const parts = sentences(reply);
  const last = parts[parts.length - 1];
  const begun = last !== undefined && !/[.?!…]["”’)]*\s*$/.test(last.text) && OPENER.test(last.text);
  let held = begun ? reply.slice(0, last.start) : reply;
  // Two in a row, "Let me look into that. One moment.", are held together.
  for (let from = waitingFrom(held); from !== -1; from = waitingFrom(held)) held = held.slice(0, from);
  return held;
}

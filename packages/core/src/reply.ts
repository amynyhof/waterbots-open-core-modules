/**
 * THE CHECKS ON A REPLY (J5). How long an agent's reply runs, and its reading level, counted the same way for every
 * agent on both sites (agent rules 1 and 2). They came from the open site, carried on 2026-11-23, with their numbers
 * and their counting unchanged.
 *
 * A check says what it found and changes nothing. The site decides what to do: it logs a long or hard reply rather than
 * hiding it, and it refuses a reply too short to be an answer, with the truth.
 *
 * Plain counting, not grammar. The limits are the maintainer's; they move only on their word.
 */

/** Shorter than this and it is not an answer: measured, the shortest real answer in 256 ran to 221 characters. */
export const MIN_REPLY_CHARS = 40;

/** True when a reply is too short to be an answer. Spaces are not an answer either. */
export function isDegenerateReply(reply: string): boolean {
  return reply.trim().length < MIN_REPLY_CHARS;
}

/** The most a reply should run to: agent rule 2's two or three short sentences, and one question. */
export const REPLY_LIMIT = { sentences: 4, chars: 400 } as const;

export interface ReplyLength {
  sentences: number;
  chars: number;
}

/** Short words with a full stop that do not end a sentence. */
const NOT_AN_END = /\b(e\.g|i\.e|etc|vs|approx|No|Dr|Mr|Ms|Mrs|St)\.(?=\s)/g;

/**
 * Sentences and characters in a reply. A sentence ends at a full stop, a question mark or an exclamation mark followed
 * by a space or the end, so "2.5" and "e.g." do not end one, and nor does an ellipsis.
 */
export function replyLength(reply: string): ReplyLength {
  const text = reply.trim().replace(NOT_AN_END, (match) => match.replace(/\./g, ""));
  const ends = text.match(/[.?!]+["”’)]*(?=\s|$)/g) ?? [];
  // A last sentence with no mark still counts.
  const trailing = text.length > 0 && !/[.?!]+["”’)]*$/.test(text) ? 1 : 0;
  return { sentences: ends.length + trailing, chars: reply.trim().length };
}

/** True when a reply runs past the limit, on either count. */
export function isLongReply(reply: string, limit: ReplyLength = REPLY_LIMIT): boolean {
  const { sentences, chars } = replyLength(reply);
  return sentences > limit.sentences || chars > limit.chars;
}

/** The two bars: a walk's replies average at most grade 6, and no one reply is above grade 8. */
export const READING_GRADE = { average: 6, reply: 8 } as const;

/** Syllables in one word, by the usual rule of thumb: vowel groups, less a silent final e. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, (m) => m.charAt(0)).replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
}

/**
 * The words a reply's grade is counted on. Names, place names and the methods' own terms are left out, so a correct
 * name never fails a reply: a word with a digit, a word with a capital after its first letter (fNRB, WaterBots), and
 * a capitalised word that does not start a sentence.
 */
export function gradedWords(reply: string): string[] {
  const out: string[] = [];
  let sentenceStart = true;
  for (const raw of reply.trim().split(/\s+/)) {
    const word = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9']+$/g, "");
    const ends = /[.?!:]["”’)]*$/.test(raw);
    if (word) {
      const named = /\d/.test(word) || /^.+[A-Z]/.test(word) || (/^[A-Z]/.test(word) && !sentenceStart && word !== "I");
      if (!named) out.push(word);
      sentenceStart = false;
    }
    if (ends) sentenceStart = true;
  }
  return out;
}

/** The Flesch–Kincaid grade of a reply, to one decimal. Never below 0. */
export function readingGrade(reply: string): number {
  const words = gradedWords(reply);
  if (words.length === 0) return 0;
  const { sentences } = replyLength(reply);
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const grade = 0.39 * (words.length / Math.max(1, sentences)) + 11.8 * (syl / words.length) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

/** True when a site should log the reply: above the average bar. */
export function isHardReply(reply: string): boolean {
  return readingGrade(reply) > READING_GRADE.average;
}

/** A walk's verdict on its replies' grades: the average and the hardest, against the two bars. */
export function walkGrades(grades: readonly number[]): { average: number; hardest: number; passes: boolean } {
  const average = grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : 0;
  const hardest = grades.length ? Math.max(...grades) : 0;
  return { average, hardest, passes: average <= READING_GRADE.average && hardest <= READING_GRADE.reply };
}

// ── The hand-back ────────────────────────────────────────────────────────────────────────────────────────────────

/** A field the site acts on, never a sentence it reads: "wellington" brings him in, "none" is the ordinary turn. */
export const HAND_BACKS = ["none", "wellington"] as const;
export type HandBack = (typeof HAND_BACKS)[number];

/** The field as the model set it, or "none" when it is missing or not on the list. */
export function readHandBack(value: unknown): HandBack {
  return HAND_BACKS.find((h) => h === value) ?? "none";
}

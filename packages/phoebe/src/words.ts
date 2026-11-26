/**
 * HER REPLY, MEASURED. Carried from the open site (`api/_reply.ts`, commit 0f16957) with its limits and lists unchanged.
 * A long reply and one that uses a card's own words are counted, never refused: a site logs them, and a measured walk
 * fails on them. Core's `reply.ts` holds the checks every agent shares (length, reading level); these are hers.
 */
import { isLongReply, type ReplyLength } from "@waterbots/core/reply";

/** Her limit: four sentences and 400 characters (13 Nov 2026). The maintainer's to move. */
export const PHOEBE_REPLY_LIMIT: ReplyLength = { sentences: 4, chars: 400 };

/** True when her reply runs past her limit. */
export function isLongPhoebeReply(reply: string): boolean {
  return isLongReply(reply, PHOEBE_REPLY_LIMIT);
}

/** The cards' and the worksheet's own words, which a newcomer does not know (14 Nov 2026). */
export const CARD_WORDS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /water stewardship (activity|work|project)/i, label: "water stewardship activity" },
  { pattern: /volume behind it/i, label: "a volume behind it" },
  { pattern: /mapped (route|way|path) to count/i, label: "mapped route to counting" },
  { pattern: /counting route/i, label: "counting route" },
  { pattern: /mapped activity/i, label: "mapped activity" },
  { pattern: /supply (kind|class|technolog)/i, label: "community supply kind or class" },
  { pattern: /technology class/i, label: "technology class" },
  { pattern: /\bcriteri(on|a)\b/i, label: "criterion" },
  { pattern: /additionality/i, label: "additionality" },
  { pattern: /volume provided/i, label: "Volume Provided" },
  { pattern: /\bbaseline\b(?!\s+survey)/i, label: 'baseline (not "baseline survey")' },
  { pattern: /\bthe (water|carbon) pathway\b/i, label: "the water or carbon pathway" },
  { pattern: /\b(applies|eligibility) (test|row)s?\b/i, label: "applies test or eligibility row" },
  { pattern: /\b(CWS|HWT|IWT|CWT)\b/, label: "a class id" },
  { pattern: /\bthe (\w+ )?method (names|lists)\b/i, label: "the method names or lists" },
  { pattern: /\bfirst look\b/i, label: "a first look (a result sounds near)" },
];

/** The card words a reply uses, by label; empty when it speaks plainly. */
export function cardWordsIn(reply: string): string[] {
  return CARD_WORDS.filter(({ pattern }) => pattern.test(reply)).map(({ label }) => label);
}

/**
 * CHIPS THAT ANSWER THE QUESTION JUST ASKED (the maintainer's ruling of 2026-11-24, the shared console behaviours, line 2).
 * Carried from the open site (`api/_chips.ts`, commit 0f16957) with its limits unchanged, so both sites keep the same chips.
 *
 * The agent names them in a field, and `readChips` checks it. A chip is sent as the visitor's own words, so it never puts a
 * fact in their mouth: no chip under a reply that asks nothing, none with a number the reply did not say, and none that is
 * itself a question. The buttons are the site's.
 *
 * It calls no model and has no dependency.
 */

/** A chip is a few words on one line. Longer is dropped, never cut. */
export const MAX_CHIP_CHARS = 40;
/** Few enough to read at a glance. */
export const MAX_CHIPS = 3;

/** The field every live agent's answer carries. */
export const ANSWERS_SCHEMA = {
  type: "array" as const,
  description:
    'Up to three short answers the visitor could tap to answer the question this reply ends with, in their own plain words, such as "Yes", "Not yet" or "I\'m not sure". They fit that question and no other. Never a made-up fact: no name, place or number. [] when the reply asks nothing, or when the answer is a name, a place, a number or a description.',
  items: { type: "string" as const },
};

const numbersIn = (text: string): string[] => text.match(/\d[\d,.]*/g)?.map((n) => n.replace(/[.,]+$/, "")) ?? [];

/** The chips an answer may carry, from its field and its own reply. */
export function readChips(value: unknown, reply: string): string[] {
  if (!Array.isArray(value) || !/\?["”’)]*\s*$/.test(reply)) return [];
  const said = numbersIn(reply);
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const chip = raw.trim().replace(/[.!]+$/, "");
    if (chip === "" || chip.length > MAX_CHIP_CHARS || /[\n\r?]/.test(chip)) continue;
    if (numbersIn(chip).some((n) => !said.includes(n))) continue;
    if (out.some((kept) => kept.toLowerCase() === chip.toLowerCase())) continue;
    out.push(chip);
    if (out.length === MAX_CHIPS) break;
  }
  return out;
}

/** The answers as a site receives them, checked again where they are shown (the open site's browser check). */
export function answersFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((chip): chip is string => typeof chip === "string" && chip.trim() !== "" && chip.length <= MAX_CHIP_CHARS).slice(0, MAX_CHIPS);
}

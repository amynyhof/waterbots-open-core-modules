// The ranges of Violet's values (ruled 2026-11-23). The ranges, the check and the message are core's
// (`@waterbots/core/ranges`). This file says which of them each value in her input takes, so her screen and her tool
// refuse the same numbers with the same words. A refused number never reaches the engine. Nothing here does a sum.

import { checkRange, rangeRefusal, type RangeKey, type RangeWords } from "@waterbots/core/ranges";
import type { D3Input } from "./d3/types.js";

/** The number boxes on her screen, and the range each one takes. */
export const D3_RANGES = {
  withoutProjectM3PerYear: "withoutProjectM3PerYear",
  meteredM3PerYear: "meteredWater",
  flowM3PerHour: "systemFlow",
  operatingHoursPerYear: "operatingHours",
  daysOfAccessPerYear: "daysOfAccess",
} as const satisfies Partial<Record<keyof D3Input, RangeKey>>;

export type D3NumberKey = keyof typeof D3_RANGES;

/** The message when a number is outside the value's range, or null. */
export function refuseD3(key: D3NumberKey, v: unknown): string | null {
  return rangeRefusal(D3_RANGES[key], v);
}

export interface D3Refusal {
  field: D3NumberKey | "population.served" | "population.householdSize" | "litresPerPersonPerDay";
  message: string;
}

/** Every number in her input that is outside its range. Empty on an ordinary input. Blanks are not checked. */
export function d3Refusals(input: D3Input): D3Refusal[] {
  const out: D3Refusal[] = [];
  const check = (field: D3Refusal["field"], key: RangeKey, v: unknown, words: RangeWords = {}): void => {
    if (v === undefined) return;
    const c = checkRange(key, v, words);
    if (!c.ok) out.push({ field, message: c.message });
  };
  const pop = input.population;
  check("population.served", "population.served", pop?.served, pop?.mode === "households" ? { name: "Households served" } : {});
  check("population.householdSize", "population.householdSize", pop?.householdSize);
  for (const field of Object.keys(D3_RANGES) as D3NumberKey[]) check(field, D3_RANGES[field], input[field]);
  check("litresPerPersonPerDay", "lpcd", input.litresPerPersonPerDay?.value);
  return out;
}

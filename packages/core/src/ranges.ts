/**
 * VALUE RANGES (ruled by the maintainer on 2026-11-23). Each value a person can enter has a range it must sit in. A
 * number outside its range is refused where it is typed, and the message names the value and the range. A refused
 * number is never used in a sum.
 *
 * ONE LIST, ONE CHECK, ONE MESSAGE. The record's fact check, both calculator screens and both agents' tools use this
 * file, so a value behaves the same at every place.
 *
 * A range is what can be true at all: it comes from plain sense, or from the method. No limit is invented. A METHOD
 * CAP IS NOT A RANGE: a cap is the most a method credits (5.5 litres a day, for example), and it stays with the method.
 *
 * Nothing here does a sum on a value. It only compares.
 */

/** How a value is shown where it is typed. A percent is kept as a fraction, and typed and worded as a percentage. */
export type ShownAs = "number" | "percent";

export interface Range {
  /** The value's name, as the message says it. */
  name: string;
  min: number;
  /** True when the value must be more than `min`, not equal to it. */
  moreThanMin?: boolean;
  /** Left out: no top. */
  max?: number;
  /** A count: a whole number. */
  whole?: boolean;
  shownAs?: ShownAs;
  /** Where the range comes from. */
  source: string;
}

const SHARE = "plain sense: a share";
const NOT_BELOW_ZERO = "plain sense: it cannot be below zero";
const COUNT = "plain sense: a count";

export const RANGES = {
  // ── The shared project record ──
  "population.served": { name: "People served", min: 1, whole: true, source: COUNT },
  "population.householdSize": { name: "People per household", min: 0, moreThanMin: true, source: "plain sense; it may be an average, such as 4.6" },
  lpcd: { name: "Litres per person a day", min: 0, source: NOT_BELOW_ZERO },
  withoutProjectM3PerYear: { name: "Water before the project", min: 0, source: `${NOT_BELOW_ZERO}; 0 is a new supply` },
  // ── Violet ──
  daysOfAccess: { name: "Days of access", min: 0, max: 365, source: "the days in a year; VWBA 2.0, Appendix D, D-3, p.46" },
  operatingHours: { name: "Operating hours", min: 0, max: 8760, source: "the hours in a year: 365 days of 24 hours" },
  meteredWater: { name: "Metered water", min: 0, source: NOT_BELOW_ZERO },
  systemFlow: { name: "Flow of the system", min: 0, source: NOT_BELOW_ZERO },
  // ── Calvin ──
  daysOfOperation: { name: "Days of operation", min: 0, max: 365, source: "the days in a year" },
  testsPass: { name: "Share of water tests that pass", min: 0, max: 1, source: SHARE },
  usageRate: { name: "Usage rate", min: 0, max: 1, source: SHARE },
  homesThatUse: { name: "Share of homes that use the device", min: 0.01, max: 1, shownAs: "percent", source: `${SHARE}; never 0 (ruled 2026-10-30)` },
  stillBoiling: { name: "Share still boiling the safe water", min: 0, max: 1, source: SHARE },
  alreadySafe: { name: "Already-safe share", min: 0, max: 1, source: SHARE },
  waterProduced: { name: "Water produced in a year", min: 0, source: NOT_BELOW_ZERO },
  pumpEmissions: { name: "Pump and fuel emissions", min: 0, source: NOT_BELOW_ZERO },
  householdsServed: { name: "Households served", min: 1, whole: true, source: COUNT },
  deviceFlow: { name: "Device flow rate", min: 0, moreThanMin: true, source: "plain sense: a device with no flow treats no water" },
  hoursUsed: { name: "Hours the device is used", min: 0, max: 24, source: "the hours in a day" },
  devicesPerHousehold: { name: "Devices per household", min: 1, whole: true, source: "ruled 2026-10-23" },
  stoveEfficiency: { name: "Stove efficiency", min: 0, moreThanMin: true, max: 1, shownAs: "percent", source: `${SHARE}; the energy to boil is divided by it` },
  fossilStoveEfficiency: { name: "Fossil stove efficiency", min: 0, moreThanMin: true, max: 1, shownAs: "percent", source: `${SHARE}; the energy to boil is divided by it` },
  fnrb: { name: "fNRB", min: 0, max: 1, source: SHARE },
  eachShare: { name: "Each share", min: 0, max: 1, shownAs: "percent", source: SHARE },
  daf: { name: "DAF", min: 0, max: 1, source: `${SHARE}; V2.0 §7.4.5 gives the 0` },
} as const satisfies Record<string, Range>;

export type RangeKey = keyof typeof RANGES;

/** A range with what one screen or tool calls it, and how it shows it there. */
export interface RangeWords {
  /** Another name for the value, such as "Households served" when the count is of households. */
  name?: string;
  shownAs?: ShownAs;
}

/** Why a number is refused. `not a number` is also the answer for a blank, which a caller does not check. */
export type RangeProblem = "not a number" | "below zero" | "zero" | "not a whole number" | "outside the range";

export type RangeCheck = { ok: true } | { ok: false; key: RangeKey; problem: RangeProblem; message: string };

function shown(n: number, as: ShownAs): string {
  // A percent's ends are whole percentages, so rounding only removes a computer's stray decimals.
  return as === "percent" ? `${Math.round(n * 100)}%` : n.toLocaleString("en-US");
}

/** The one message: the value's name, and its range. */
export function rangeMessage(key: RangeKey, words: RangeWords = {}): string {
  const r: Range = RANGES[key];
  const name = words.name ?? r.name;
  const as = words.shownAs ?? r.shownAs ?? "number";
  const min = shown(r.min, as);
  if (r.whole) return `${name} must be a whole number, ${min} or more.`;
  if (r.max === undefined) return r.moreThanMin ? `${name} must be more than ${min}.` : `${name} must be ${min} or more.`;
  const max = shown(r.max, as);
  return r.moreThanMin ? `${name} must be more than ${min} and no more than ${max}.` : `${name} must be between ${min} and ${max}.`;
}

/** Checks one number against its range. The same check everywhere. */
export function checkRange(key: RangeKey, value: unknown, words: RangeWords = {}): RangeCheck {
  const r: Range = RANGES[key];
  const no = (problem: RangeProblem): RangeCheck => ({ ok: false, key, problem, message: rangeMessage(key, words) });
  if (typeof value !== "number" || !Number.isFinite(value)) return no("not a number");
  if (value < 0) return no("below zero");
  if (value === 0 && (r.min > 0 || r.moreThanMin === true)) return no("zero");
  if (r.whole === true && !Number.isInteger(value)) return no("not a whole number");
  if (value < r.min || (r.max !== undefined && value > r.max)) return no("outside the range");
  return { ok: true };
}

/** The message when a number is refused, or null when it is fine. */
export function rangeRefusal(key: RangeKey, value: unknown, words: RangeWords = {}): string | null {
  const c = checkRange(key, value, words);
  return c.ok ? null : c.message;
}

/** Throws the message when a number is refused. For an agent's tool. */
export function requireInRange(key: RangeKey, value: unknown, words: RangeWords = {}): void {
  const message = rangeRefusal(key, value, words);
  if (message !== null) throw new Error(message);
}

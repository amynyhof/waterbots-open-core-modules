/**
 * THE CHECKS ON THE PIN, THE TYPED PLACE AND THE GPS OUTCOME. Carried from the open site (`api/_bridgetPin.ts`, commit
 * 0f16957) with its lists and limits unchanged. Everything Bridget says about a basin comes from what the site hands her,
 * so everything is checked first: a pin whose level, area or label the map could not have made is refused whole, and she
 * is told no basin is pinned rather than handed a reading the map never showed.
 *
 * It calls no model and has no dependency.
 */

/**
 * The stress labels a pin may carry: the published categories of WRI Aqueduct 4.0, baseline annual water stress
 * (https://doi.org/10.46830/writn.23.00061), as the open site's map data carries them, and the map's own label for a basin
 * with no reading. A closed list. The map data itself waits for the rights check.
 */
export const STRESS_LABELS: readonly string[] = [
  "Low (<10%)",
  "Low - Medium (10-20%)",
  "Medium - High (20-40%)",
  "High (40-80%)",
  "Extremely High (>80%)",
  "Arid and Low Water Use",
  "No Data",
  "Not in the dataset",
];

/** A place longer than this is not a place. */
export const MAX_PLACE_CHARS = 80;

/** The pin as the site hands it to her. */
export interface PinnedBasin {
  /** The basin's HydroBASINS id, as published. */
  hybasId: number;
  /** The layer it was pinned from. */
  level: 4 | 6;
  /** Its area in km², as published. */
  subAreaKm2: number;
  /** One of `STRESS_LABELS`. */
  stressLabel: string;
}

/** The pin as the site sent it, or null when there is none or it does not hold. */
export function readPin(value: unknown): PinnedBasin | null {
  if (typeof value !== "object" || value === null) return null;
  const { hybasId, level, subAreaKm2, stressLabel } = value as Record<string, unknown>;
  if (typeof hybasId !== "number" || !Number.isInteger(hybasId) || hybasId <= 0) return null;
  if (level !== 4 && level !== 6) return null;
  if (typeof subAreaKm2 !== "number" || !Number.isFinite(subAreaKm2) || subAreaKm2 <= 0) return null;
  if (typeof stressLabel !== "string" || !STRESS_LABELS.includes(stressLabel)) return null;
  return { hybasId, level, subAreaKm2, stressLabel };
}

/** What came of GPS numbers the visitor typed, as the site found it. */
export const GPS_OUTCOMES = ["found", "outside", "failed"] as const;
export type GpsOutcome = (typeof GPS_OUTCOMES)[number];

/** The GPS outcome, or null for anything else. */
export function readGpsOutcome(value: unknown): GpsOutcome | null {
  return GPS_OUTCOMES.find((g) => g === value) ?? null;
}

/** The visitor's own words for where the project is, or blank. A longer one is left out whole, never cut. */
export function readPlace(value: unknown): string {
  if (typeof value !== "string") return "";
  const place = value.replace(/\s+/g, " ").trim();
  return place.length > 0 && place.length <= MAX_PLACE_CHARS ? place : "";
}

/**
 * The more exact place she heard, kept only when it is in the visitor's own last message, word for word, so a place is
 * never guessed (the maintainer, 2026-11-24). Numbers alone are not a place.
 */
export function readHeardPlace(value: unknown, said: string): string {
  const place = readPlace(value);
  const fold = (s: string): string => s.toLowerCase().replace(/\s+/g, " ");
  return place !== "" && /[a-zà-ɏ]{2}/i.test(place) && fold(said).includes(fold(place)) ? place : "";
}

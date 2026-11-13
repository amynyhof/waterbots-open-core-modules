// Violet's doors: where she works, and what each place shows. No sums here.
//
// - Agent Commons: Violet works alone. She asks the user for every value she needs and never sends them to
//   another agent. Her Commons door is part of this module (ruling 2026-11-12).
// - The sites: Violet reads the project record, does not ask again for a fact it holds, and hands back to
//   Wellington when she is done.
// - The screening: the water calculator always shows. Carbon shows beside it only when Phoebe reads carbon as
//   "likely" or "not enough known" (ruling 2026-10-01).
//
// Water and carbon sit side by side and are never added together, until open item N14 is ruled
// (ruling 2026-11-12). Nothing in this package adds a water benefit to a carbon figure.

export type Door = "agent-commons" | "site";

/** Phoebe's reading of whether a carbon claim fits the project. */
export type CarbonReading = "likely" | "not enough known" | "unlikely";

/** Whether the screening shows the carbon calculator beside the water calculator (ruling 2026-10-01). */
export function carbonShowsBeside(reading: CarbonReading | undefined): boolean {
  return reading === "likely" || reading === "not enough known";
}

/** The water calculator always shows on the screening. */
export const WATER_ALWAYS_SHOWS = true as const;

/** Who Violet hands back to when she is done, at each door. Null: in the Commons she hands to no one. */
export function handsBackTo(door: Door): "Wellington" | null {
  return door === "site" ? "Wellington" : null;
}

/** Whether Violet may read the project record at this door. In the Commons she asks the user instead. */
export function readsProjectRecord(door: Door): boolean {
  return door === "site";
}

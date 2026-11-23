// Violet's doors: where she works. Since family 1 (J2), this file gives way to core.
//
// - The host names Violet's place with core's `Place` (`@waterbots/core/places`): the Free site, the Paid site, the
//   Agent Commons or MCP (agent rule 21). On the two sites she reads the project record and hands back to Wellington.
//   In the Agent Commons and at MCP there is no record: she asks for each fact, and hands back to no one.
// - Whether Violet is called at all is the agent map's answer (`@waterbots/core/agentMap`), read with `violetCall`.
//   An unlikely water pathway's calculator is not called (W2), so water no longer always shows.
// - The old two doors, "agent-commons" and "site", still work, so a site that uses them keeps working until it moves.
//   `carbonShowsBeside` and `WATER_ALWAYS_SHOWS` are kept for the same reason. Nothing in this package uses them.
//
// Water and carbon sit side by side and are never added together, until open item N14 is ruled
// (ruling 2026-11-12). Nothing in this package adds a water benefit to a carbon figure.

import type { AgentCall, AgentMap } from "@waterbots/core/agentMap";
import { hasProjectRecord, type Place } from "@waterbots/core/places";

/** @deprecated The old two doors. Use core's `Place`: "site" is the Free site or the Paid site. */
export type Door = "agent-commons" | "site";

/** Phoebe's reading of whether a carbon claim fits the project: one set of words everywhere (ruling 2026-11-21). */
export type CarbonReading = "likely" | "more to learn" | "unlikely";

/**
 * Whether the screening shows the carbon calculator beside the water calculator (ruling 2026-10-01).
 * @deprecated The agent map decides who is called. Read Calvin's call on the map instead.
 */
export function carbonShowsBeside(reading: CarbonReading | undefined): boolean {
  return reading === "likely" || reading === "more to learn";
}

/**
 * @deprecated Water no longer always shows: the agent map decides whether Violet is called (W2). Use `violetCall`.
 */
export const WATER_ALWAYS_SHOWS = true as const;

/** True at a place with a project record: the two sites, or the old door "site". */
function onSite(place: Place | Door): boolean {
  return place === "site" || (place !== "agent-commons" && hasProjectRecord(place));
}

/** Who Violet hands back to when she is done. On the sites, Wellington. Elsewhere, no one: she works alone. */
export function handsBackTo(place: Place | Door): "Wellington" | null {
  return onSite(place) ? "Wellington" : null;
}

/** Whether Violet reads the project record here. In the Agent Commons and at MCP she asks for each fact instead. */
export function readsProjectRecord(place: Place | Door): boolean {
  return onSite(place);
}

/** Violet's call on the agent map: whether the host calls her, whether she is introduced, or why she is not called. */
export function violetCall(map: AgentMap): AgentCall {
  const call = map.agents.find((a) => a.agent === "violet");
  if (call === undefined) throw new Error("The agent map has no entry for Violet.");
  return call;
}

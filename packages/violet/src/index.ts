// Package entry: `@waterbots/violet`. Violet, the water-benefit agent, and the VWBA 2.0 D-n methods she hosts.
// Each D-n method has its own folder under `src/`. D-3, Volume Provided, is the first.
export const moduleName = "violet" as const;
/** Violet's colour, Orchid (ruling 2026-10-31). */
export const VIOLET_COLOUR = "#A457D4" as const;
/** The D-n methods Violet hosts. More join as they are built. */
export const D_METHODS = ["D-3"] as const;

export * from "./engine.js";
export * from "./doors.js";
export { computeD3Tool, d3Sources, parseD3Input, VIOLET_TOOLS } from "./agent/tools.js";

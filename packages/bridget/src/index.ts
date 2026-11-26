/**
 * @waterbots/bridget: Bridget, who looks after the basin map. Her instructions, the shape of her answer, the checks on it,
 * the checks on the pin, and reading GPS numbers. Her map and its data wait for the rights check. The call to the model,
 * its key, the daily limits, the buttons, the map screen and saving stay with each site.
 */
export const moduleName = "bridget" as const;

export * from "./answer.js";
export * from "./gps.js";
export * from "./instructions.js";
export * from "./pin.js";
export * from "./place.js";
export * from "./turn.js";

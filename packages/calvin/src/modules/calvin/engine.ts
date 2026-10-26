/**
 * THE ONE DOOR TO THE ENGINE (the cut, seams S10 and the seed).
 *
 * Every number Calvin shows comes from the deterministic engine in `calculators/` — the code the
 * reference suite tests and the seal tags. Nothing in `modules/calvin/` imports the engine any other
 * way, so when the seed carries the engine into the public package (`@<scope>/calvin/engine`), this
 * file is the only line that changes. The engine itself is not touched by the cut: a diff of the
 * engine against main stays empty.
 *
 * Re-exports only. A value computed here would be arithmetic outside the tested engine.
 */
export {
  computeScenario,
  computeTransitionWaterfall,
  derivePopulation,
  fnrbAvailability,
  householdSizeKnown,
  householdSizeNeeded,
  transitionAvailability,
  type FiledFnrbRefusal,
  type FiredFallback,
  type FnrbRefusal,
  type ScenarioInput,
  type ScenarioResult,
  type TransitionWaterfall,
} from "../../calculators/gs4gg-carbon/scenario";
export type { LegacyErOutput, PaaErOutput } from "../../calculators/gs4gg-carbon/types";
export {
  DEFAULT_STOVE_ETA,
  FUEL_FACTOR_NOTE,
  FUEL_LABEL,
  FUEL_SHARE_KEYS,
  PRESETS,
  STOVE_CLASS_LABEL,
  STOVE_SHARE_KEYS,
  defaultCharcoalConvention,
  presetShares,
  type CharcoalConvention,
  type FuelShares,
  type StoveShares,
} from "../../calculators/gs4gg-carbon/presets";
export { DEVICES_PER_PREMISES_RULE, QPW_PERSON_DEFAULT, validDevicesPerPremises } from "../../calculators/gs4gg-carbon/quantity";
export type { FallbackStopKey } from "../../calculators/gs4gg-carbon/fallback";
export { GS4GG_CALCULATOR_VERSION } from "../../calculators/gs4gg-carbon/version";
export { COUNTRIES } from "../../calculators/data/countries";

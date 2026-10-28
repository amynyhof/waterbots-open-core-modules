// The engine-only entry: `@waterbots/calvin/engine`. Added by this repo, not part of the seed.
//
// It passes on the calculator's math and its data, and nothing else: no React, no screen code, no agent code and no
// `@waterbots/core`. A site or tool can use the math alone. Re-exports only; this file computes nothing.
// `test/engine-entry.test.mjs` checks that nothing here reaches React or the screens. `scripts/check-engine-entry.mjs`
// checks that the built entry gives the same answers as `expected-outputs.json` in a folder with no React installed.
// The paths below end in `.js` so the built types also work for projects that use Node's own module rules.
export * from "./calculators/gs4gg-carbon/scenario.js";
export * from "./calculators/gs4gg-carbon/emissions-legacy.js";
export * from "./calculators/gs4gg-carbon/emissions-paa-v2.js";
export * from "./calculators/gs4gg-carbon/quantity.js";
export * from "./calculators/gs4gg-carbon/presets.js";
export * from "./calculators/gs4gg-carbon/baseline-ef.js";
export * from "./calculators/gs4gg-carbon/table9.js";
export * from "./calculators/gs4gg-carbon/fallback.js";
export * from "./calculators/gs4gg-carbon/version.js";
export type * from "./calculators/gs4gg-carbon/types.js";
export * from "./calculators/data/countries.js";

// The screen entry: `@waterbots/calvin/screen`. Added by this repo, not part of the seed.
//
// It passes on what a site needs to mount Calvin's screens, and nothing else. Re-exports only; this file computes
// nothing. The build bundles it into one file, `dist/screen.js`, so it loads under any module rules. React and
// `@waterbots/core` stay outside the bundle: the site installs them, and there is only ever one copy of each.
//
// What a site mounts:
// - `useCalculatorState`: the state hook. Every number on the screens comes from the engine through it.
// - `CalculatorLens`: the controls panel (the project facts, Save and Export).
// - `CalculatorWork`: the work surface (the equations, the ex-ante sliders when on, and the report tab).
// - `ReportView`: the report on its own, with `ReportHeading` and `ReportRow` for a site's own sections.
// - `VersionTabs`: the V1.0 / V2.0 tabs.
//
// Two stylesheets go with it: `@waterbots/calvin/styles.css` (the report's print rules; every site imports it) and
// `@waterbots/core/base.css` (the design tokens and the classes the screens use; only a site without the WaterBots
// design system of its own imports it). `scripts/check-screen-entry.mjs` mounts both views from the packed files.
// The built types are checked the way a site's bundler reads them, in that same check.
export { useCalculatorState } from "./modules/calvin/screen/useCalculatorState.js";
export type { CalculatorOptions, CalculatorState } from "./modules/calvin/screen/useCalculatorState.js";
export { default as CalculatorLens } from "./modules/calvin/screen/CalculatorLens.js";
export { default as CalculatorWork } from "./modules/calvin/screen/CalculatorWork.js";
export { default as ReportView, ReportHeading, ReportRow } from "./modules/calvin/screen/ReportView.js";
export type { ReportSlots } from "./modules/calvin/screen/ReportView.js";
export { default as VersionTabs } from "./modules/calvin/screen/VersionTabs.js";
export type { CalcState, CalvinProject } from "./modules/calvin/screen/state.js";
export type { SavedAnalysis } from "./modules/calvin/screen/analysis.js";
// A site's own country tables, passed to `useCalculatorState` as `options.tables` (V13).
export type { SiteTable, SiteTables, SiteTableValue } from "./modules/calvin/engine.js";

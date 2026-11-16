# @waterbots/calvin

Calvin is the module that quantifies: the carbon calculator. It arrived as a seed, a one-time copy carried over by the maintainer. `SEEDS.md` at the root of this repo records what arrived, when, and what was checked.

What is in `src/`:

- `calculators/gs4gg-carbon/`: the engine, with its tests on made-up cases. The engine does every sum.
- `calculators/data/`: the engine's data files, each citing its sources, and a test for each.
- `modules/calvin/`: the screens and their state, the notes and tools the agent reads, and `engine.ts`, the one door to the engine. The screens compute nothing.
- `modules/core/`: six small files that pass the seed's shared imports on to `@waterbots/core`. They are not part of the seed.
- `agents/`: Calvin's prompt, tool list and notes, and the base rules every agent follows.
- `sources/public-index.yaml`: the sources the data cites: titles, publishers, links and rights words only.
- `expected-outputs.json` and `prove-expected-outputs.test.ts`: the engine's results on made-up cases, and the test that re-runs them.
- `engine.ts`: the engine-only entry (see below). It is not part of the seed.
- `screen.ts`: the screen entry (see below). It is not part of the seed.

Two data files are cut down on purpose. The table of fallback factors holds six rows only, and the baseline mix is a labelled stub with no country data. The reason is in `SEEDS.md`.

## The engine on its own

`@waterbots/calvin/engine` is the calculator's math and its data, with no screens. It needs neither React nor `@waterbots/core`. A site or tool can use it alone:

```js
import { computeScenario, GS4GG_CALCULATOR_VERSION } from "@waterbots/calvin/engine";
```

The build bundles it into one plain file, `dist/engine.js`, that runs in Node or a browser. React is an optional peer: install it only to use the screens.

Two checks run on every `npm test`. `test/engine-entry.test.mjs` checks that the entry imports nothing but the engine and gives the same answers as `expected-outputs.json`. `scripts/check-engine-entry.mjs`, at the repo root, builds the entry, installs it alone in a folder with no React, and checks the same 48 answers there.

## The screens

`@waterbots/calvin/screen` is what a site needs to mount Calvin's screens: the state hook, the controls panel, the work surface, the report and the version tabs, with their types.

```jsx
import { useCalculatorState, CalculatorLens, CalculatorWork } from "@waterbots/calvin/screen";
import "@waterbots/calvin/styles.css"; // every site: the report's print rules
import "@waterbots/core/base.css"; // only a site without a design system of its own

function Seat({ project }) {
  const calc = useCalculatorState(project, { exAnteOnly: true });
  return (
    <>
      <CalculatorLens calc={calc} />
      <CalculatorWork calc={calc} project={project} appVersion="0.3.0" tab="calculator" />
    </>
  );
}
```

There are two views:
- **The ex-ante view**, for a project that has not run yet. With `exAnteSliders` on, the values a project can only anticipate are set on sliders.
- **The ex-post view**, for a project that has run, with its measured values in typed boxes.

A site that shows both (the paid site) offers its own switch between them. A site that shows only the ex-ante view (the open site's screening) passes `exAnteOnly: true`. Then every run is ex-ante, a saved ex-post analysis opens as ex-ante, and the sliders are on.

### New projects and transitioning projects

Each project also says whether it was already credited under the V1.0 methodology. The site passes it on the project as `creditedUnderV1`, from its own intake (ruling 2026-09-21):

- **`creditedUnderV1: true`**: a transitioning project. The screens show both versions and the transition: how the credits move from V1.0 to V2.0. They ask for the project's filed V1.0 fNRB (the share of firewood counted as unsustainably harvested) before they show the comparison.
- **`false`, or left out**: a new project, on paper or newly built. The screens show V2.0 only. There is no V1.0 figure, no transition, and no ask for a V1.0 filing the project does not have.

Left out means V2.0 only because the V2.0 figure is true for every project. Only the comparison needs a V1.0 filing.

```jsx
const project = { name: "Invented project", standards: [], technology: "CWS", country: "LSO", creditedUnderV1: true };
```

The build bundles the entry into one file, `dist/screen.js`. React and `@waterbots/core` stay outside it, so a site has one copy of each. `scripts/check-screen-entry.mjs`, at the repo root, packs both packages, installs them alone with React, and renders the ex-ante view, the ex-post view and its report, a new project's V2.0-only view and report, and a transitioning project's view and report from the packed files.

## Changes in 0.3.0

**Before you upgrade, a site that shows the transition must pass `creditedUnderV1: true` on every project credited under V1.0.** From 0.3.0, a project without it gets the V2.0-only view. Its transition, and the ask for its filed V1.0 fNRB, stop showing.

- New: the V2.0-only view for a new project, on the work surface and in the report (see "New projects and transitioning projects" above).
- `ReportView`: `legacyER` and `waterfall` may be left out. The report then covers V2.0 only.
- `CalculatorState` has `transition`: true when the screens show the transition.
- Fixed: Calvin's chat context no longer fails while a transitioning project's filed V1.0 fNRB is missing.
- Fixed: the figure tiles fit the width of their panel and no longer overlap at laptop width.
- Calvin needs `@waterbots/core` 0.1.1. Core's only change is its package file, which no longer has a `url` line.

No sum changed. The engine version and every reference case stay as they are.

## Notes

Since the seed landed, this repo is Calvin's home. Changes are made here, by pull request. `scripts/check-seed.mjs` proves what arrived against the commit where the seed landed, so later changes are allowed.

- Version 0.3.0. Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- The build writes plain files for a bundler to pick up. Apart from `dist/engine.js` and `dist/screen.js`, they do not run on their own in Node.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

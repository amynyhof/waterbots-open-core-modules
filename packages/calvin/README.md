# @waterbots/calvin

Calvin is the module that quantifies: the carbon calculator. It arrived as a seed, a one-time copy carried over by the maintainer. `SEEDS.md` at the root of this repo records what arrived, when, and what was checked.

What is in `src/`:

- `calculators/gs4gg-carbon/`: the engine, with its tests on made-up cases. The engine does every sum.
- `calculators/data/`: the engine's data files, each citing its sources, and a test for each.
- `modules/calvin/`: the screens and their state, the notes and tools the agent reads, and `engine.ts`, the one door to the engine. The screens compute nothing.
- `modules/core/`: six small files that pass the seed's shared imports on to `@waterbots/core`. They are not part of the seed.
- `agents/`: Calvin's prompt, tool list and notes. The rules every agent follows come from `@waterbots/core` (`agent-rules.md`).
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
      <CalculatorWork calc={calc} project={project} appVersion="0.4.0" tab="calculator" />
    </>
  );
}
```

There are two views:
- **The ex-ante view**, for a project that has not run yet. With `exAnteSliders` on, the values a project can only anticipate are set on sliders.
- **The ex-post view**, for a project that has run, with its measured values in typed boxes.

A site that shows both (the paid site) offers its own switch between them. A site that shows only the ex-ante view (the open site's screening) passes `exAnteOnly: true`. Then every run is ex-ante, a saved ex-post analysis opens as ex-ante, and the sliders are on.

### New projects and transitioning projects

Each project also says whether it was already credited under the V1.0 methodology. The site passes it on the project as `creditedUnderV1`, from its own intake:

- **`creditedUnderV1: true`**: a transitioning project. The screens show both versions and the transition: how the credits move from V1.0 to V2.0. They ask for the project's filed V1.0 fNRB (the share of firewood counted as unsustainably harvested) before they show the comparison.
- **`false`, or left out**: a new project, on paper or newly built. The screens show V2.0 only. There is no V1.0 figure, no transition, and no ask for a V1.0 filing the project does not have.

Left out means V2.0 only because the V2.0 figure is true for every project. Only the comparison needs a V1.0 filing.

```jsx
const project = { name: "Invented project", standards: [], technology: "CWS", country: "LSO", creditedUnderV1: true };
```

The build bundles the entry into one file, `dist/screen.js`. React and `@waterbots/core` stay outside it, so a site has one copy of each. `scripts/check-screen-entry.mjs`, at the repo root, packs both packages, installs them alone with React, and renders the ex-ante view, the ex-post view and its report, a new project's V2.0-only view and report, and a transitioning project's view and report from the packed files.

## Changes in 0.5.1

With Violet 0.5.1, for both sites. No sum changed, and every test case gives the same answer.

- **A missing value is a blank box, with no label.** In the ex-post ask, a monitoring value not yet entered has a
  blank box, its highlight and red dot, and nothing written under it. In the report's tables and on the equations, a
  value that is not there shows blank, in its value and its source cells, where it used to show "—" or
  "Not entered". A blank never counts as zero: with a monitoring value missing, no figures show.
- Where a sentence says what the sum did without a value, it stays, without the "Not entered" label. For example:
  "Eq.6 could not run; people-basis aggregate used".

**What a site should change.** Nothing. No exported name changed.

## Changes in 0.5.0

Released with Violet 0.5.0, for both sites. No sum changed, and every test case gives the same answer.

**A pinned header.** The main credit figures stay at the top while the reader scrolls: the PAA v2.0 tile in tCO₂e a
year, and for a project credited under V1.0 the Legacy V1.0 tile and the transition delta too. The smaller figures
sit right under them. Everything below can collapse: the sliders and the calculation each have a title that opens
and closes them. Both start open.

- `unpinFigureBlock` still works. Left out, the smaller figures stay pinned with the tiles. Set to `true`, the tiles
  stay pinned and the smaller figures scroll away with the page.
- On a phone (narrower than 640 pixels), only the tiles stay pinned, so the header never fills the screen.
- The pin lives in Calvin's stylesheet, `@waterbots/calvin/styles.css`, which every site already imports.

**What a site should change.**

- Keep importing `@waterbots/calvin/styles.css`. The pinned header, the phone layout and the parts that collapse are
  in it.
- The header pins to the top of the area that scrolls. A site with a fixed bar of its own at the top sets
  `--calvin-pin-top` to that bar's height, for example `--calvin-pin-top: 56px`. A site whose page colour is not
  `--card` can set `--calvin-pin-bg`.
- Nothing between the work surface and the area that scrolls may clip its overflow (`overflow: hidden` or `auto`).
  If something does, the header cannot pin.
- A site that set `unpinFigureBlock: true` can keep it: the tiles stay pinned either way. A site that wants the
  smaller figures pinned too leaves it out.
- The controls panel now holds only what the site passes in `header`, and Calvin's buttons. A site that puts an
  introduction of its own in `header` and no longer wants it there takes it out.
- `referenceCaseCount` is no longer shown. It is still accepted, so a site that passes it keeps working.
- `VersionTabs` takes `showNote`. Left out, it shows the sentence under its tiles, as before.

**What a visitor sees.**

- The controls panel holds only the site's own top and Calvin's buttons.
- The work surface ends with the calculation.
- The report's paragraph "How these figures were produced" is one sentence shorter.
- On a phone, nothing is squeezed: when a value's label would get too narrow, its tags and box move to a line of
  their own. The line about the pencil wraps as plain text.

## Changes in 0.4.1

Monitoring values are labelled by the analysis basis. No sum changed, and every test case gives the same answer. Only what the screens say, and when they show figures, changed.

**Which values the rule covers.** The maintainer is asked to confirm this list.

- The operating days: DO for a community system, DP (days the device is in the home) for a household device.
- The share of water tests that pass, M_q.
- The usage rate, U_p. Household devices only.
- The share still boiling the safe water, X_cleanboil.

**Not covered:** the metered volume, Q_m. It is a cap, and it stays optional. Left blank, no cap applies, as before. The baseline values (C_b and the stove and fuel mix) are not monitoring data, so they keep their own labels.

**Ex-ante (before the project runs).** Each value starts at its starting value and is labelled "Assumed", on the screen and in the report. The operating days start at a full year on the typed boxes, and at 347 days on the sliders. A value the person changes is their planned figure. It is still labelled assumed, and the label says where the figure will come from after the project runs.

**Ex-post (after it runs).** Each value comes from the operation log or monitoring, and is labelled so: for example, "From the operation log or sensor (V2.0 SDWS 32)". Until it is entered, its box is blank. There is no starting value and no fallback. The box has a light highlight and a small red dot. No figures are shown until every value is entered.

**Moving from ex-ante to ex-post asks again.** A figure entered ex-ante is a planned figure, not a monitored one. So a change of the run to ex-post clears the "entered" marks, and the screen asks for each value. Moving back to ex-ante keeps them.

**The "entered" flags are saved.** The analysis now saves four flags: `operationalDaysEntered`, `mQualityEntered`, `usageRateEntered` and `xCleanboilEntered`. A save never turns an entered value back into an assumed one, or the reverse.

- A saved flag is read as it stands.
- A save made before 0.4.1 has no flags. A value other than a starting value reads as entered. A starting value reads as assumed, so an older ex-post analysis may ask again for a value it holds.
- `slidersEntered` is still read from older saves, and is no longer written. The four flags replace it.

**For a site.** `CalculatorState` has a new field, `missingMonitoring`: the values an ex-post run still needs. It is empty on an ex-ante run. The agent's page context tells Calvin there are no figures, and not to offer a stand-in.

## Changes in 0.4.0

From the maintainer's walk of the open site (2026-11-16). No sum changed, and every test case gives the same answer.

**Two new settings on `useCalculatorState`.** Both are off by default, so a site that passes neither sees no change.

- `unpinFigureBlock: true` lets the block of headline figures above the equations scroll away with the page. By default it stays pinned at the top.
- `hideExportButton: true` hides Calvin's two export buttons: "Export report (PDF)" in the controls panel and "Export (PDF)" on the report tab. The report itself still shows.

**A new project fact, `pumpPower`.** The site passes what powers the pump: `"hand"`, `"gravity"`, `"solar"`, `"diesel"` or `"grid"`. For diesel or grid power, the screens ask for the pump's yearly emissions (tCO₂e) and show no figures until they are entered. Left out, the activity emissions stay zero, and the screens say when zero is right. The entered figure is saved in the analysis as `activityEmissions`.

**What a visitor sees.**

- The fNRB source is named ("A6.4-AMT-009 Table 3 (national default)"), and the screens say its values come from MoFuSS.
- The tag key sits behind an info icon, in four plain lines. The "derived" tag is now "calculated". Visitor text says "methodology" throughout.
- A value entered now that monitoring or a baseline survey must prove later shows both marks, for example "ENTERED · MONITORING", with one plain line.
- The sliders read "Assumed: [value], a cautious estimate.", with one line on which way credits move. Their citations sit behind an info icon. The drinking-water slider says how a project claims more: a Water Consumption Field Test, up to the 5.50-liter cap (V2.0 SDWS 29, p.65; Annex 2, p.89).
- Planned production stays blank until given, and is asked in plain words.
- On the screening view (`exAnteOnly`), C_b is shown, not typed. V2.0 sets no default for it (SDWS 12, p.53), so the screen says 0% is the most generous value and that the baseline survey sets it later.
- The DAF row opens to show its working: the tool and its version, the inputs, Table 03 and the country's row. BAU_y is listed under "where".
- Starting values follow project details that arrive after the calculator opens. A value the person changed stays.
- Long symbols no longer run into their titles, notes wrap, and every equation number uses one small style.
- The Beta footer is just the word "Beta".

## Changes in 0.3.0

**Before you upgrade, a site that shows the transition must pass `creditedUnderV1: true` on every project credited under V1.0.** From 0.3.0, a project without it gets the V2.0-only view. Its transition, and the ask for its filed V1.0 fNRB, stop showing.

- New: the V2.0-only view for a new project, on the work surface and in the report (see "New projects and transitioning projects" above).
- `ReportView`: `legacyER` and `waterfall` may be left out. The report then covers V2.0 only.
- `CalculatorState` has `transition`: true when the screens show the transition.
- Fixed: Calvin's chat context no longer fails while a transitioning project's filed V1.0 fNRB is missing.
- Fixed: the figure tiles fit the width of their panel and no longer overlap at laptop width.
- Calvin needs `@waterbots/core` 0.1.1. Core's only change is its package file, which no longer has a `url` line.

No sum changed. The engine version and every test case stay as they are.

## Notes

Since the seed landed, this repo is Calvin's home. Changes are made here, by pull request. `scripts/check-seed.mjs` proves what arrived against the commit where the seed landed, so later changes are allowed.

- Version 0.5.0. Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- The build writes plain files for a bundler to pick up. Apart from `dist/engine.js` and `dist/screen.js`, they do not run on their own in Node.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

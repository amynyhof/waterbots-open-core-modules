# @waterbots/calvin

Calvin is the module that quantifies: the carbon calculator. It arrived as a seed, a one-time copy carried over by Amy. `SEEDS.md` at the root of this repo records what arrived, when, and what was checked.

What is in `src/`:

- `calculators/gs4gg-carbon/`: the engine, with its tests on made-up cases. The engine does every sum.
- `calculators/data/`: the engine's data files, each citing its sources, and a test for each.
- `modules/calvin/`: the screens and their state, the notes and tools the agent reads, and `engine.ts`, the one door to the engine. The screens compute nothing.
- `modules/core/`: six small files that pass the seed's shared imports on to `@waterbots/core`. They are not part of the seed.
- `agents/`: Calvin's prompt, tool list and notes, and the base rules every agent follows.
- `sources/public-index.yaml`: the sources the data cites: titles, publishers, links and rights words only.
- `expected-outputs.json` and `prove-expected-outputs.test.ts`: the engine's results on made-up cases, and the test that re-runs them.
- `engine.ts`: the engine-only entry (see below). It is not part of the seed.

Two data files are cut down on purpose. The table of fallback factors holds six rows only, and the baseline mix is a labelled stub with no country data. The reason is in `SEEDS.md`.

## The engine on its own

`@waterbots/calvin/engine` is the calculator's math and its data, with no screens. It needs neither React nor `@waterbots/core`. A site or tool can use it alone:

```js
import { computeScenario, GS4GG_CALCULATOR_VERSION } from "@waterbots/calvin/engine";
```

The build bundles it into one plain file, `dist/engine.js`, that runs in Node or a browser. React is an optional peer: install it only to use the screens.

Two checks run on every `npm test`. `test/engine-entry.test.mjs` checks that the entry imports nothing but the engine and gives the same answers as `expected-outputs.json`. `scripts/check-engine-entry.mjs`, at the repo root, builds the entry, installs it alone in a folder with no React, and checks the same 48 answers there.

## Notes

Since the seed landed, this repo is Calvin's home. Changes are made here, by pull request. `scripts/check-seed.mjs` proves what arrived against the commit where the seed landed, so later changes are allowed.

- Version 0.1.0. Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- The build writes plain files for a bundler to pick up. Apart from `dist/engine.js`, they do not run on their own in Node.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

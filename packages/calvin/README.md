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

Two data files are cut down on purpose. The table of fallback factors holds six rows only, and the baseline mix is a labelled stub with no country data. The reason is in `SEEDS.md`.

The files that arrived with the seed are kept as they came. Change them only in their own pull request.

- Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- The build writes plain files for a bundler to pick up. They do not run on their own in Node.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

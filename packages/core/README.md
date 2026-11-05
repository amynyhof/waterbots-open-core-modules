# @waterbots/core

What every module shares. It arrived with the Calvin seed, a one-time copy of the Calvin module carried over by the maintainer. `SEEDS.md` at the root of this repo records what arrived, when, and what was checked.

What is in `src/`:

- `project.ts`: the shape of a project, as a module sees it.
- `standards.ts`: the list of standards a project can follow.
- `saveOutcome.ts` and `SaveNotice.tsx`: what a save can return, and the notice that shows it.
- `readOnly.tsx`: the read-only seat, for screens that must show a result but not allow edits.
- `agent.ts` and `calculatorTool.ts`: the agent contract, and the helper that turns a calculator into an agent tool.
- `base.css`: the design tokens and the classes the module screens use. A site without a design system of its own imports it: `import "@waterbots/core/base.css"`. The paid site does not; its own design system styles the screens. Every colour is a starting point that a site can set for itself. Not part of the seed.

Since the seed landed, this repo is its home. Changes are made here, by pull request. `scripts/check-seed.mjs` proves what arrived against the commit where the seed landed, so later changes are allowed.

- React is an optional peer. Only `SaveNotice.tsx` and `readOnly.tsx` use it.
- Version 0.1.0. Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

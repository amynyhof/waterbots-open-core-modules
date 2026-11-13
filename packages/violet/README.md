# @waterbots/violet

Violet is the water-benefit agent. Her colour is Orchid (`#A457D4`).
She counts the water a project provides, by the methods in Volumetric Water Benefit Accounting 2.0 (VWBA 2.0).
VWBA is a way to count the water a project gives back.

**Built here, not seeded.** Session C builds Violet in this repo, step by step (plan steps V7 and V8).

## What is in it

- `src/d3/`: D-3, the Volume Provided method, for household or community water supply. The engine does every sum.
  Every value says where it came from, and every step cites the guidebook by section and page.
- `src/screen/`: the D-3 screen. Before the project runs, it shows sliders. After it runs, it shows typed boxes for
  monitoring data. It computes nothing.
- `src/agents/violet/`: Violet's prompt, settings and knowledge notes.
- `src/agent/`: her calculator tool. The tool calls the engine; Violet does no sums.
- `src/doors.ts`: where Violet works and what each place shows.

## Entries

- `@waterbots/violet/engine`: the maths alone. No React.
- `@waterbots/violet/screen`: the screen. Needs React.
- `@waterbots/violet`: everything.

## Water and carbon

The water and carbon calculators sit side by side. They are never added together. Whether one project may claim
both is an open question (N14 in `BUILD_PLAN.md`).

## Checks

D-3 is tested on invented projects worked out by hand, each step cited. An outside expert checks the module once
the prototype is up. The spec is in `docs/vwba-d3-spec.md`.

Not published. Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

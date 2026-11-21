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

## Changes in 0.5.0

Violet's first release, with Calvin 0.5.0, for both sites. No sum changed.

- **People served come from the project record, the way Calvin takes them.** Only a count above zero counts, with
  whether it counts people or households, and people per household when the record has them. When the record's
  count arrives or changes after the screen opens, the screen follows it. When it is missing, the screen names
  what is missing and says to fill it in on the project record. The screen has no box of its own for it.
- **"Draft — pending expert review".** The screen shows this label under its title. Every D-3 result carries it as
  `status`, so a report or answer built from a result shows it too. Violet's prompt tells her to say so.
- New on the screen entry: `recordPopulation`, `followRecord` and `missingPopulationFacts`.

## Checks

D-3 is tested on invented projects worked out by hand, each step cited. An outside expert checks the module once
the prototype is up. The spec is in `docs/vwba-d3-spec.md`.

Not published. Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

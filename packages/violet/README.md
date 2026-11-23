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
- `src/record.ts`: how Violet reads the shared project record, and adds the facts she asked for and her results (J3).
- `src/doors.ts`: where Violet works. It gives way to core's places and the agent map (J2).

## Entries

- `@waterbots/violet/engine`: the maths alone. No React.
- `@waterbots/violet/screen`: the screen. Needs React.
- `@waterbots/violet`: everything.
- `@waterbots/violet/styles.css`: her screen's styles (0.5.1). A site imports it, with `@waterbots/core/base.css` when
  the site has no WaterBots design system of its own.

## Water and carbon

The water and carbon calculators sit side by side. They are never added together. Whether one project may claim
both is an open question (N14 in `BUILD_PLAN.md`).

## Changes since 0.5.1 (not released yet)

- **The shared project record (J3).** `d3InputFromRecord` reads people served as entered, the access level and the
  water before the project. `violetNeeds` lists what the record still lacks. `addVioletFacts` adds what the person
  gave her, and `addVioletResults` writes her input and her figure, with its status. Her screen takes `record` in
  place of `project`.
- **Her place (J2).** `readsProjectRecord` and `handsBackTo` take core's `Place`. `violetCall` reads her call on
  core's agent map. An unlikely water pathway's calculator is not called (W2). The old door names, `carbonShowsBeside`
  and `WATER_ALWAYS_SHOWS` still work, so a site keeps working until it moves. Nothing in this package uses them.
- No sum changed.

## Changes in 0.5.1

With Calvin 0.5.1, for both sites. No sum changed.

- **"Calculated".** A value worked out from other values is tagged `calculated`, as in Calvin. The four tags are
  `entered`, `default`, `calculated` and `assumed`. `Origin` changes from `"derived"` to `"calculated"`, and
  D-3's engine version is 0.1.1.
- **A missing value is a blank box, with no label.** On the screen, a value still awaited shows blank in its box, in
  the table and in its tag and note cells. A blank never counts as zero: the benefit shows only when every value it
  needs is given. The engine still marks an awaited value with `AWAITING` in its notes, for the agent; the screen
  never shows it.
- **"More to learn".** `CarbonReading` is `"likely"`, `"more to learn"` or `"unlikely"`. `"not enough known"` is
  gone.
- **A stylesheet.** `@waterbots/violet/styles.css` styles her screen with the same tokens, spacing and table style as
  Calvin's, and Orchid as her accent (`--orchid`, which a site may set). Every rule sits under `.violet-d3`.
- **The agent rules come from core.** Violet reads the foundational agent rules, rules 1 to 21, from
  `@waterbots/core/agent-rules.md`. The copy in `agents/_base-rules.md` is gone. Violet's prompt and notes now hold only
  what is different for her, in a warmer voice.
- **The tool's words.** The descriptions of her tool's inputs say what each fact is. They no longer list what
  the agent must not do; the agent rules cover that.
- **Core 0.1.2.** Violet needs `@waterbots/core` 0.1.2, which ships the agent rules file.
- Old pointers in code comments are cleaned up. No code changed for them.

**What a site should change.** A site that loads Violet's agent loads the rules from
`@waterbots/core/agent-rules.md`, where it loaded `agents/_base-rules.md` before. Import
`@waterbots/violet/styles.css`. Read `"calculated"` where it read `"derived"`, and pass `"more to learn"` where it passed `"not enough known"`. No exported name changed.

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

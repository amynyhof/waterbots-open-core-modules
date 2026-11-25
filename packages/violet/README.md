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

## Changes in 0.7.0 (not released yet)

Violet accepts any `@waterbots/core` in the 0.3 series, so she can be released on her own.

- **Her chat (J5).** The package gives what a site needs to run it:
  - `VIOLET_OPENED`, the turn that opens it, so she speaks first; `VIOLET_CHAT`, the model and how long a reply may be.
  - `violetAsks`: what is still missing, in order, project facts only. `violetKept`: the values at their default or their
    assumed start.
  - `VIOLET_ANSWER_SCHEMA` and `readVioletAnswer`: the shape of her answer, and its reader.
  - `violetChatContext`: the block for one turn. It says what to do when her part is done at each place.
- **Filling her screen from an answer.** `useD3State` (`@waterbots/violet/screen`) holds her state, as Calvin's hook does.
  A site calls it, passes it to `D3Screen` as `state`, and calls `state.fill(answer)`: her way of counting, days, litres,
  flow and hours. A number outside its range is refused with its message. Without it, her screen works as before.
- **What she can see of her screen:** `state.pageContext()`, or `violetPageContext`.
- **Her files ship:** `@waterbots/violet/prompt.md`, `knowledge.md` and `config.yaml`.
- **Value ranges (ruled 2026-11-23).** A number outside a value's range is refused where it is typed, with a message that
  names the value and the range. After the project runs, 400 days gets the message and no figure; before, the sum used
  365. Her tool refuses the same numbers in the same words, and `d3Refusals` lists them for a host. Her engine still holds
  days and hours at a year's end, as a last guard; nothing in this package sends it such a number.
- **On a phone** her tile stays at the top of the screen. The parts inside a fold have space between them.
- No sum changed.

**What a site should change.** Install core 0.3 with it. A site that shows her when its own rule says so can read her call on
core's map instead: she is called once Bridget has finished.

## Changes in 0.6.0

From 0.6.0 Calvin and Violet each have their own release. Violet needs `@waterbots/core` 0.2.0.

- **The shared project record (J3).** `d3InputFromRecord` reads people served as entered, the access level and the
  water before the project. `violetNeeds` lists what the record still lacks. `addVioletFacts` adds what the person
  gave her, and `addVioletResults` writes her input and her figure, with its status. Her screen takes `record` in
  place of `project`.
- **Her place (J2).** `readsProjectRecord` and `handsBackTo` take core's `Place`. `violetCall` reads her call on
  core's agent map. An unlikely water pathway's calculator is not called (W2). The old door names, `carbonShowsBeside`
  and `WATER_ALWAYS_SHOWS` still work, so a site keeps working until it moves. Nothing in this package uses them.
- **One calculator screen (J5).** Her screen now matches Calvin's.
  - **The header card** stays at the top. It holds her water benefit in a tile like Calvin's, with her draft label
    on it, three smaller figures and a source line. Under it: the project facts, the anticipated performance, the
    calculation step by step (each sum folds open to show its formula) and what must be true for the method. Each
    part folds.
  - **Sliders or typed boxes**, as on Calvin's screens: the Free site keeps sliders; the Paid site gets typed boxes
    before the project runs. `exAnteSliders` lets a site choose.
  - **Notes on values.** On the Paid site every value takes the person's note, from `record.agents.violet.notes` (or
    `notes`), and `onNotesChange` hands them back. Her report on the Paid site, the Free site and in the Agent Commons
    carries her own notes on the values still blank or assumed (`violetAgentNoteLines`). The Paid site's report
    shows both kinds of note, each under its own label. The Free site and the Agent Commons have no note box.
  - **Her tool says which values are blank or assumed.** Its output gains `blankOrAssumed`: a key, a name and "blank"
    or "assumed" for each, as facts. At MCP there is no export, so the visitor's own AI says them.
  - **Her report.** "Export (PDF)" prints her report alone, as Calvin's does. `hideExportButton` and `onExport` work
    as his do.
  - **Her colour, Orchid,** on the header card, through the shared `--agent` name. A site with a fixed top bar sets
    `--wb-pin-top`.
  - Her engine's own note on a value now sits under its source.
- No sum changed.

**What a site should change (J5).** Install `@waterbots/core` 0.2.0 with it. Pass `place`. A site with its own export
passes `hideExportButton`, as it does for Calvin, and puts her notes (`violetAgentNoteLines`) in it under
`agentNotesLabel("Violet")`, from `@waterbots/core/notes`. The Paid site keeps the person's notes on the record.

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

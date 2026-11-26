# @waterbots/wellington

Wellington, the Team Lead. He hosts the desk, learns the visitor's project in plain words, and introduces them to the
colleague who helps next. He leads from core's agent map. He has no tool.

**Built here, not seeded.** It comes from the open site's own files (J5, 2026-11-25), carried and checked.

## What it holds

- `src/agents/wellington/`: his own words. `prompt.md` is his instructions; `primer.md` is his own part of the primer;
  `free-site.md`, `paid-site.md` and `lobby-chat.md` are the few lines that fit one place only. `config.yaml` says what
  he reads. `npm run build:text` turns them into code; a test fails while the two differ.
- `wellingtonInstructions(place, shared)`: his instructions for his place, the same bytes every time. His first line
  names his real place, from core's `Place`. The site hands in rules 1 to 21 (core's `agent-rules.md`, whole), the
  roster part of the shared primer, the plain-words list and its examples, and the build status sheet. The colleagues
  he names come from core's crew list.
- `projectTypesText`: the twenty water stewardship activity types and "none of these", as he reads them. The words are
  core's one copy (`@waterbots/core/projectWords`).
- `readWellingtonAnswer` and `WELLINGTON_RESPONSE_SCHEMA`: his answer's shape and the checks on it. A route and what he
  heard are fields from closed lists; the site acts on them, never on his words. `addWellingtonFacts` puts what he heard
  on the record through core's `changeFacts`.
- `mapNote`, `mapBlock`, `stepEndNote`, `stepEndRoute`, `guardRoute`, `saysAllDone`: how he reads core's map and hosts
  by step. `readMap` checks a map that came from the browser.
- `wellingtonBlocks` and `checkWellingtonTurn`: the blocks for one turn, in order, and what to do with his answer: show
  it, ask the same question once more, or say it could not be shown.
- `countryIsoFor`: the one country a place names, word for word, from a list the site gives.

**No kind, no class (decided 2026-11-25).** He learns where the water comes from, whether it is treated and where, and
whether the water at the source is safe to drink, as plain facts in ordinary conversation. Core works out how the project
is counted. He never asks for a kind or a class.

## What a site must do

1. Build his instructions with `wellingtonInstructions(place, shared)`, for the place he is at. Hand in the status sheet
   as you hold it.
2. Run core's `agentMap` on the shared record and give him `mapNote(record, map)`. Give him what Phoebe found as
   `FoundPathway` lines, never her sentences.
3. Put `wellingtonBlocks(...)` after his instructions. Read his answer with `checkWellingtonTurn(...)`: show it, ask once
   more with `pass: 2`, or say it could not be shown.
4. Put `answer.context` on the record with `addWellingtonFacts`. Show `REFUSED_LINE[refusedCount(...)]` beside a refused
   count.
5. Read his answer chips with core's `readChips` (already done in his answer) and draw them yourself.

**Remove:** your own copy of his instructions, his answer's checks, the project types and classes, the map's reading,
the step notes and the route guards; any question for a class, and the class field in his answer.

## What stays with each site

The call to the model and its key, the daily limits, the buttons and chips on screen, saving, the report, logging and
streaming.

- Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

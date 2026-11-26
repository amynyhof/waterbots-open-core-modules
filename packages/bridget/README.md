# @waterbots/bridget

Bridget looks after the basin map. She helps a visitor give a more exact place for their project, and says the water
stress reading where it is pinned. Built here, not seeded: from the open site's files of 25 November 2026 (J5, step 4).

**Her map is empty for now.** The map screen and its data (the basin outlines, the water-stress readings and the country
boxes) wait for the rights check. Until then the site keeps its own map, and hands her the basin and its reading.

## What it holds

- `src/agents/bridget/`: her own instructions (`prompt.md`) and settings (`config.yaml`). Rules 1 to 21 are not in them:
  they come only from `@waterbots/core/agent-rules.md`.
- `bridgetInstructions`: her whole instructions for one place, put together the same way on every site: her first line,
  which names her door; her voice; rules 1 to 21; her own text; the look-up rule; the roster part of the shared primer and
  the build status sheet, which the site hands in. Her chat runs on the Free site and the Paid site only.
- `pin.ts`: the checks on the pin (a pin whose level, area or label the map could not have made is refused whole), the
  GPS outcome, and the place she heard, kept only when it is in the visitor's own last words.
- `gps.ts`: GPS numbers read by code, never by a model (`readGps`). Finding the basin a point falls in needs the map data,
  so `basinContaining` takes the basins as an argument.
- `place.ts`: a more exact place goes in front of the country Wellington heard (`placedPlace`), and the one country a
  place names (`countryIsoFor`, with the site's own list of countries).
- `turn.ts`: the turns no visitor typed, the visit block, the record block (the record Phoebe reads), and the order of
  the blocks.
- `answer.ts`: the shape of her answer, the checks on every field, when a reply goes again (the look-up fix, two calls at
  most), and the fields settled in code: the place, the map chip and the hand-back.

## What a site must do

1. Read `@waterbots/bridget/prompt.md` and `@waterbots/core/agent-rules.md`, and pass them to `bridgetInstructions`, with
   its place, its own roster part of the primer (with its pack sentence filled in) and its status sheet.
2. Read GPS numbers in the visitor's message with `readGps` before she is asked. Find the basin with its own map data, and
   pass `found`, `outside` or `failed`.
3. Check the pin with `readPin`. A pinned turn with no pin that holds is not sent.
4. Build her turn with `chatForTurn`, `visitBlock`, `bridgetRecordBlock` and `turnBlocks`.
5. Read her answer with `readBridgetAnswer`, decide with `replyVerdict`, settle it with `settleBridgetAnswer`, and act on
   the fields only. Put the place she heard in front of the one held with `placedPlace`. Check it again where it is shown
   with `readBridgetAnswerAgain`.

**What a site removes:** its own copies of her instructions and answer shape, the pin checks, the GPS reader and the
checks on her answer.

**What stays with each site:** the call to the model and its key, the daily limits, the buttons, the map screen and its
data, and saving.

## Notes

- Version 0.1.0: her first release in this repo. Not published. Nothing in this repo goes to npm yet; the package is marked
  `private`.
- Her rulings are the maintainer's to write.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

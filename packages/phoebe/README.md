# @waterbots/phoebe

Phoebe is the eligibility and feasibility agent. She finds which funding paths might suit a water project: water
benefits, carbon credits, both or neither, and what would change a "no". She works one question at a time on her
eligibility worksheet, from her two knowledge packs.

**Built here, not seeded.** This first package (0.1.0, J5) is built here from the open site's own Phoebe, at commit 0f16957,
from the carry of 25 Nov 2026. Her cards travel byte for byte.

## What is in it

- `src/agents/phoebe/`: her own instructions (`prompt.md`) and her settings (`config.yaml`). Rules 1 to 21 are not in
  them: a site adds core's `agent-rules.md` whole.
- `src/packs/`: her two knowledge packs, each with its cards, its tool file (`tool/eligibility-worksheet.yaml`) and its
  README. They are the carried files, byte for byte, and a test holds each to its fingerprint.
  - `vwba-2.0`: the water pathway, from Volumetric Water Benefit Accounting 2.0 (World Resources Institute, 2025,
    https://doi.org/10.46830/wrigb.23.00112, CC BY 4.0).
  - `gs-paa-v2.0`: the carbon pathway, from the safe drinking water carbon method and the requirements it rests on.
    Its README lists every document it cites, with its version and link.
- `src/generated/`: the same files as code, so they run in Node and in a browser. `worksheet.generated.ts` and
  `tool.generated.ts` were made by the open site's generator from the two tool files; a test pins each pair together.
  `cards.generated.ts` and `prompt.generated.ts` are made here: `npm run generate`. A test holds them to their files.
- `instructions.ts`: her instructions for one door, the card sets each turn is given, and the shape of her answer.
- `turn.ts`: the blocks a site adds after her instructions on each call, and every check on her answer.
- `worksheet.ts`: the worksheet's state, her verdicts applied to it, and when her part is done.
- `reading.ts`: how each pathway's reading is worked out, and what she adds to the shared project record.
- `cards.ts`, `evidence.ts`: her cards, read from the card files, and the citation behind each card she names.
- `stream.ts`, `words.ts`: her reply read while it is written, and her reply's length and card words, measured.
- `EligibilityWorksheet.tsx`: her Tool tab, at `@waterbots/phoebe/screen`. It needs React.

## What a site does

1. Build her instructions once per door with `phoebeInstructions({ door, agentRules, primer, statusSheet, plainWords,
   beforeAfter, siteLines })`. The site hands in the shared texts, as it does today, and its own lines in `siteLines`.
2. On each call, add `phoebeTurn(...).blocks` after them, in order. The first block is the cards: it can be cached on its
   own.
3. Read each answer with `readPhoebeAnswer`. Where `needCards` names a set, or the reply ends by promising a look-up
   (core's `leavesWaiting`) and she has not handed back, ask the same question again with `nextSets` and `again: true`.
   Three calls at most (`MAX_PASSES`); it is one answer to the visitor. On the opened turn, use `openedAnswer`.
4. Apply her verdicts with `applyUpdates`, write them to the record with `addPhoebeResults`, and read them back with
   `sheetFromRecord`. Show her citations with `evidenceFor`.
5. While a reply streams, show `showable(replySoFar(raw))`, and nothing of a pass whose `needCardsSoFar` names a set.
6. Draw her Tool tab with `EligibilityWorksheet`, passing her portrait and the map button where the site has them.

**What a site removes:** its own copies of her instructions, her answer's shape and checks, the card stages, the worksheet
module and state, the card reader, the reading, the reply-stream reader and the card-word list. Its own call to the model,
its key, limits, streaming, buttons, chips on screen and saving stay.

**Lines that fit one site alone** are no longer in her instructions: the consulting page with no link yet, the team's box
beside the save button, the transition module on the paid site, the screen's own words for its parts, and the (ref)
markers. A site that wants one hands it in `siteLines`.

## Not in it

- The call to the model, its key and its settings; the daily limits; the buttons; saving; the report; logging.
- Her rulings. The maintainer writes them.
- The packs' grader notes and logs: they are notes to the maintainer.

## Versions

- 0.1.0: her first package. It needs `@waterbots/core` in the 0.4 series.
- Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

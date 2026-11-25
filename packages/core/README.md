# @waterbots/core

What every module shares. It arrived with the Calvin seed, a one-time copy of the Calvin module carried over by the maintainer. `SEEDS.md` at the root of this repo records what arrived, when, and what was checked.

What is in `src/`:

- `project.ts`: the shape of a project, as a module sees it.
- `standards.ts`: the list of standards a project can follow.
- `saveOutcome.ts` and `SaveNotice.tsx`: what a save can return, and the notice that shows it.
- `readOnly.tsx`: the read-only seat, for screens that must show a result but not allow edits.
- `agent.ts` and `calculatorTool.ts`: the agent contract, and the helper that turns a calculator into an agent tool.
- `record.ts`: the shared project record (J3): its shape, and the fact check a site runs where a fact is entered. A count below zero is refused. An agent adds only the facts the record lacks, each one counted as a question it asked, and writes its results to its own part. Not part of the seed.
- `notes.tsx`: notes on values (J5, one calculator screen). The person's note box and the export's "Notes on values"
  tables, shared by every calculator screen. The person's notes live on the record, in each agent's own part. On the
  Paid site the person writes them, and the export carries both the person's notes and the agent's, each under its own
  label. On the Free site and in the Agent Commons there is no note box, and the export carries the agent's. Not part
  of the seed.
- `noteFacts.ts`: the shapes behind those notes, with no React. A calculator tool can return the values a run left
  blank or assumed (`blankOrAssumed`), as facts, for a place with no export (MCP). Not part of the seed.
- `ranges.ts`: the range of each value a person can enter, with one check and one message (ruled 2026-11-23). The record's
  fact check, the calculator screens and the agents' tools all use it. A method cap is not a range. Not part of the seed.
- `rangedNumber.tsx`: the typed number box every calculator screen uses. It refuses a number outside its range where it
  is typed, and puts the value in force back as it was. Not part of the seed.
- `technologyLabels.ts`: the one list that turns each site's technology label into the record's code. A label that is
  not covered yet has no code: community level treatment, institutional treatment, and a new or alternative water
  supply. Not part of the seed.
- `places.ts`: the four doors of agent rule 21, and the lobby chat, which is not a door. Not part of the seed.
- `agentMap.ts`: the agent map (J4). It reads the record and the place, and says which agents are called, which method applies and the one next step. It gives codes, never words, and does no sums. Violet is called only for the kinds of project that give people water (`recordWaterSupply`); for treatment the reason is "not covered yet", and for the rest "another kind of project". The pathway then stays in play with no calculator agent, and `noMethod` says why. Not part of the seed.
- `chat.ts`: what a calculator agent's chat shares (J5): the one question to ask, the values left at their default or their
  assumed start, what to do when the part is done at each place, and the block a site adds for a turn. It gives
  instructions and facts, never lines to say, and calls no model. Not part of the seed.
- `reply.ts`: the checks on a reply: its length, its reading level and the hand-back field. Carried from the open site with
  its numbers unchanged. Not part of the seed.
- `roster.yaml` and `crew.ts`: the crew list, as the file the maintainer edits (`@waterbots/core/roster.yaml`) and as
  code. A test keeps the two the same. Not part of the seed.
- `agent-rules.md`: the foundational agent rules, rules 1 to 21 of `AGENT_RULES.md` at the root of this repo, word for word. Every agent reads them before its own files. A host reads them as `@waterbots/core/agent-rules.md`. A test keeps them the same as the page. Not part of the seed.
- `base.css`: the design tokens and the classes the module screens use. A site without a design system of its own imports it: `import "@waterbots/core/base.css"`. The paid site does not; its own design system styles the screens. Every colour is a starting point that a site can set for itself. Not part of the seed.

Since the seed landed, this repo is its home. Changes are made here, by pull request. `scripts/check-seed.mjs` proves what arrived against the commit where the seed landed, so later changes are allowed.

- React is an optional peer. Only `SaveNotice.tsx`, `readOnly.tsx`, `notes.tsx` and `rangedNumber.tsx` use it.
- Version 0.3.0: it adds the value ranges, the chat, the checks on a reply, the crew list, the rest of the open site's facts, Phoebe's rows and Bridget's basin, and a limit and a writer on each note. The agent map calls a later agent only when the agent before it has finished, gives each agent its step, and asks only about the pathways a site reads. Three kinds of project have no technology code yet. Each label also says whether Violet's D-3 counts it (`waterCoverage`). A new or alternative supply is asked first whether people use the water at home (`homeUse`): the map's next step asks Wellington to gather it. Nothing is removed. 0.2.0: it adds the shared project record and its fact check, the label list, the places, the agent map, and notes on values. `base.css` adds `--agent`, the colour of the agent whose screen it is. Nothing is removed. 0.1.2 shipped `agent-rules.md`, the agent rules file. Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

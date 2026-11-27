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
- `projectKinds.ts`: the kinds of drinking-water project, worked out from a few plain project facts, and the one table of what
  Calvin and Violet do with each (decided 2026-11-25). Nobody is asked for a kind, and no agent chooses one. It also holds
  the one question for each fact, the method's conditions as facts with their source and page, and the short labels for
  when no figure shows. Not part of the seed.
- `projectWords.ts`: the words for a project's type and stage, one copy that both sites and every agent read. They are the
  open site's own, with no word changed, except that C-19 no longer says a class is asked. The four classes' words are kept
  only to read a screening made before today's rules. Not part of the seed.
- `technologyLabels.ts`: the one list of each site's technology labels. It reads the table. A label never decides a new
  project's kind; it gives a project that already exists its code. Not part of the seed.
- `numbers.ts` and `numberGuard.ts`: a reader of numbers as a person writes them, and the guards on the numbers in an
  agent's answer. They are the same on both sites. Not part of the seed.
- `places.ts`: the four doors of agent rule 21, and the lobby chat, which is not a door. Not part of the seed.
- `lookUp.ts` and `chips.ts`: the look-up fix (an answer comes in the same turn) and the answer chips, shared by every live
  agent's chat. Carried from the open site with their patterns and limits unchanged. Not part of the seed.
- `agentMap.ts`: the agent map (J4). It reads the record and the place, and says which agents are called, which method applies and the one next step. It gives codes, never words, and does no sums. Violet is called only for the kinds of project that give people water (`recordWaterSupply`); for treatment the reason is "not covered yet" (held for now), and for the rest "another kind of project". Calvin is not called where a type of project is "not set up yet". While a fact is blank, `ask` is the one small question. The pathway then stays in play with no calculator agent, and `noMethod` says why. Not part of the seed.
- `chat.ts`: what a calculator agent's chat shares (J5): the one question to ask, the values left at their default or their
  assumed start, what to do when the part is done at each place, and the block a site adds for a turn. It gives
  instructions and facts, never lines to say, and calls no model. Not part of the seed.
- `reply.ts`: the checks on a reply: its length, its reading level and the hand-back field. Carried from the open site with
  its numbers unchanged. Not part of the seed.
- `roster.yaml` and `crew.ts`: the crew list, as the file the maintainer edits (`@waterbots/core/roster.yaml`) and as
  code. A test keeps the two the same. Not part of the seed.
- `agent-rules.md`: the foundational agent rules, rules 1 to 21 of `AGENT_RULES.md` at the root of this repo, word for word. Every agent reads them before its own files. A host reads them as `@waterbots/core/agent-rules.md`. A test keeps them the same as the page. Not part of the seed.
- `base.css`: the design tokens and the classes the module screens use. A site without a design system of its own imports it: `import "@waterbots/core/base.css"`. The paid site does not; its own design system styles the screens. Every colour is a starting point that a site can set for itself. Not part of the seed.
- The console's shared parts (family 4, Console and surfaces; the shared console page of 26 Nov 2026). Not part of the seed.
  - `print.ts`: the print part. On export, the report is copied into a print area of its own under `<body>`, and only
    that area prints, so a report prints in full inside any console. When no print window opens, the report opens in
    its own tab, and the outcome says which happened. `printReport` returns a promise of the outcome, because some
    browsers open the print window only after `window.print()` returns. The print area leaves the page however the
    print ends, also when the window is cancelled, so a second export prints in full.
  - `report.tsx` and `report.css`: the one report frame for every calculator: one header, the sections in one order,
    one footer, one width, one notes table and one time stamp (`reportStamp`). Calvin's and Violet's stylesheets carry
    `report.css` at the top, so a site that imports either has it. A site's own report page imports
    `@waterbots/core/report.css`.
  - `agentColours.ts`: the agents' one colour list. Calvin is Reef (`#0E8A94`) and Violet is Orchid (`#A457D4`).
    Wellington, Phoebe and Bridget keep the sites' current colours until the maintainer rules.
  - `tap.ts`: the tap size, 44 pixels, also the `--wb-tap` token.
  - `consoleWords.ts`: the console's words: the six steps, the hand-off button, the beta note, the export's words,
    "Keep chatting" and the unsaved-work warning.
  - `commons.ts`: the Agent Commons reader. It takes each installed package's card and lists the installed agents,
    then every other seat as coming.

Since the seed landed, this repo is its home. Changes are made here, by pull request. `scripts/check-seed.mjs` proves what arrived against the commit where the seed landed, so later changes are allowed.

- React is an optional peer. Only `SaveNotice.tsx`, `readOnly.tsx`, `notes.tsx`, `rangedNumber.tsx` and `report.tsx` use it.
- Version 0.6.0: **the console's shared parts** (family 4): the print part, the one report frame, the colour list, the
  tap size, the console's words and the Agent Commons reader. Nothing in 0.5.0 changed its meaning; the note
  buttons are now 44 pixels at the least. **What a site should change:** install core 0.6.0 with the agent packages
  of the same release. Show `BETA_NOTE` above every typing box, the steps and hand-offs from `consoleWords.ts`, and the
  agents' colours from `AGENT_COLOURS` (a `null` colour keeps the site's own for now). The Agent Commons passes each
  installed package's `AGENT_CARD` to `commonsAgents`. A site's own report export uses `printReport`, waits for the outcome
  it returns, and tells the person what it was (`EXPORT_WORDS`).
- Version 0.5.0: **a fact is filled only when the person gave it** (`factGuard.ts`). Every agent's facts are checked against the visitor's own messages, as its numbers are: a fact the agent asks about in the same reply is refused; a yes-or-no fact and home use are taken only as the answer to the question just asked; any other fact only with the visitor's own words (`heard`). A fact that fails goes back to the agent once, then stays blank, so no figure rests on it. **A door's plain facts** (`DoorFacts` in `places.ts`): whether the project is saved, when a change is kept, whether there is a Project Record page, and the site's own values, which an agent reads instead of the package's. The chat block shows each ask's key, and tells an agent on its first turn that it has not talked with the visitor before. **When the source or the treatment changes, every reading is worked out again** (`changeFacts`): the pathway readings come off, Phoebe is called again with her rows kept (`factsChanged`), and the old line for what the project does comes off. `noFigureWords` gives the crew list the same sentence as a desk with no figure. Nothing is removed.
- Version 0.4.0: it adds the look-up fix and the answer chips (`lookUp.ts`, `chips.ts`), the kinds of project and the one table, the guards on an agent's numbers, `changeFacts`, and the save ticket's kind facts (`kindTicket`, `addKindTicket`). Community level treatment is counted for carbon again. **A site starts a new project with `newProjectRecord`.** A screening that already exists is one whose record has no `facts.rules`: it keeps its answers and gets no new question. An update never changes a screening. Working a project out again is a new screening (`newScreening`), with its own number, date, and agents and package versions, and the site keeps the earlier one beside it. Under the carbon method, a project credited under V1.0 gets an answer under each version (`carbonAnswers`), and each figure stands on its own version's conditions. The method's conditions are facts with their source and page (`METHOD_CONDITIONS`), for an agent to explain in its own words. The map's basic facts are now the source, the treatment and the country. 0.3.0: it adds the value ranges, the chat, the checks on a reply, the crew list, the rest of the open site's facts, Phoebe's rows and Bridget's basin, and a limit and a writer on each note. The agent map calls a later agent only when the agent before it has finished, gives each agent its step, and asks only about the pathways a site reads. Three kinds of project have no technology code yet. Each label also says whether Violet's D-3 counts it (`waterCoverage`). A new or alternative supply is asked first whether people use the water at home (`homeUse`): the map's next step asks Wellington to gather it. Nothing is removed. 0.2.0: it adds the shared project record and its fact check, the label list, the places, the agent map, and notes on values. `base.css` adds `--agent`, the colour of the agent whose screen it is. Nothing is removed. 0.1.2 shipped `agent-rules.md`, the agent rules file. Not published. Nothing in this repo goes to npm yet; the package is marked `private`.
- Apache License 2.0. See `LICENSE` and `NOTICE` in this folder.

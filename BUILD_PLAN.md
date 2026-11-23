# Build plan — the open core modules, steps M1 to M10

## The v1 finish line

v1 is done when both are true:

1. **Reliable.** The carbon calculators reproduce two real filings: one household water treatment filing and one
   community water supply filing. The private side checks this; we only hear pass or fail. The water-supply module
   (VWBA D-3) is tested on hand-worked cases, with every step cited to the VWBA 2.0 guidebook. The guidebook has no
   worked example for D-3. An outside expert checks the module once the prototype is up. VWBA is Volumetric Water
   Benefit Accounting, a way to count the water a project gives back.
2. **Whole journey.** A visitor runs a screening: Wellington, then Phoebe, then Bridget, then Calvin, then a report or
   sign-up. We count the questions on each walk and report the average. There is no cap. The project saves to the paid
   site. The same inputs give the same numbers on both sites. Where the paid site uses more precise data, the
   difference can be explained, or the report shows what changed.

Benchmarks and pass rates are v2. No water-benefit filing match is needed for v1.

---

Each step is one coherent, testable thing the maintainer can check in one sitting and undo in one motion. Each step holds items:
the pull requests or checks inside it. Each step belongs to one of the nine families below. "Family" means only those
nine. `[x]` done (merged), `[~]` open pull request, `[ ]` not started,
`[!]` blocked until the maintainer acts. **(V1)** marks an item inside a step that v1 needs, even where the rest of its step
comes after v1. **(V2)** marks an item planned for v2.

All of M1 to M10 is `Grant: open`. Edits to this plan and the build log are `Grant: neither`.

## The nine families

One set of nine families, the same for all three repos. Every open step, item and open question
carries one family label, written *Family: name.* In the Road to v1 table it is the Family column. A step's label is its
main family. An item inside it that belongs to another family carries its own label.

| Family | What belongs here |
|---|---|
| 1. Agent orchestration | how agents plug into both sites; the one shared project record; what each agent reads and writes; which pathway and method a project is on and which are unlikely; hand-offs between agents; installing core releases. |
| 2. Calculators and methods | the maths, method values, defaults, labels and where each value comes from. |
| 3. Knowledge | what the agents are allowed to know: cards, packs, hosted copies. |
| 4. Console and surfaces | what a visitor sees and clicks, the same on both sites: layout, navigation, header, Save, words, phone, design, report. |
| 5. v1 proof and grading | showing it works: real-filing matches, same numbers, whole-journey walks, question counts, exams, the grading rig. |
| 6. Data and map | real outside data and the rights to use it: basins, project points, corporate goals. |
| 7. Paid platform | paid-only structure: roles, organizations, programs, documents. |
| 8. Security and hygiene | secrets, names to block, alerts, repo settings, speed and weight, stale rules and docs, close-outs. |
| 9. Experts and partners | what outside experts review, what we owe partners, and what we send them. |

**Needs a family:** nothing today.

---

## Road to v1

This list holds only the work **in this repo** that v1 needs, in order. Wellington, the report and sign-up pages and
both sites live in other repos. They appear here only as things a step waits on.

**How the sites get the package in v1.** Not npm. Each release is a GitHub release that holds the packed package (one
file, made by `npm pack`) and its fingerprint (a scrambled code that changes if one byte of the file changes). Both
sites pin that file by its fingerprint. The first pinned version includes the sliders. npm is v2.

| # | Family | Step | Waits on | Done when |
|---|---|---|---|---|
| V5 | v1 proof and grading | [~] (Released 2026-11-05: tag `calvin-v0.1.0` on commit `3020ee7`, recorded in `SEEDS.md`. Still to come: both sites pin it, and the private side reports pass or fail.) The first GitHub release: the packed packages (`calvin` and the `core` it needs) and their fingerprints, with both views: the ex-ante view with sliders, and the full ex-post view. A site mounts them through `@waterbots/calvin/screen`; the open site locks to ex-ante. Replaces the npm publish in M2.2. It does not wait for the simple view. | The maintainer's approval; the tag rule (M1.4). | The release holds the files and their fingerprints. Both sites pin it. The private side reports pass or fail on both carbon filings. |
| J1 to J9 | Agent orchestration | The v1 scope of family 1. See "Family 1: the v1 scope" below. | See each job. | See each job. |
| V8 | Experts and partners | [x] (Merged, pull request #18. Still to come: the outside expert's check, and N14 and N15 for the outside expert group.) D-3, the water-supply module, inside Violet (M8.1). | It does not wait for the activity-type signature or N6: D-3 is a prototype the outside expert checks later. | Violet's D-3 tests are hand-worked cases, with every step cited to the guidebook (cited, not copied). The VWBA spec is written alongside the build, in `docs/`, and the maintainer reviews it then. An outside expert checks the module once the prototype is up. |
| V14 | v1 proof and grading | The same-numbers check: a project saved by the screening, read back the way the paid site reads it, gives the same numbers, or a list of what changed and why. | J3, J4, J5. | A test passes here on invented projects. The private side runs it on both real filings with the pinned release and reports pass. |
| V15 | v1 proof and grading | The v1 release: a GitHub release that both sites pin. | V8, V14; the maintainer's approval. | Both sites run the same pinned file. The maintainer confirms the whole journey on the live sites, and the average question count is reported. |
| V20 | Agent orchestration | [x] (Released: tag `calvin-violet-v0.5.0` on commit `1bce514`. The sites install it through 0.5.1, J1.) Calvin and Violet 0.5.0, one release for both sites. Calvin: the main credit tiles (tCO₂e a year) are a pinned header, whether or not a site sets `unpinFigureBlock`; the smaller figures sit right under them; the sliders and the calculation collapse. The controls panel holds only the site's own top and Calvin's buttons, the work surface ends with the calculation, and the report's note on how the figures were produced is one sentence shorter. A phone pass: rows wrap instead of squeezing. Violet: people served come from the project record, as Calvin takes them, and "Draft — pending expert review" shows on the screen and on every result. No sum changes. | V8. | Session C packs all three packages, runs the release check and makes the tag. One release holds all three files. After "release it", Session C pushes the tag and publishes the release. Both sites install it. |

**Where things stand (2026-11-23):** The latest release is `calvin-violet-v0.5.1` (J1): Calvin 0.5.1, Violet 0.5.1 and core 0.1.2. Both sites still install it. Family 1, Agent orchestration, is open: its v1 scope is J1 to J9. The core pull request for J2, J3 and J4 (#46), the agents pull request for Calvin and Violet (#49) and the one calculator screen (#52) are merged, not released yet. Finished steps are in the build log.

**Sources still to find:** in the source sweep, M10.4.

**After v1** (not needed for the finish line):

- *Family: Security and hygiene.* npm publishing (M2.2's publish, and the npm scope and token in M1.4). This is v2.
- *Family: v1 proof and grading.* Benchmarks and pass rates. This is v2.
- *Family: Security and hygiene.* M2.3 linting.
- *Family: Calculators and methods.* M4 openings and labels.
- *Family: Console and surfaces.* M5 the friendly view, beyond the sliders (released) and its items marked **(V1)**.
- *Family: Console and surfaces.* The simple view (V4, M5.5). This is v2.
- *Family: Agent orchestration.* M9.2 Bridget's map, beyond its item marked **(V1)**.
- *Family: Calculators and methods.* M6 the fuel-mix floor.
- *Family: Calculators and methods.* M7 diesel and grid factors.
- *Family: Calculators and methods.* M8.2 the free site's water file.
- *Family: Security and hygiene.* The two extra typing checks back on for `calvin`, and the restricted words in the seed's comments.
- *Family: Security and hygiene.* SP6, the human engineer review. It runs alongside and blocks nothing.

## Family 1: the v1 scope (Agent orchestration)

*Family: Agent orchestration.*

Ruled by the maintainer on 2026-11-22. All three repos use these words for these jobs. Everything else in family 1
stays after v1 and is not part of this sprint. The agent map's design is approved (2026-11-22).

**Guiding line:** Wellington manages the team to gather what the project needs and keep it moving. The other agents do
their tasks, collect what they need, and report back to him. He helps with the next steps.

- [ ] **J1.** Release Calvin and Violet 0.5.1 as one joined release. After it, each agent gets its own release, so one
      agent can be updated without the other. Both sites install the same release in the same batch.
  - Released 2026-11-22: tag `calvin-violet-v0.5.1` on commit `b29c124`, with Calvin 0.5.1, Violet 0.5.1 and core
    0.1.2. Its notes list everything since 0.5.0.
  - Still to come: both sites install it in the same batch, and take the steps in Calvin's and Violet's READMEs,
    "Changes in 0.5.0" and "Changes in 0.5.1". It takes the place of installing 0.5.0 (was C5.5).
  - After 0.5.1: one tag and one GitHub release for each package, all going out in one batch at the family close.
- [ ] **J2.** Doors. Each host tells each agent which door it is at: Free site, Paid site, Agent Commons or MCP (agent
      rule 21). An agent working alone asks for what it needs itself. This covers how Calvin opens in the Agent
      Commons.
  - In this repo: one list of places in `core`. It holds the four doors, and the lobby chat, which is not a door.
    Calvin and Violet take their door from the host. Violet's own `doors.ts` gives way to core's. Today it hands
    back to no one in the Agent Commons and always shows water.
  - Calvin in the Agent Commons (was V17): he opens with two choices. "New project estimate" sets `creditedUnderV1`
    to `false`. "Compare old and new rules" sets it to `true`, and still asks for the filed V1.0 fNRB before any
    comparison. The choices' wording, what each sets and his opening line live in the open core. The Commons host
    only draws the buttons. On the sites, the record sets `creditedUnderV1`, and no choice is shown.
    - [!] Waits on the maintainer's ruling on the wording.
  - Calvin's agent tools are exported from his package, as Violet's are, or retired with his Commons choices.
  - Merged, not released yet (#46, #49): the places in `core`; Calvin and Violet take their place from the host;
    Violet's doors give way to the map, and her old names still work; Calvin's tools, record helpers and two Commons
    choices are exported from `@waterbots/calvin/agent`. Each choice sets `creditedUnderV1`, and the comparison still
    needs the filed V1.0 fNRB. Still to come: the choices' wording and his opening line.
- [ ] **J3.** The shared project record. Every agent adds its facts and results to one record, and the paid site reads
      it (agent rule 10). It holds each pathway's reading (likely, more to learn, unlikely) with its reason and what
      would change it. It refuses a count below zero where it is entered. One shared list turns each site's
      technology label into the record's code.
  - In this repo: the record's shape, its fact check and the label list go in `core`. The proposal is
    `docs/proposals/shared-project-record.md`. Then Calvin and Violet add their facts and results to it. Today Calvin
    saves only his inputs, and Violet saves nothing.
  - Was W1: a count of people served below zero got no message. Done when the record refuses it where it is entered,
    and Calvin and Violet each say the record's count is below zero.
  - Was W3: the label "Community level water treatment technologies" was read as `other`, so Calvin would not run.
    Done when one list in `core` turns the sites' labels into the record's codes, and a test covers this label.
  - Was V9 and V12, and stays v1, because the v1 finish line counts the questions on each walk: each agent writes how
    many questions it asked on that walk. A fact read from the record is not a question. Done when a test takes a
    made-up project through every agent's part, saves it, reads it back unchanged, and gives each agent's question
    count.
  - Waits on: the free site's full list of technology labels, and Wellington's fields; the paid site's save format.
    Each comes as a carry.
  - Merged, not released yet (#46, #49): the record's shape, its fact check and the label list in `core` (W3 done).
    Calvin and Violet read the record first, ask only for what it lacks, and add their facts, results and question
    counts. A test takes a made-up project through Calvin's part and Violet's part, saves it, and reads it back
    unchanged. Still to come: the parts of Wellington, Phoebe and Bridget (J5), and the screens' words for a count
    below zero (W1; site wording, waits on the maintainer).
- [ ] **J4.** The agent map. ONE map, kept in the core, reads the project's facts and the door, and says which agents
      are in play, which method applies, and what comes next. It is worked out from facts, so the same project always
      gets the same agents. Wellington leads from it on both sites. It replaces one-off rules. It must cover at least:
      - on "likely" or "more to learn", a pathway's calculator agent is called and shows;
      - on "unlikely", it is not called, and the visitor is told what would change it;
      - with no pathway forward, Bridget is not called and Wellington points to the WaterBots team;
      - a transitioning project also sees the legacy calculator (today it does not);
      - one entry for each carbon method.
  - In this repo: the map is one function and one table in `core`, with a test for each rule on made-up projects. It
    also knows the lobby chat: there, only Wellington is called, there is no record, nothing is calculated, and his
    one next step is to point the visitor to a door.
  - Was V6 and M3, the method registry: the map's table holds one entry for each carbon method (V1.0, V2.0 and the
    transition).
  - Was W2: a pathway read as unlikely still got a water figure. Done when the host does not call the calculator agent
    of an unlikely pathway.
  - Merged, not released yet (#46): the map and its table in `core`, with a test for each rule. Violet follows it
    (#49), so an unlikely water pathway no longer gets her calculator (W2).
  - [!] Four rules that say which project facts point to which pathway have no source yet. They are listed in the
    record proposal. Until the maintainer rules them, the map uses only the eligibility readings and the two rules this
    repo can cite.
- [ ] **J5.** Finalize all five current agents in v1: Wellington, Phoebe, Bridget, Calvin and Violet, each as an
      installable package in the core. Bridget's map data needs a rights check before it goes into a public repo.
      Violet becomes her own crew member on both sites, through the shared spec.
  - In this repo: Phoebe (was V10 and M9.1) and Bridget (was V11 and M9.2) reach their first release, and Wellington
    gets a package. Each agent's files come as a carry from the site that holds them.
  - Waits on: the carries; Phoebe's and Bridget's rulings; the rights check on every one of Bridget's data files; a
    ruling on the shared map key.
  - One calculator screen (ruled by the maintainer on 2026-11-23).
    - One calculator screen for every calculator agent. What is done for Violet is done for Calvin, and the other
      way round.
    - Violet's screen gets header rows and hero numbers like Calvin's, where it makes sense: the same height, the
      same format, collapsible formulas, and sliders where they make sense.
    - A place to write notes on a value. Both calculators get it, and the notes make it into the export.
    - Subtle colour grades on each calculator to match its agent: Calvin's colour for Calvin, Orchid for Violet. It
      helps keep the tools apart.
    - The same rule holds on the Free site and the Paid site, where the screens are slightly different. Violet's
      paid screen matches Calvin's paid screen, and her free screen matches his free screen.
    - Merged, not released yet (#52): all of the above, for Calvin and Violet. Violet has a report like Calvin's. Notes
      go in the export on both sites: the person's own on the Paid site, the agent's on the Free site. Calvin's colour
      is Tide until Reef ships. Still to come: each site passes the place, the Paid site saves the notes, and later
      calculator agents follow the same screen.
    - [!] Waits on the maintainer: whether the Agent Commons' and MCP's exports carry the agents' notes, and whether
      the Paid site's export carries them too.
- [ ] **J6.** Saving a screening into the paid site: the count of people served crosses over correctly, and the paid
      record never shows "people" as a unit nobody chose.
  - In this repo: the record keeps people served the way it was entered, as people or as households. It never fills in
    a unit on its own. The paid site's save does the rest.
- [ ] **J7.** The maintainer signs off the first water-benefit activity type (safe drinking water supply). No building.
- [ ] **J8.** Reword the 30 lines the seed checks catch on the paid site, before the next agent moves into the core.
  - The paid site's work. Files carried here for J5 pass this repo's checks.
- [ ] **J9.** Close the gaps against the agent rules: agents never talk about their own limits (rule 6); a build rule for
      a needed fact left blank (rule 11); no repeat introductions (rule 17); the link to the WaterBots team and the
      consulting page (rule 13; the address waits on the maintainer).
  - In this repo:
    - Calvin's and Violet's words are checked for any talk of their own limits.
    - The record lists each needed fact that is still blank, and which agent needs it.
    - The map says when an agent still needs an introduction.
    - The consulting page's address is kept in one shared file in `core`.
  - Merged, not released yet (#46, #49): Calvin's and Violet's words checked; Violet's prompt no longer frames her
    method's standing as her own limits. Both prompts say what each needed fact is for and where it usually comes
    from, and the record lists each needed fact still blank. The map says when an agent still needs an introduction.
    Still to come: the consulting page's address.
  - [!] Two values stand in for a blank in Calvin. See "A value stands in for a missing one" below.

---

## M1 — Skeleton and guards

*Family: Security and hygiene.*

- **M1.4 The maintainer's hand-steps** *Family: Security and hygiene.* — blocked until the maintainer; Session C cannot do these. **Due before the first release (M2.2).**
  - [!] *Family: Security and hygiene.* The npm scope: create the npm organisation or confirm the maintainer owns it (N13)
  - [!] *Family: Security and hygiene.* The `NPM_TOKEN` Actions secret
  - [!] *Family: Security and hygiene.* The maintainer as required reviewer on the `npm-publish` environment, so every release needs their approval
  - [!] **(V1)** *Family: Security and hygiene.* The release tag rule: only the maintainer, the engineer and Session C (after "release it") may create release tags (`v*`, and each module's own,
        such as `calvin-v*`). Set it once the GitHub organisation exists.
  - [!] **(V1)** *Family: Security and hygiene.* Move this repo to the WaterBots GitHub organisation. Then Session C points the
        repository link in each `package.json` at the new home.

## M2 — After the seed

*Family: Security and hygiene.*

- [ ] **M2.2** *Family: Security and hygiene.* Publish `0.1.0` with no changes to what arrived. *Blocked until* the maintainer's hand-steps in M1.4 are done.
  - [!] *Family: Security and hygiene.* Publish. The maintainer's call, after M1.4.
  - [ ] *Family: Security and hygiene.* Every release build runs the name scan on the packed files themselves, not only on the repo. Each packed file is unpacked into an empty folder and scanned there. A finding stops the release. Not v1: until then, Session C scans the packed files by hand at each release, as `CLAUDE.md` says.
  - [ ] **(V2)** *Family: Security and hygiene.* Rebuild the release on a second machine and show it gives the same bytes: the same fingerprints.
- [ ] **M2.3 Linting** *Family: Security and hygiene.* (was M1.6): add a linter that runs as part of CI, with the strictest settings that fit. It comes
      right after the seed lands (after M2.2), not before it.
- [ ] **M2.6 (V2)** *Family: v1 proof and grading.* Put the 21 recalculated test cases back through Gold Standard's official V1.0 calculator, so their
      expected results are the calculator's own again. Done when each one's tag says so and the report's count rises
      with it.

## M4 — Openings and labels

*Family: Calculators and methods.*

*Stop for the maintainer:* the numbers, before and after. *Waits on:* the rulings in the brief.

- [ ] **M4.1** *Family: Calculators and methods.* Household opening (usage, labelled "starting point")
- [ ] **M4.2** *Family: Calculators and methods.* Community opening and the operating-days cap, with its label
- [ ] **M4.3** *Family: Calculators and methods.* The baseline-share label ("assumed; your baseline survey replaces it")
- [ ] **M4.4** *Family: Calculators and methods.* The "days present" label for household systems

## M5 — The friendly view

*Family: Console and surfaces.*

*Stop for the maintainer:* pixels twice — the mockup, then the built page. *Waits on:* the captured image of today's paid page;
the litres check on the cap (N5). A step with no image yet has not started.

- [ ] **M5.1** *Family: Console and surfaces.* Mockup from the captured image
- [ ] **M5.2** *Family: Console and surfaces.* Built page; the litres slider's **default** and **cap** kept as two separate things
- [ ] **M5.3 (V1)** *Family: Console and surfaces.* Calvin's question rows are big enough to tap on a phone. Done when a test checks their tap size
      and the maintainer checks them on a phone.
- [ ] **M5.4 (V1)** *Family: Console and surfaces.* Calvin's color is Reef (`#0E8A94`) on his screens. Done when his screens use
      one Reef color token and the maintainer checks the screen.
- [ ] **M5.5 (V2)** *Family: Console and surfaces.* The simple view (V4): it hides the advanced material until asked.
      Done when a test shows advanced parts are hidden at first and one control shows them, and the maintainer checks
      the screens on a phone. M5.3 and M5.4 no longer wait for it.

## M6 — The fuel-mix floor

*Family: Calculators and methods.*

*Stop for the maintainer:* before and after for a country with no survey. *Waits on:* a rights read of the WHO clean-fuel
indicator.

- [ ] **M6.1** *Family: Calculators and methods.* Fuel-mix floor, labelled

## M7 — Diesel and grid factors

*Family: Calculators and methods.*

*Stop for the maintainer:* a worked pumped system. *Waits on:* the source document held, and a ruled grid-factor source.

- [ ] **M7.1** *Family: Calculators and methods.* Diesel and grid factors

## M8 — The water-supply method (VWBA D-3)

*Family: Calculators and methods.*

*Stop for the maintainer:* the hand-worked cases and the VWBA spec; then an outside expert's check (see V8). *Waits on:* nothing more. D-3 is a prototype; it does not wait for the activity-type signature or N6.
The first release does not wait for this.

- [ ] **M8.2** *Family: Calculators and methods.* The free site's water file brought in
- [ ] **M8.3** *Family: Calculators and methods.* D-3 for irrigation supply (VWBA 2.0, Appendix D, Table D3.2, p.45). A later pull request.
- [ ] **M8.4** *Family: Calculators and methods.* Rainwater harvesting for direct use. The guidebook works it out with the Recharge method, D-4 (p.45). A later pull request.
- [ ] **M8.5** *Family: v1 proof and grading.* Violet's hand-worked cases ship inside her package, as Calvin's
      test cases do (`dist/expected-outputs.json`), so a site can run them. Today they sit in her tests
      (`d3/compute.test.ts`), which don't ship. For a later release. The open site's Road to v1 step 5 waits on this.
      Done when Violet's packed files hold her hand-worked cases, each with its citations, and a check runs them from
      the packed files.

## M9 — Phoebe and Bridget

*Family: Agent orchestration.*

Phoebe's and Bridget's first releases are J5. What is left here comes after v1.

- **M9.2** *Family: Agent orchestration.* Bridget (the map), beyond her first release
  - [ ] **(V1)** *Family: Console and surfaces.* The map's + and - buttons are big enough to tap on a phone. Done when a test checks their tap size
        and the maintainer checks them on a phone.

## M10 — Agent and module source sweep (V2)

*Family: Calculators and methods.*

The permission replies may never arrive. A V2 sweep checks every agent's and module's sources, including these presets
and the IPCC 2006 citations.

- [ ] **M10.1 (V2) Stove and fuel preset sources** *Family: Calculators and methods.* (was M6.2). The country-default notes in
      `packages/calvin/src/calculators/gs4gg-carbon/presets.ts` keep their values unchanged until the pending permission
      replies arrive: request #234 on the paid site. Today the baseline-mix data file holds no country rows, so none of
      the country-default notes reaches a screen. Open, all together:
  - Fuel shares and their label: the WHO household energy series. Its licence for use here is unconfirmed.
  - Stove shares and their label: The DHS Program's survey tables. Permission is pending.
  - Our own mappings, with no published source: biomass counted as wood; gaseous fuels counted as LPG; electricity
    at zero baseline emissions; the survey's stove types mapped to the rulebook's three classes; traditional stoves
    not split by chimney counted as other conventional; gas, electric and liquid-fuel stoves moved off the stove row.
- [ ] **M10.2 (V2) IPCC 2006 citations.** *Family: Calculators and methods.* The kerosene, coal and LPG notes cite the IPCC 2006 Guidelines, Vol. 2, Ch. 2,
      Table 2.5 (residential). Still to do: add the page; check that LPG's 63.1 tCO₂/TJ matches the
      table as corrected by the IPCC's corrigenda; then code kerosene's and coal's values, which count at zero today.
- [ ] **M10.3 (V2) Every other agent and module.** *Family: Calculators and methods.* The same check for each agent's and module's sources: each value
      shown says where it came from, as Calvin's and Violet's rules set out.
- [ ] **M10.4 (V2) The usage slider's source.** *Family: Calculators and methods.* The share of homes that really use the device starts at 100%,
      labelled "assumed". A cited source for it is found in the sweep.
      `startsWithoutSource` in `screen/exAnte.ts` lists every start with no source.

## Safety passes

*Family: Security and hygiene.*

The maintainer's safety passes cover all three repos. This repo's own parts are listed here.

- [ ] *Family: Security and hygiene.* **SP6 — Human engineer review of the structure**, covering all three repos. A human engineer reads how the
      repos are laid out and how they fit together, and reports. Do it now. It does **not** block any M step.
- [ ] *Family: Security and hygiene.* Routine hygiene, about once a month: check that nothing in this repo repeats or disagrees with a master page (rulings, agent rules, family page, status sheet). Fix what does.

## Code standards

*Family: Security and hygiene.*

- **Two of the extra checks are off for `calvin`.** *Family: Security and hygiene.* The seed was typechecked with `strict` only. Unchecked indexed
  access and exact optional properties flag its code in 95 places, so `packages/calvin/tsconfig.json` leaves them
  off. `core` keeps them. A known gap (see `SEEDS.md`): Session C fixes the code here, in this repo, by a normal pull
  request, with no new seal or seed. Then the two checks go back on for `calvin`.
- [ ] *Family: Security and hygiene.* **For the engineer: confirm and delete unused code.** Nothing uses these, and
      nothing planned needs them (ruling 2026-11-22):
  - `sdwsNum` in `packages/calvin/src/modules/calvin/screen/citations.ts`.
  - `endLabel` in `packages/calvin/src/modules/calvin/screen/exAnte.ts`, and its test.
  - `peopleFromHouseholds` in `packages/calvin/src/calculators/gs4gg-carbon/quantity.ts`. It is on the engine entry.
  - `moduleName` in `core`, `calvin` and `violet` (`src/index.ts`), with the "empty stub" tests in
    `src/index.test.ts`. Without it, the package's `"."` entry is empty.

---

## Found in the Security and hygiene sprint (closed 2026-11-22)

Each finding from the family 8 sprint that was written down and not chased. Each carries its family. `[!]` waits on
the maintainer.

- [ ] *Family: Security and hygiene.* **Every CI check job fetches full history.** Only the test job's seed check needs
      it. Done when the typecheck and build jobs fetch one commit and the check names stay the same.
- [ ] *Family: Security and hygiene.* **Old pointers in code comments.** About 150 lines in code, settings and CI still
      credit a ruling by its date, and the rulings pages replaced those rulings. Short labels such as "seam S4",
      "decision #4" and "[#257]" name nothing in this repo. The seed's copies of the data tests and the data files'
      descriptions still point at the old calculator spec. A comment in Calvin's `version.ts` says the fallback dial
      stays for household size (see N16). Wording only.
- [ ] *Family: Security and hygiene.* **`publish.yml` says only the maintainer may create `v*` tags.** M1.4's tag rule
      names the maintainer, the engineer and Session C.
- [ ] *Family: Security and hygiene.* **`referenceCaseCount`**, a name in Calvin's screen code (`CalculatorWork.tsx`),
      still says "reference case" for the made-up test cases. Left as it is: a name in code.
- [!] *Family: Security and hygiene.* **No copied-text check.** `RULINGS.md` section 1 says every release is checked for
      copied text. This repo's release check has none. A new check needs the maintainer's yes.
- [!] *Family: Security and hygiene.* **Merged branches stay on GitHub** (23 besides `main`). GitHub's setting to
      delete a branch when its pull request merges would stop new ones.
- [!] *Family: Security and hygiene.* **Three rules wait in `CLAUDE.md`** ("Waiting for the maintainer"): the Grant
      line, the engine does every sum, and the three kinds of value. The maintainer places or drops each.
- [!] *Family: Calculators and methods.* **A value stands in for a missing one.** Calvin counts embodied emissions as 0
      when they are not entered, with a warning. `RULINGS.md` section 2 says a missing fact never counts as zero.
      Devices per household is 1 when not given, as Calvin's own rulings say. Changing either changes a sum. Goes with
      J9 (rule 11).

---

## Open questions

- **N4:** *Family: Calculators and methods.* how the transition splits (not ruled). The recommendation: build the maths, not the checklist.
- **N5:** *Family: Calculators and methods.* whether a higher litres cap applies with true meters — affects the cap only.
- **N6:** *Family: Calculators and methods.* whether further gates stand on D-3.
- **N13:** *Family: Security and hygiene.* the npm scope.
- **N14 (V1):** *Family: Experts and partners.* whether one project may split its water between two claims: a carbon claim (up to its per-person
  cap) and a VWBA claim (only the water above that cap). A group of outside professionals, brought together by the
  maintainer, will rule. The sources each side cites are listed in `docs/vwba-d3-spec.md`.
- **N15 (V1):** *Family: Experts and partners.* a cited starting value for the hours a motor-pumped or treatment-plant system runs in a year.
  VWBA 2.0 gives none. Until the outside expert group finds one, Violet's hours slider starts at 12 hours a day
  (4,380 hours a year), labelled "assumed: no source yet".
- **N16:** *Family: Experts and partners.* When a country is missing from the data tables, should the calculator offer
  a cautious stand-in value with a low, middle and high choice, or say it has no value? The retired fallback dial's
  code waits on this answer (ruling 2026-11-22). Its pieces, in `packages/calvin/src`:
  - `modules/calvin/screen/FallbackDial.tsx`, the whole file.
  - The dead functions in `calculators/gs4gg-carbon/fallback.ts`: `EXPLANATION`, `PCT`, `creditEffectOf`,
    `stopValue`, `defaultStop` and `fallbackStops`.
  - `fallbackCount` in `modules/calvin/screen/useCalculatorState.ts`, and the lines that show it in
    `CalculatorWork.tsx` and `ReportView.tsx`.
  - `householdSizeFallbackStop` in `modules/calvin/screen/analysis.ts`.
  - `FiredFallback` and the `fallbacks` field in `calculators/gs4gg-carbon/scenario.ts`.

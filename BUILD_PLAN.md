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

**Every engine change is published first as a release candidate** (a trial version). The private side installs it,
runs its real-filing tests, and reports back through the maintainer: pass or fail and the reference line. Only
then is it released.

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
| V4 | Console and surfaces | The simple view, shipped as the next release after V5: it hides the advanced material until asked, with bigger tap buttons (M5.3) and Reef (M5.4). See M5.5. | V5. | A test shows advanced parts are hidden at first and one control shows them. The maintainer checks the screen. |
| V5 | v1 proof and grading | [~] (Released 2026-11-05: tag `calvin-v0.1.0` on commit `3020ee7`, recorded in `SEEDS.md`. Still to come: both sites pin it, and the private side reports pass or fail.) The first GitHub release: the packed packages (`calvin` and the `core` it needs) and their fingerprints, with both views: the ex-ante view with sliders, and the full ex-post view. A site mounts them through `@waterbots/calvin/screen`; the open site locks to ex-ante. Replaces the npm publish in M2.2. It does not wait for the simple view. | The maintainer's approval; branch protection and the tag rule (M1.4). | The release holds the files and their fingerprints. Both sites pin it. The private side reports pass or fail on both carbon filings. |
| V6 | Agent orchestration | The method registry (M3): one entry per carbon method, so both sites pick a method the same way. | V5. | A trial release is out; the private side reports pass on both carbon filings. |
| V8 | Experts and partners | [x] (Merged, pull request #18. Still to come: the outside expert's check, and N14 and N15 for the outside expert group.) D-3, the water-supply module, inside Violet (M8.1). | It does not wait for the activity-type signature or N6: D-3 is a prototype the outside expert checks later. | Violet's D-3 tests are hand-worked cases, with every step cited to the guidebook (cited, not copied). The VWBA spec is written alongside the build, in `docs/`, and the maintainer reviews it then. An outside expert checks the module once the prototype is up. |
| V9 | Agent orchestration | (Proposal: `docs/proposals/shared-project-record.md`, pull requests #34 and #35, and its follow-up.) The screening hand-off: one project record in `core` that every module fills in and the paid site reads. Each module writes how many questions it asked on that walk. | V5; the paid site's save format (paid repo); Wellington's fields (free-site repo). | A test takes an invented project through all four modules' parts, saves it, reads it back unchanged, and gives each module's question count. |
| V10 | Agent orchestration | Phoebe (eligibility) to its first release (M9.1). | V9; Phoebe's rulings. | Released; Phoebe fills its part of the record and counts its questions. |
| V11 | Agent orchestration | Bridget (the map) to its first release (M9.2). | V9; Bridget's rulings; a rights read on every data file; a ruling on the shared map key. | Released; Bridget fills its part of the record and counts its questions. |
| V12 | Agent orchestration | Calvin's screening part: Calvin fills its part of the record and counts its questions. | V9. | A test shows Calvin's part saved and its count written. |
| V14 | v1 proof and grading | The same-numbers check: a project saved by the screening, read back the way the paid site reads it, gives the same numbers, or a list of what changed and why. | V6, V10, V11, V12. | A test passes here on invented projects. The private side runs it on both real filings with the pinned release and reports pass. |
| V15 | v1 proof and grading | The v1 release: a GitHub release that both sites pin. | V8, V14; the maintainer's approval. | Both sites run the same pinned file. The maintainer confirms the whole journey on the live sites, and the average question count is reported. |
| V17 | Agent orchestration | Calvin's two doors. **Design only: build nothing yet.** One calculator, two doors. On the sites, the screening sets `creditedUnderV1`, and no door is shown. In the Agent Commons, Calvin opens with two choices: "new project estimate" (sets `false`) or "compare old and new rules" (sets `true`, and still asks for the filed V1.0 fNRB before any comparison). The choices' wording, what each sets and Calvin's opening line belong in the open core, as Violet's door does. The Commons host only draws the buttons. | The maintainer's ruling on the wording. | `packages/calvin/src/doors.ts` and Calvin's prompt hold both choices, and a test shows each choice sets the right value. |
| V20 | Agent orchestration | [x] (Released: tag `calvin-violet-v0.5.0` on commit `1bce514`. Still to come: both sites install it. See the step "Calvin and Violet 0.5.0".) Calvin and Violet 0.5.0, one release for both sites. Calvin: the main credit tiles (tCO₂e a year) are a pinned header, whether or not a site sets `unpinFigureBlock`; the smaller figures sit right under them; the sliders and the calculation collapse. The controls panel holds only the site's own top and Calvin's buttons, the work surface ends with the calculation, and the report's note on how the figures were produced is one sentence shorter. A phone pass: rows wrap instead of squeezing. Violet: people served come from the project record, as Calvin takes them, and "Draft — pending expert review" shows on the screen and on every result. No sum changes. | V8. | Session C packs all three packages, runs the release check and makes the tag. One release holds all three files. After "release it", Session C pushes the tag and publishes the release. Both sites install it. |
| V21 | Console and surfaces | [x] (Merged, pull request #38. The release waits until the Agent orchestration family opens.) Calvin and Violet 0.5.1, four changes. Violet's "derived" tag becomes "calculated". A missing value is a blank box with no label, on both screens, in the tables and the tag cells; a blank never counts as zero. Violet's "not enough known" becomes "more to learn". Violet ships a small stylesheet in Calvin's look, with Orchid as her accent. No sum changes. See the step "Calvin and Violet 0.5.1". | V20; the Agent orchestration family opening. | Session C packs it, runs the release check and makes the tag. After "release it", the tag is pushed and the release published. Both sites install it. |

**Where things stand (2026-11-22):** The latest release is `calvin-violet-v0.5.0` (V20): Calvin 0.5.0, Violet 0.5.0 and core 0.1.1. Both sites still install it. V21 (Calvin and Violet 0.5.1) is merged; its release waits until the Agent orchestration family opens and the maintainer says "release it". V17 waits on the maintainer's ruling on its wording. Finished steps are in the build log.

**Sources still to find:** in the source sweep, M10.4.

**After v1** (not needed for the finish line):

- *Family: Security and hygiene.* npm publishing (M2.2's publish, and the npm scope and token in M1.4). This is v2.
- *Family: v1 proof and grading.* Benchmarks and pass rates. This is v2.
- *Family: Security and hygiene.* M2.3 linting.
- *Family: Calculators and methods.* M4 openings and labels.
- *Family: Console and surfaces.* M5 the friendly view, beyond the sliders (released) and the simple view in V4 and its items marked **(V1)**.
- *Family: Agent orchestration.* M9.2 Bridget's map, beyond its item marked **(V1)**.
- *Family: Calculators and methods.* M6 the fuel-mix floor.
- *Family: Calculators and methods.* M7 diesel and grid factors.
- *Family: Calculators and methods.* M8.2 the free site's water file.
- *Family: Security and hygiene.* The two extra typing checks back on for `calvin`, and the restricted words in the seed's comments.
- *Family: Security and hygiene.* SP6, the human engineer review. It runs alongside and blocks nothing.

---

## M1 — Skeleton and guards

*Family: Security and hygiene.*

- **M1.4 The maintainer's hand-steps** *Family: Security and hygiene.* — blocked until the maintainer; Session C cannot do these. **Due before the first release (M2.2).**
  - [!] *Family: Security and hygiene.* Branch protection on `main`: a pull request before merging, every check required, no force pushes or
        deletions, applied to admins too. Can be done now; steps are in pull request #1.
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
  - [ ] **(V1)** *Family: Security and hygiene.* Every release build runs the name scan on the packed files themselves, not only on the repo. Each packed file is unpacked into an empty folder and scanned there. A finding stops the release.
  - [ ] **(V2)** *Family: Security and hygiene.* Rebuild the release on a second machine and show it gives the same bytes: the same fingerprints.
- [ ] **M2.3 Linting** *Family: Security and hygiene.* (was M1.6): add a linter that runs as part of CI, with the strictest settings that fit. It comes
      right after the seed lands (after M2.2), not before it.
- [ ] **M2.6 (V2)** *Family: v1 proof and grading.* Put the 21 recalculated test cases back through Gold Standard's official V1.0 calculator, so their
      expected results are the calculator's own again. Done when each one's tag says so and the report's count rises
      with it.

## M3 — The method registry (no look change)

*Family: Agent orchestration.*

*Waits on:* M2.

- [ ] **M3.1** *Family: Agent orchestration.* Registry with one entry per method (carbon V1.0, carbon V2.0, the transition), each wrapping the
      engine's pure functions and the seed's `Calculator` interface
- [ ] **M3.2** *Family: Agent orchestration.* Release candidate; private side reports pass or fail

## M4 — Openings and labels, one release candidate each

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
- [ ] **M5.5 (V1)** *Family: Console and surfaces.* The simple view ships as Calvin's next release, after the first. It is one
      release: the simple view (V4), the bigger tap buttons (M5.3) and Reef (M5.4). Done when that release holds the
      packed files and their fingerprints, and the maintainer checks the screens on a phone.

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

*Waits on:* their own rulings. Bridget also needs a rights read on every data file and a ruling on the shared map key.

- [ ] **M9.1** *Family: Agent orchestration.* Phoebe (eligibility) to its first release
- [ ] **M9.2** *Family: Agent orchestration.* Bridget (the map) to its first release
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

## Calvin and Violet 0.5.0

*Family: Agent orchestration.*

One release for both sites: Calvin 0.5.0, Violet 0.5.0 (her first release) and core 0.1.1, in one GitHub release
holding all three packed files. It is V20 on the road to v1. No sum changes.

Released 2026-11-21. What is left:

- [ ] **C5.5** *Family: Agent orchestration.* Both sites install it, and take the steps in Calvin's README, "Changes in 0.5.0".

## Calvin and Violet 0.5.1

*Family: Console and surfaces.*

A small release for both sites, with exactly four changes, listed in V21 and merged (pull request #38). No sum
changes.

*Stop for the maintainer:* "release it". *Waits on:* the Agent orchestration family opening.

- [ ] **C51.5** *Family: Agent orchestration.* When the Agent orchestration family opens, Session C packs it, runs the release check and makes the tag. After
      "release it", the tag is pushed and the release published. Both sites install it.

## Site walk of 2026-11-21: for the next release

*Family: Agent orchestration.*

Three findings from a walk of the open site on 2026-11-21. Each goes in the next release.

- [ ] **W1** *Family: Agent orchestration.* A minus number of people served got no message. The open site still runs its own water
      calculator, and it ignored the count. Violet's engine refuses a count below zero, with a message. Her screen,
      like Calvin's, reads a count of zero or below on the record as an empty field, so it says the record is missing
      people served, which is not quite true. Done when the shared project record refuses a count below zero where it
      is entered, and Calvin and Violet each say the record's count is below zero.
- [ ] **W2** *Family: Agent orchestration.* A pathway the eligibility agent had read as unlikely still got a water figure. Nothing told
      the calculator: the shared project record has no place for each pathway's reading. Done when the record gives each
      pathway's reading (likely, more to learn or unlikely), with its reason and what would change it, and inside a
      site's screening the host agent does not call the calculator agent of an unlikely pathway.
- [ ] **W3** *Family: Agent orchestration.* The site's record said "Community level water treatment technologies", and Calvin read the
      technology as "other" and would not run. The record hands Calvin one of three codes: community water supply
      (`CWS`), household water treatment (`HWT`) or `other`. The site turns its own label into a code, and this
      label became `other`. Done when one shared mapping in `core` turns the sites' technology labels into the
      record's codes, so both sites read a project the same way, and a test covers this label.

---

## Safety passes

*Family: Security and hygiene.*

The maintainer's safety passes cover all three repos. This repo's own parts are listed here.

- [ ] *Family: Security and hygiene.* **SP6 — Human engineer review of the structure**, covering all three repos. A human engineer reads how the
      repos are laid out and how they fit together, and reports. Do it now. It does **not** block any M step.

## Code standards

*Family: Security and hygiene.*

- **Two of the extra checks are off for `calvin`.** *Family: Security and hygiene.* The seed was typechecked with `strict` only. Unchecked indexed
  access and exact optional properties flag its code in 95 places, so `packages/calvin/tsconfig.json` leaves them
  off. `core` keeps them. A known gap (see `SEEDS.md`): Session C fixes the code here, in this repo, by a normal pull
  request, with no new seal or seed. Then the two checks go back on for `calvin`.
- **Linting is not set up yet.** *Family: Security and hygiene.* Only strict typing is on today. Adding a linter is its own pull request (lane 3):
  plan item M2.3, right after the seed lands.
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
- [!] *Family: Security and hygiene.* **Session C's local deny rules** still block pushing one release tag by name and
      `gh release create`, though `CLAUDE.md`'s release steps have Session C do both after "release it".
- [!] *Family: Security and hygiene.* **Merged branches stay on GitHub** (23 besides `main`). GitHub's setting to
      delete a branch when its pull request merges would stop new ones.
- [!] *Family: Security and hygiene.* **Three rules wait in `CLAUDE.md`** ("Waiting for the maintainer"): the Grant
      line, the engine does every sum, and the three kinds of value. The maintainer places or drops each.
- [!] *Family: Security and hygiene.* **The status sheet is not in this repo.** Rule 16 and close step 8 name
      `BUILD_STATUS_SHEET.md`. The maintainer says where it lives.
- [!] *Family: Console and surfaces.* **"Consultant" in Calvin's screen text and notes:** one line on screen in
      `EquationStack.tsx`, a comment in `screen/state.ts`, a struck note in the fNRB data and a struck comment in
      Calvin's settings. Rule 13 says "the WaterBots team". Site wording, so the maintainer rules.
- [ ] *Family: Agent orchestration.* **Violet's `doors.ts`** hands back to no one in the Agent Commons, always shows
      water, and cites an old ruling. `docs/vwba-d3-spec.md` says the same. `RULINGS.md` section 4 says the agents
      called are worked out from the facts. Goes with V17 and W2.
- [ ] *Family: Agent orchestration.* **No host tells an agent its door** (Free site, Paid site, Agent Commons or MCP;
      rule 21). Calvin and Violet are not told today.
- [!] *Family: Agent orchestration.* **The Agent Commons has no project record.** Rule 10 has an agent check the record
      first. No rule says what an agent does where there is none.
- [ ] *Family: Agent orchestration.* **Neither agent adds its results to the record** (rule 10). Calvin saves only his
      inputs, and Violet saves nothing. Waits on V9.
- [ ] *Family: Agent orchestration.* **A link to the WaterBots consulting page** (rule 13). Each door's host needs the
      address, kept in one shared file. The address is not in this repo.
- [ ] *Family: Agent orchestration.* **Calvin's agent tools are not exported** from his package, though his
      `config.yaml` names them. Violet's are exported. Export them or retire them with V17.
- [!] *Family: Calculators and methods.* **A value stands in for a missing one.** Calvin counts embodied emissions as 0
      when they are not entered, with a warning. `RULINGS.md` section 2 says a missing fact never counts as zero.
      Devices per household is 1 when not given, as Calvin's own rulings say. Changing either changes a sum.

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

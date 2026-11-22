# Build plan — the open core modules, steps M1 to M9

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

All of M1 to M9 is `Grant: open`. Edits to this plan and the build log are `Grant: neither`.

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
| V1 | — | [x] The maintainer reviews and merges the engine-only entry (pull request #6). Merged. | The maintainer. | It is on `main`. |
| V2 | — | [x] Make the engine's types complete for projects that use Node's own module rules. (Merged, pull request #8.) | V1. | A fresh project using Node's module rules typechecks against the built package, with no type falling back to "any". |
| V3 | — | [x] (Merged, pull request #9.) Sliders for anticipated performance (ex-ante: before the project runs). Each slider is held between a cited floor and a cited ceiling. Each has a pencil to type an exact value, and shows the credited number. The engine works out that number; the screen computes nothing. The default and the cap stay two separate things. | V1; the maintainer's description of the sliders (from site pull request #156); a cited source for every floor and ceiling. | Tests show each slider stays inside its cited bounds, the pencil value is held to the same bounds, and the number shown is the engine's. The maintainer checks the screen. |
| V4 | Console and surfaces | The simple view, shipped as the next release after V5: it hides the advanced material until asked, with bigger tap buttons (M5.3) and Reef (M5.4). See M5.5. | V5. | A test shows advanced parts are hidden at first and one control shows them. The maintainer checks the screen. |
| V5 | v1 proof and grading | [~] (Released 2026-11-05: tag `calvin-v0.1.0` on commit `3020ee7`, recorded in `SEEDS.md`. Still to come: both sites pin it, and the private side reports pass or fail.) The first GitHub release: the packed packages (`calvin` and the `core` it needs) and their fingerprints, with both views: the ex-ante view with sliders, and the full ex-post view. A site mounts them through `@waterbots/calvin/screen`; the open site locks to ex-ante. Replaces the npm publish in M2.2. It does not wait for the simple view. | V2, V3; the maintainer's approval; branch protection and the tag rule (M1.4). | The release holds the files and their fingerprints. Both sites pin it. The private side reports pass or fail on both carbon filings. |
| V6 | Agent orchestration | The method registry (M3): one entry per carbon method, so both sites pick a method the same way. | V5; V13 goes first. | A trial release is out; the private side reports pass on both carbon filings. |
| V7 | — | [x] (Merged, pull request #18.) Violet, the water-benefit agent, as her own module: `@waterbots/violet`. She hosts the D-n modules, starting with D-3. Her color is Orchid (`#A457D4`). | V1; rulings on Violet. | The package builds, passes the package checks, and has a place for each D-n module. |
| V8 | Experts and partners | [x] (Merged, pull request #18. Still to come: the outside expert's check, and N14 and N15 for the outside expert group.) D-3, the water-supply module, inside Violet (M8.1). | V7. It does not wait for the activity-type signature or N6: D-3 is a prototype the outside expert checks later. | Violet's D-3 tests are hand-worked cases, with every step cited to the guidebook (cited, not copied). The VWBA spec is written alongside the build, in `docs/`, and the maintainer reviews it then. An outside expert checks the module once the prototype is up. |
| V9 | Agent orchestration | (Proposal: `docs/proposals/shared-project-record.md`, pull requests #34 and #35, and its follow-up.) The screening hand-off: one project record in `core` that every module fills in and the paid site reads. Each module writes how many questions it asked on that walk. | V5; the paid site's save format (paid repo); Wellington's fields (free-site repo). | A test takes an invented project through all four modules' parts, saves it, reads it back unchanged, and gives each module's question count. |
| V10 | Agent orchestration | Phoebe (eligibility) to its first release (M9.1). | V9; Phoebe's rulings. | Released; Phoebe fills its part of the record and counts its questions. |
| V11 | Agent orchestration | Bridget (the map) to its first release (M9.2). | V9; Bridget's rulings; a rights read on every data file; a ruling on the shared map key. | Released; Bridget fills its part of the record and counts its questions. |
| V12 | Agent orchestration | Calvin's screening part: Calvin fills its part of the record and counts its questions. | V9. | A test shows Calvin's part saved and its count written. |
| V13 | — | [x] (Merged, pull request #20. Released in `calvin-v0.2.0` once the maintainer cuts it.) Data on top: the engine and the screen entry take a site's own country tables over the package's, row by row, and the engine lists every value that came from the site's tables. The tables are the DAF, fNRB, household size, age shares, UN regions and the baseline fuel and stove mix. The DAF floors and the method's own values (charcoal and embodied-emission factors) stay the package's. A site's fNRB rows fill in the matching set of values. It comes before V6, in the next Calvin release. | V5. | A test with an invented table shows the answer and the list of changed values. A mount test from the packed files passes a site table and shows the screen uses it. |
| V14 | v1 proof and grading | The same-numbers check: a project saved by the screening, read back the way the paid site reads it, gives the same numbers, or a list of what changed and why. | V6, V10, V11, V12, V13. | A test passes here on invented projects. The private side runs it on both real filings with the pinned release and reports pass. |
| V15 | v1 proof and grading | The v1 release: a GitHub release that both sites pin. | V8, V14; the maintainer's approval. | Both sites run the same pinned file. The maintainer confirms the whole journey on the live sites, and the average question count is reported. |
| V16 | — | [x] (Released: tag `calvin-v0.3.0` on commit `71ded5d`.) Calvin 0.3.0. The figure tiles fit a narrow panel (pull request #23). A new project, on paper or newly built, gets a V2.0-only view: no V1.0 figure and no transition. The site passes `creditedUnderV1: true` for a project credited under V1.0; left out, the project is new. The release note tells a site to pass `true` for every transitioning project before it upgrades. The `url` line comes out of both package files. | V13. | Released. The private side reports pass after passing `creditedUnderV1: true` on its transitioning projects. |
| V17 | Agent orchestration | Calvin's two doors. **Design only: build nothing yet.** One calculator, two doors. On the sites, the screening sets `creditedUnderV1`, and no door is shown. In the Agent Commons, Calvin opens with two choices: "new project estimate" (sets `false`) or "compare old and new rules" (sets `true`, and still asks for the filed V1.0 fNRB before any comparison). The choices' wording, what each sets and Calvin's opening line belong in the open core, as Violet's door does. The Commons host only draws the buttons. | V16; the maintainer's ruling on the wording. | `packages/calvin/src/doors.ts` and Calvin's prompt hold both choices, and a test shows each choice sets the right value. |
| V18 | — | [x] (Released: tag `calvin-v0.4.0` on commit `09dfc8d`.) Calvin's screens after the walk of the open site (2026-11-16): sixteen items, one pull request. No sum changes. | V16. | Merged, then a release; the private side reports pass. |
| V19 | — | [x] (Released: tag `calvin-v0.4.1` on commit `8cd7971`.) Calvin 0.4.1: monitoring values labelled by the analysis basis. Ex-ante, each is assumed from its starting value. Ex-post, each comes from the operation log or monitoring; until it is entered its box is blank, with a highlight and a red dot, and no figures show. The "entered" flag is saved. No sum changes. | V18. | Session C packs it, runs the release check and makes the tag. After "release it", Session C pushes the tag and publishes the release. The maintainer confirmed the values the rule covers: the operating days, M_q, U_p and X_cleanboil; Q_m is left out (2026-11-21). The paid site installs it. |
| V20 | Agent orchestration | [x] (Released: tag `calvin-violet-v0.5.0` on commit `1bce514`. Still to come: both sites install it. See the step "Calvin and Violet 0.5.0".) Calvin and Violet 0.5.0, one release for both sites. Calvin: the main credit tiles (tCO₂e a year) are a pinned header, whether or not a site sets `unpinFigureBlock`; the smaller figures sit right under them; the sliders and the calculation collapse. The controls panel holds only the site's own top and Calvin's buttons, the work surface ends with the calculation, and the report's note on how the figures were produced is one sentence shorter. A phone pass: rows wrap instead of squeezing. Violet: people served come from the project record, as Calvin takes them, and "Draft — pending expert review" shows on the screen and on every result. No sum changes. | V19, V8. | Session C packs all three packages, runs the release check and makes the tag. One release holds all three files. After "release it", Session C pushes the tag and publishes the release. Both sites install it. |
| V21 | Console and surfaces | [x] (Merged, pull request #38. The release waits until the Agent orchestration family opens.) Calvin and Violet 0.5.1, four changes. Violet's "derived" tag becomes "calculated". A missing value is a blank box with no label, on both screens, in the tables and the tag cells; a blank never counts as zero. Violet's "not enough known" becomes "more to learn". Violet ships a small stylesheet in Calvin's look, with Orchid as her accent. No sum changes. See the step "Calvin and Violet 0.5.1". | V20; the Agent orchestration family opening. | Session C packs it, runs the release check and makes the tag. After "release it", the tag is pushed and the release published. Both sites install it. |

**Where things stand (2026-11-22):** Calvin 0.5.0 and Violet 0.5.0, with core 0.1.1, are the latest release (`calvin-violet-v0.5.0`, V20). V16, V18, V19 and V20 are released. Both sites still install V20. V21 (Calvin and Violet 0.5.1) is merged; its release waits until the Agent orchestration family opens. V17 waits on the maintainer's ruling on its wording.

**Sources still to find** (from V3): moved to the source sweep, M10.4.

**After v1** (not needed for the finish line):

- *Family: Security and hygiene.* npm publishing (M2.2's publish, and the npm scope and token in M1.4). This is v2.
- *Family: v1 proof and grading.* Benchmarks and pass rates. This is v2.
- *Family: Security and hygiene.* M2.3 linting.
- *Family: Calculators and methods.* M4 openings and labels.
- *Family: Console and surfaces.* M5 the friendly view, beyond the sliders and simple view in V3 and V4 and its items marked **(V1)**.
- *Family: Agent orchestration.* M9.2 Bridget's map, beyond its item marked **(V1)**.
- *Family: Calculators and methods.* M6 the fuel-mix floor.
- *Family: Calculators and methods.* M7 diesel and grid factors.
- *Family: Calculators and methods.* M8.2 the free site's water file.
- *Family: Security and hygiene.* The two extra typing checks back on for `calvin`, and the restricted words in the seed's comments.
- *Family: Security and hygiene.* SP6, the human engineer review. It runs alongside and blocks nothing.

---

## M1 — Skeleton and guards, before any code

*Family: Security and hygiene.*

*Stop for the maintainer:* read the CI run. *Waits on:* the npm scope (N13) — for publishing only.

- [x] **M1.1 Guards and rules**
  - [x] `CLAUDE.md`: who does what, hard rules, merge lanes, the grant line, plain-English copy
  - [x] Session deny rules in `.claude/settings.local.json` (local, not committed)
  - [x] Lane labelling job (`lanes.yml`) and the lane rule with tests. It labels only; it never merges.
  - [x] Typecheck, test and build jobs (`ci.yml`) (they now run for real: see M1.3)
  - [x] Gitleaks and a second secrets scan (`secrets.yml`)
  - [x] Number gate placeholder (`number-gate.yml`). Taken out when the gate was retired (M1.2).
  - [x] Publish with provenance on a tag (`publish.yml`), refusing until the scope is real
  - [x] This plan and the build log
- [x] **M1.2 Number gate: retired** (merged, pull request #30).
- [x] **M1.3 Package skeleton** (merged, pull request #2): the empty boxes. No calculator code, no data.
  - [x] Workspace root with TypeScript, vitest and a build; versions pinned, lockfile committed; Node pinned to one
        exact version (24.20.0) in the workflows and `engines`
  - [x] Four stubs: `@waterbots/core`, `calvin`, `phoebe`, `bridget`. Each builds, has one trivial test, an Apache 2.0
        `LICENSE` and `NOTICE` (copyright line: WaterBots AI, LLC), and a README that says it is empty for now. All marked `private`: nothing goes to npm.
  - [x] `scripts/check-packages.mjs`, run by the test job: keeps every package private, licensed and empty-for-now
  - [x] The real plug points in `core` (`ModuleProject`, `StandardId`, `SaveOutcome`, the agent contract) and Calvin's
        folders arrive with the seed (M2.1). Design tokens and the base stylesheet: `@waterbots/core/base.css`, for a site
        without a design system of its own.
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
- [x] **M1.5 Lane 1 auto-merge** (merged, pull request #30). The lane label job arms GitHub's
      auto-merge on a lane 1 pull request that is not a draft, and disarms it on any other. GitHub merges once every
      required check is green. *Waits on the maintainer:* the repo setting "Allow auto-merge" on, and "name scan" on the
      `main` ruleset's required checks in place of "number gate".
- [x] Secret scanning with push protection — already on in the repo settings.

## M2 — The seed lands

*Family: Security and hygiene.*

*Stop for the maintainer:* the private side confirms the package matches the seed. *Waits on:* the seed (the maintainer's one-time carry).

- [x] **M2.1** Seed arrives unchanged, with its reviewed-version ledger kept exactly as it arrives. Show that the
      carried calculator builds and tests the same under this repo's tool versions (TypeScript 7.0.2, vitest 5.0.5,
      Node 24.20.0), and say so in the pull request. (Merged. `SEEDS.md` records it. No ledger file came with the
      seed; see its known gaps.)
- [ ] **M2.2** *Family: Security and hygiene.* Publish `0.1.0` with no changes to what arrived. *Blocked until* the maintainer's hand-steps in M1.4 are done.
  - [x] Get it ready (merged, pull request #6): an engine-only entry, `@waterbots/calvin/engine`, added in new files only;
        React made an optional peer of `calvin` and `core`; both set to version 0.1.0. Still `private`.
  - [!] *Family: Security and hygiene.* Publish. The maintainer's call, after M1.4.
  - [ ] **(V1)** *Family: Security and hygiene.* Every release build runs the name scan on the packed files themselves, not only on the repo. Each packed file is unpacked into an empty folder and scanned there. A finding stops the release.
  - [ ] **(V2)** *Family: Security and hygiene.* Rebuild the release on a second machine and show it gives the same bytes: the same fingerprints.
- [ ] **M2.3 Linting** *Family: Security and hygiene.* (was M1.6): add a linter that runs as part of CI, with the strictest settings that fit. It comes
      right after the seed lands (after M2.2), not before it.
- [x] **M2.4 (V1)** *Family: v1 proof and grading.* Tag which of the 47 made-up test cases in `expected-outputs.json` are outputs of Gold Standard's
      official V1.0 calculator on made-up inputs. The maintainer reports 26, from an audit on the private side (2026-10-25). The
      file marks every case "synthetic" today, so the report's sentence about the official tools cannot be checked
      here. Done when each case carries its source and a test checks the report's claim against the tags.
      (Merged, pull request #11. From the note of 2026-10-31: 26 began as the calculator's output, and 5 of them are still
      its output unchanged. The other 21 were recalculated by our engine. The report counts only the 5.)
- [x] **M2.5 (V1)** *Family: v1 proof and grading.* Record how each of the other 21 made-up test cases was worked out, including every V2.0 case. The
      file records only what the engine returned, not how each expected value was found. Done when each of the 21
      says how it was worked out, or says plainly that its only source is the engine itself. (Merged, pull request #11.
      Every case now carries a `workedOut` tag, explained in the file's `workedOutTags`.)
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

- [x] **M8.1** Water-supply method entry and engine (merged, pull request #18)
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

*Stop for the maintainer:* "release it". *Waits on:* nothing else.

- [x] **C5.1** The build: Calvin's pinned header, the parts that collapse, the phone pass and the tidied panel and
      report; Violet's people served from the project record and her "Draft — pending expert review" label (merged,
      pull request #31).
- [x] **C5.2** The release check, Session C's own: a clean install, typecheck, build and the full test suite; two packs
      with the same fingerprints; the name scan of every file inside the three packed files; GitHub's checks on
      `1bce514`. The packs are in the handoff folder, in `calvin-violet-v0.5.0`, with `SHA256SUMS.txt`.
- [x] **C5.3** The annotated tag `calvin-violet-v0.5.0` on `1bce514`, made locally. Not pushed.
- [x] **C5.4** (Done 2026-11-21. Session C's deny rules blocked both steps, so the maintainer pushed the tag and published the release.) After "release it": Session C pushes that one tag and publishes the release, titled "Calvin 0.5.0 and
      Violet 0.5.0: a pinned header, a phone pass, and Violet's first release", with the three packed files and
      `SHA256SUMS.txt`.
- [ ] **C5.5** *Family: Agent orchestration.* Both sites install it, and take the steps in Calvin's README, "Changes in 0.5.0".

## Calvin and Violet 0.5.1

*Family: Console and surfaces.*

A small release for both sites, with exactly four changes. It is V21 on the road to v1. No sum
changes.

*Stop for the maintainer:* "release it". *Waits on:* the Agent orchestration family opening.

- [x] **C51.1** *Family: Calculators and methods.* Violet's value tag "derived" becomes "calculated", so both agents
      use entered, default, calculated and assumed (merged, pull request #38).
- [x] **C51.2** *Family: Console and surfaces.* A missing value is a blank box, with no label, on Calvin's and
      Violet's screens, in the results tables and the tag cells. A blank never counts as zero (merged, pull request #38).
- [x] **C51.3** *Family: Calculators and methods.* Violet's reading "not enough known" becomes "more to learn": one
      set of words everywhere, likely, more to learn and unlikely (merged, pull request #38).
- [x] **C51.4** *Family: Console and surfaces.* Violet ships a small stylesheet, `@waterbots/violet/styles.css`, in
      Calvin's look, with Orchid as her accent (merged, pull request #38).
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

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
the pull requests or checks inside it. Each step belongs to one of the ten families below. "Family" means only those
ten. `[x]` done (merged), `[~]` open pull request, `[ ]` not started,
`[!]` blocked until the maintainer acts. **(V1)** marks an item inside a step that v1 needs, even where the rest of its step
comes after v1. **(V2)** marks an item planned for v2.

All of M1 to M10 is `Grant: open`. Edits to this plan and the build log are `Grant: neither`.

## The ten families

One set of ten families, the same for all three repos. Every open step, item and open question
carries one family label, written *Family: name.* In the Road to v1 table it is the Family column. A step's label is its
main family. An item inside it that belongs to another family carries its own label.

| Family | What belongs here |
|---|---|
| 1. Agent orchestration | during a visit: how agents read the project's facts, write them, and talk about them while the person is there; how agents plug into both sites; the one shared project record; what each agent reads and writes; which pathway and method a project is on and which are unlikely; hand-offs between agents; installing core releases. |
| 2. Calculators and methods | the maths, method values, defaults, labels and where each value comes from. |
| 3. Knowledge | what the agents are allowed to know: cards, packs, hosted copies. |
| 4. Console and surfaces | what a visitor sees and clicks, the same on both sites: layout, navigation, header, Save, words, phone, design, report. |
| 5. v1 proof and grading | showing it works: real-filing matches, same numbers, whole-journey walks, question counts, exams, the grading rig. |
| 6. Data and map | real outside data and the rights to use it: basins, project points, corporate goals. |
| 7. Paid platform | paid-only structure: roles, organizations, programs, documents. |
| 8. Security and hygiene | secrets, names to block, alerts, repo settings, speed and weight, stale rules and docs, close-outs. |
| 9. Experts and partners | what outside experts review, what we owe partners, and what we send them. |
| 10. Project data and evidence | after Save: what is kept, what comes across from a screening, versions and evidence. |

**The line between families 1 and 10** (the maintainer, 2026-11-26): during a visit is family 1, Agent orchestration:
how agents read the project's facts, write them, and talk about them while the person is there. After Save is family
10, Project data and evidence: what is kept, what comes across from a screening, versions and evidence.

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
| J1 to J9 | Agent orchestration | What family 1 left open (closed 2026-11-26). See "Family 1: what is left" below. J7 is now under family 2. | See each item. | See each item. |
| V8 | Experts and partners | [x] (Merged, pull request #18. Still to come: the outside expert's check, and N14 and N15 for the outside expert group. The D-3 input list is ready; the email to the outside expert waits for the maintainer's word.) D-3, the water-supply module, inside Violet (M8.1). | It does not wait for the activity-type signature or N6: D-3 is a prototype the outside expert checks later. | Violet's D-3 tests are hand-worked cases, with every step cited to the guidebook (cited, not copied). The VWBA spec is written alongside the build, in `docs/`, and the maintainer reviews it then. An outside expert checks the module once the prototype is up. |
| V14 | v1 proof and grading | The same-numbers check: a project saved by the screening, read back the way the paid site reads it, gives the same numbers, or a list of what changed and why. | J3, J4, J5. | A test passes here on invented projects. The private side runs it on both real filings with the pinned release and reports pass. |
| V15 | v1 proof and grading | The v1 release: a GitHub release that both sites pin. | V8, V14; the maintainer's approval. | Both sites run the same pinned file. The maintainer confirms the whole journey on the live sites, and the average question count is reported. |

**Where things stand (2026-11-26):** Family 1, Agent orchestration, closed on 2026-11-26. The latest release is core 0.5.0, Calvin 0.9.0, Violet 0.9.0, Phoebe 0.2.0, Wellington 0.2.0 and Bridget 0.2.0, one tag each on commit `56ddd21` (#64). Both sites installed it and walked the river case with the real model, and no fact was guessed on either. A package's number moves only when that package changes. What family 1 left open is in "Family 1: what is left". Finished steps are in the build log.

**Sources still to find:** in the source sweep, M10.4.

**After v1** (not needed for the finish line):

- *Family: Security and hygiene.* npm publishing (M2.2's publish, and the npm scope and token in M1.4). This is v2.
- *Family: v1 proof and grading.* Benchmarks and pass rates. This is v2.
- *Family: Security and hygiene.* M2.3 linting.
- *Family: Calculators and methods.* M4 openings and labels.
- *Family: Console and surfaces.* M5 the friendly view, beyond the sliders (released) and M5.3 and M5.4, which are v1.
- *Family: Console and surfaces.* The simple view (V4, M5.5). This is v2.
- *Family: Agent orchestration.* M9.2 Bridget's map. Its tap size is now in the sites' plans.
- *Family: Calculators and methods.* M6 the fuel-mix floor.
- *Family: Calculators and methods.* M7 diesel and grid factors.
- *Family: Calculators and methods.* M8.2 the free site's water file.
- *Family: Security and hygiene.* The two extra typing checks back on for `calvin`, and the restricted words in the seed's comments.
- *Family: Security and hygiene.* SP6, the human engineer review. It runs alongside and blocks nothing.
- *Family: Console and surfaces.* A view on Calvin's screen that shows the V1.0 figure on its own, for a project only the
  2021 version counts. Until then his tool gives that figure (the maintainer, 2026-11-25).

## Family 1: what is left (Agent orchestration, closed 2026-11-26)

*Family: Agent orchestration.* During a visit: how agents read the project's facts, write them, and talk about them
while the person is there.

**Guiding line:** Wellington manages the team to gather what the project needs and keep it moving. The other agents do
their tasks, collect what they need, and report back to him. He helps with the next steps.

The v1 scope was J1 to J9, ruled by the maintainer on 2026-11-22. Everything released is in the build log. What is
left is below. `[!]` waits on the maintainer.

**Left open, marked v1** (the maintainer: it must be fixed before v1):

- [ ] **(V1) F1.1** An agent may tell the visitor it wrote a fact down when the guard refused it. Seen on the open
      site's first walk on 2026-11-26. The visitor sees no line about the refusal; the agent asks again in its own
      words.

**Left open, marked by the coach for the maintainer** (F1.8's v1 mark is still open):

- [ ] **F1.2** *v1 (coach, for the maintainer, 26 Nov).* A project core answers "held for now" is still filed by the map under "not covered yet", so the sites
      show the "no calculator yet" sentence.
- [ ] **F1.3** *v1 (coach, for the maintainer, 26 Nov).* Phoebe is not called by herself when a fact changes. Her readings run again only when the visitor next
      writes to her. The open site's A34 is the same job. If core's map must say she is due, core releases first.
- [ ] **F1.4** *v1 (coach, for the maintainer, 26 Nov).* Phoebe can say more than her worksheet holds: she said both paths look likely while one row was still
      "more to learn".
- [ ] **F1.5** *After v1 (coach, for the maintainer, 26 Nov).* The door's choices for when a change is kept lack the open site's true answer: nothing is kept after the
      visit unless the visitor chooses Save and sign up. The open site had to choose "on save".
- [ ] **F1.6** *v1 (coach, for the maintainer, 26 Nov).* Calvin's list of missing facts still names "technology", which no site asks for any more. The open
      site's line "Still needed: technology. Tell Wellington." (S37) is the same job: core releases first, then the
      open site.
- [ ] **F1.7** *v1 (coach, for the maintainer, 26 Nov).* A stray "(ref)" showed twice in Calvin's reply on the open
      site. It breaks agent rule 8: a (ref) marker points only to a source in the agent's own knowledge pack.
- [ ] **F1.8** Stale wording in code this sprint touched, left for the next pull request in these files: Wellington's
      `answer.ts` still says, in its header and beside `HIS_KIND_FACTS`, that the other yes-or-no facts are kept only
      when the map asked for them. Core's guard on facts now decides that.
- [ ] **F1.9** *v1 (coach, for the maintainer, 26 Nov).* When a fact changes, Phoebe's settled rows stay settled. She can settle the technology class on her
      worksheet while the record stays blank.
- [ ] **F1.10** *v1 (coach, for the maintainer, 26 Nov).* If the place names no country, the map never calls Phoebe. Found, not chased.

**Still to come from J1 to J9** (J7 is now under family 2):

- [!] **J2.** Calvin's two choices in the Agent Commons: their wording and his opening line wait on the maintainer's
      ruling.
- [ ] **(V1) J3.** A test takes a made-up project through every agent's part, saves it, reads it back unchanged, and
      gives each agent's question count. Today it covers Calvin's part and Violet's part.
- [!] **J4.** Four rules that say which project facts point to which pathway have no source yet. They are listed in
      the record proposal. Until the maintainer rules them, the map uses only the eligibility readings and the two
      rules this repo can cite.
- [ ] **J5.** Bridget's map, after the rights check on every one of her data files, and a ruling on the shared map key.
      The rights check is done (the maintainer, 26 Nov): the open site confirmed that its README credits all four map
      data files (HydroBASINS, Aqueduct 4.0, and Natural Earth's public-domain country boxes). F7.1 keeps its own check. One calculator screen: each site passes the place, the Paid site saves the notes, and later calculator agents
      follow the same screen.
  - [!] Phoebe's, Wellington's and Bridget's rulings.
- **J8.** Now in the paid site's plan, in its family 1 list.
- [!] **J9.** The consulting page's address, kept in one shared file in `core` (rule 13). Two values stand in for a
      blank in Calvin: see F2.4 below.

## Family 10: Project data and evidence

*Family: Project data and evidence.* After Save: what is kept, what comes across from a screening, versions and
evidence.

- From J3: An update never changes a screening: one that already exists keeps its answers, and working a project out
  again is a new screening beside it. (Decided by the maintainer on 2026-11-25; built in `core`, #61, released in core
  0.4.0.) The paid site's part is its #317. v1 mark: open.
- [ ] **(V1) F10.1** Calvin never sends a value nobody gave. 347 days is only where the free site's slider starts. A
      walk found one of Calvin's tool calls on the paid site sent 347 days. Core's part: Calvin's knowledge
      (`knowledge.md`) and his tools treat 347 as the slider's start only, never a value to send. Calvin's ruling
      "Operating days start at 347 for every project" changes only on the maintainer's word. Core releases first; the
      paid site's part is its #316 and #322 (no starting numbers on the paid site).
- [ ] **(V1) J6** Saving a screening into the paid site: the count of people served crosses over correctly, and the
      paid record never shows "people" as a unit nobody chose. In this repo the record keeps people served the way it
      was entered, and never fills in a unit on its own. The paid site's save does the rest. Its carry-over test (#323)
      checks every value, one by one; already known not to land: people served, its unit, household size and
      "credited under V1.0". Core's part comes first if the record is missing any of them.

## More open items, by family

From the coach's list of 26 Nov 2026. Each is not chased yet. v1 mark: open, unless it says otherwise. `[!]` waits on
the maintainer.

**Family 2, Calculators and methods**

- [!] **J7.** The maintainer signs off the first water-benefit activity type (safe drinking water supply). No building.
      Moved from family 1 (round 2 of the plan sync).
- [ ] **F2.1** *v1 (coach, for the maintainer, 26 Nov).* Two of Calvin's shares can add up to more than 1 under V1.0. Found, not chased.
- [ ] **F2.2** *After v1 (coach, for the maintainer, 26 Nov).* The 2019 VWBA paper that the second VWBA reference points to is not held.
- [ ] **F2.3 (after v1, parked)** A candidate for the next project type: utility water loss, VWBA D-2. Not the next
      piece of anything.

**Family 3, Knowledge** (the maintainer plans a Knowledge pack review sprint)

Phoebe's cards are sealed. They change only on the maintainer's word.

- [!] **F3.1** *v1 (coach, for the maintainer, 26 Nov).* Copied-text review of Phoebe's cards: nine places, all cited (eight document titles, one short quote with
      its page). The maintainer decides whether the copied-text check ignores a cited title. Older: a ten-word match in
      her carbon cards and a nine-word match in the carbon grader notes.
- [!] **F3.2** *v1 (coach, for the maintainer, 26 Nov).* Sealed card fixes: two pointers to retired pages, and card T4's transition-module line. Core's cards come
      first; Phoebe's nine site lines on the open site are the open site's part.
- [!] **F3.3** *v1 (coach, for the maintainer, 26 Nov).* Phoebe's cards: six "ruled out" lines; "not eligible" and "hard gate"; three lines that pull against the
      agent rules.
- [ ] **F3.4** *v1 (coach, for the maintainer, 26 Nov).* Phoebe said a standards body covers carbon or water benefits. Carbon credits have one; water benefits do
      not. This breaks agent rule 7.
- [ ] **F3.5** *v1 (coach, for the maintainer, 26 Nov).* Phoebe's additionality question cannot be answered by a newcomer. Her follow-up (will households pay,
      and will that cover running costs) should come first. Her claim that it matters for "both funding paths" needs a
      source.
- [ ] **F3.6** *v1 (coach, for the maintainer, 26 Nov).* Phoebe's "one more" habit, and her long closing list of step names and jargon.
- [ ] **F3.7** *v1 (coach, for the maintainer, 26 Nov).* Wellington said "still a maybe". Agent rule 14 allows only likely, more to learn, unlikely.
- [ ] **F3.8** *v1 (coach, for the maintainer, 26 Nov).* Agents say "the water side" and "the carbon side". Calvin asks about the pump again.
- [ ] **(V1) F3.9** Wellington's sourced general facts, in his package. Core releases first; the paid site's part is its
      #305. After v1: his helper-agent design (the paid site's #306).
- [!] **F3.10** *v1 (coach, for the maintainer, 26 Nov).* Are Bridget's "still being built" words the free site's alone? They sit in her instructions here, which
      both sites read.

**Family 4, Console and surfaces** (the shared page first; both sites together)

- [ ] **F4.1** *v1 (coach, for the maintainer, 26 Nov).* Phoebe's tally leaves the chat for the left rail, which holds the progress of the current work. The
      shared page comes first and both sites build the rail. Core's part: Phoebe stops writing her tally in the chat
      once the rail shows it. Core releases first.

**Family 7, Paid platform**

- [ ] **F7.1 (after v1)** Bridget's "who works where" is the paid site's. Each of its data sources gets a rights check
      before it enters this repo, which is public.

**Family 8, Security and hygiene**

- [!] **F8.1** *After v1 (coach, for the maintainer, 26 Nov).* One command to update the block list everywhere it is kept: the local list each session reads, and each
      repo's `NAMES_TO_BLOCK` secret. All three repos share it. It is a new tool, so it needs the maintainer's yes.

---

## M1 — Skeleton and guards

*Family: Security and hygiene.*

- **M1.4 The maintainer's hand-steps** *Family: Security and hygiene.* — blocked until the maintainer; Session C cannot do these. **Due before the first release (M2.2).**
  - [!] *Family: Security and hygiene.* The npm scope: create the npm organisation or confirm the maintainer owns it (N13)
  - [!] *Family: Security and hygiene.* The `NPM_TOKEN` Actions secret
  - [!] *Family: Security and hygiene.* The maintainer as required reviewer on the `npm-publish` environment, so every release needs their approval
  - [!] *v1 (coach, for the maintainer, 26 Nov).* *Family: Security and hygiene.* The release tag rule: only the maintainer, the engineer and Session C (after "release it") may create release tags (`v*`, and each module's own,
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
- [ ] **M5.3** *v1 (coach, for the maintainer, 26 Nov; the whole console is v1, the maintainer, 26 Nov).* *Family:
      Console and surfaces.* Calvin's question rows are big enough to tap on a phone. Done when a test checks their tap
      size and the maintainer checks them on a phone.
- [ ] **M5.4** *v1 (coach, for the maintainer, 26 Nov; the whole console is v1, the maintainer, 26 Nov).* *Family:
      Console and surfaces.* Calvin's color is Reef (`#0E8A94`) on his screens. Done when his screens use
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
  - The map's tap size is now the open site's S25 and the paid site's #339. *v1 (coach, for the maintainer, 26 Nov).*

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
- [!] *Family: Security and hygiene.* **F8.2 No copied-text check.** *After v1 (coach, for the maintainer, 26 Nov).* `RULINGS.md` section 1 says every release is checked for
      copied text. This repo's release check has none. A new check needs the maintainer's yes. Seen again at the
      family 1 close: two releases went out on 2026-11-26 without one. After v1 is for an automatic check. Until it
      exists, every release is checked for copied text by hand, as RULINGS section 1 requires.
- [!] *Family: Security and hygiene.* **Merged branches stay on GitHub** (23 besides `main`). GitHub's setting to
      delete a branch when its pull request merges would stop new ones.
- [!] *Family: Security and hygiene.* **Three rules wait in `CLAUDE.md`** ("Waiting for the maintainer"): the Grant
      line, the engine does every sum, and the three kinds of value. The maintainer places or drops each.
- [!] *Family: Calculators and methods.* **F2.4 A value stands in for a missing one.** *v1 (coach, for the maintainer, 26 Nov).* Calvin counts embodied emissions
      as 0 when they are not entered, with a warning, and devices per household as 1 when not given. `RULINGS.md`
      section 2 says a missing fact never counts as zero. The paid session's reading of the book: embodied emissions
      are mandatory, with default deductions (§5.2.2 e, p.17; §9.2 and Table 10, p.36); devices per premises come from
      sales records, with no default (SDWS 37, p.72). "Devices per household is 1" is in Calvin's rulings, so the fix
      needs the maintainer's word in family 2's sprint. Changing either changes a sum. Goes with J9 (rule 11).

## Found in the Agent orchestration sprint (closed 2026-11-26)

Each finding from the family 1 sprint that is not family 1's own. Family 1's are in "Family 1: what is left".

- *Family: Console and surfaces.* **F4.2 Wellington on the paid site.** Now the paid site's #314.
- [ ] *Family: Console and surfaces.* **F4.3 The Agent Commons does not read the installed packages.** *v1 (coach, for the maintainer, 26 Nov).* It shows its own
      typed list. Calvin's and Violet's release notes ask for Commons changes that were not made. Both sites' work, the
      shared page first; core's part is J2.
- *Family: Security and hygiene.* The missing copied-text check is listed under the Security and hygiene sprint above.

---

## Open questions

- **Notes along a slider** *Family: Calculators and methods.* (Not v1.) Notes along a slider that say what a value
  means at a threshold, each with a cited source (the maintainer's idea, 2026-11-23).

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
- **N17,** *v1 (coach, for the maintainer, 26 Nov):* *Family: Experts and partners.* still open on carbon, for the methodology sprint. They replace the older
  questions, which the maintainer decided on 2026-11-25.
  - Improving a source that still works: the text does not say. Held for now.
  - A chlorine dispenser's class in the 2026 version.
  - Which method a supply combined with home or institution treatment uses.
  - Does the 2026 version's silence on where treated water comes from mean what we read it to mean? The 2021 version says it
    in words.
  - A note on evidence for a restored source. In the maintainer's professional experience, proof that the source had stopped
    working is submitted, usually with a letter from whoever installed or managed it saying there were no plans to fix it.
    Its source for now is "the maintainer's professional experience". It needs a source line before an agent repeats it.
- **N18,** *v1 (coach, for the maintainer, 26 Nov):* *Family: Experts and partners.* still open on water benefits, for the methodology sprint.
  - How is treatment counted when people already collected the same water untreated, and which of D-3's two printed forms of
    the sum holds? The maintainer's own thought, not yet confirmed: treatment may be counted as unsafe water made safe, and
    the form of the sum that takes water off may work like the carbon method's value for people who already had safe water.
    Both are questions for the experts. The same question stands for carbon community systems.
  - Which belong with Violet's method: household treatment, community-level treatment, treatment at a school or clinic,
    water reuse and irrigation supply. The maintainer, after the 24 Nov walk: "Do not count it. I need to ask the
    experts." Until then Calvin's tool and core's label list refuse community-level and institutional treatment.
  - Restoration: is "water before the project" enough, or are more checks needed?

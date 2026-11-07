# Build log

Newest first. One entry per pull request: what was done, what is still open. Never rewrite an old entry; add a new one.

---

## 2026-11-05 — Calvin 0.1.0 released

**Done (branch `release-log`):** Session C built Calvin's first release from `main` at `3020ee7`, after the screen
entry merged.
- Session C ran every check on that commit: typecheck, tests, build, the 48 engine checks, the screen mount test
  (4 views from the packed files), and the seed, package and paid-code checks. The name scan ran on the committed
  files and on both packed files. All passed. Building and packing a second time gave the same fingerprints.
- Session C made the annotated tag `calvin-v0.1.0` on `3020ee7`. The maintainer pushed it and created the GitHub
  release, with the two packed files, `SHA256SUMS.txt` and the release notes.
- Checked 2026-11-06, after the release was published: it holds those three files and is not a draft. Session C
  downloaded both packed files. Each matches `SHA256SUMS.txt`, the fingerprints in `SEEDS.md`, and a fresh build and
  pack from `3020ee7`. The tag `calvin-v0.1.0` is annotated and points at `3020ee7`.
- Commit ids changed on 2026-11-05. History was rewritten so that every commit carries the maintainer's GitHub
  no-reply address. Only those addresses and the seed commit's id changed; names, dates, messages and every other file
  stayed the same. The seed commit is now `09f6ad1`, and `scripts/check-seed.mjs`, `SEEDS.md` and this log name it.
- `SEEDS.md` gains a "Releases from this repo" table, with this release's tag, commit and fingerprints. `BUILD_PLAN`
  marks V5 as released.

**Still open:** both sites pin the release. The private side reports pass or fail on both carbon filings.

---

## 2026-11-05 — The screen entry: both views, mountable from the packed files

**Done (branch `screen-entry`):** ruling 2026-11-05. Before this, the packed Calvin package let a site import only its
name and the engine. The screens were in the files, but no entry reached them, and the stylesheet was not packed.
- `@waterbots/calvin/screen`: the state hook, the controls panel, the work surface, the report and the version tabs,
  with their types. The build bundles it into one file, `dist/screen.js`. React and `@waterbots/core` stay outside it.
- `@waterbots/calvin/styles.css`: the report's print rules, now copied into `dist` and exported.
- `@waterbots/core/base.css` (plan M1.3): the design tokens and every class the screens use, for a site without a
  design system of its own. The tokens have no weight, so a site's own values win. Every colour is a starting point.
  A test fails if a screen uses a class or a token that no stylesheet defines.
- `exAnteOnly`, a new option of the state hook: every run is ex-ante, a saved ex-post analysis opens as ex-ante, a
  change to ex-post is dropped, and the sliders are on. The open site's screening uses it. The paid site leaves it
  off and shows both views.
- `scripts/check-screen-entry.mjs`, run by `npm test`: packs both packages, installs them alone with React, and
  renders from the packed files the ex-ante view (also for a saved ex-post analysis), the ex-post view and its
  report. It also finds both stylesheets by name and typechecks a file that imports the entry.
- The `styles.css` comment names no one now.
- `CLAUDE.md`: the "Assumed" line now matches the three kinds of value. The usage slider's start (100%, labelled
  "assumed") is settled; its source is M10.4 in the source sweep.
- The release (V5) stays held. It is rebuilt only after this merges.

**Checked:** see the pull request.

**Open:** nothing new. The packed files from 2026-11-05 are not shipped.

## 2026-11-05 — Three kinds of value

**Done (same branch, `data-notes-sources`):** ruling 2026-11-05. In `CLAUDE.md`, under "Where a value comes from", the
blank-when-no-source line is replaced, word for word, by the three kinds of value in Calvin's carbon modules:
- project facts, which wait for the user's input and are never guessed;
- method defaults, filled in from cited sources;
- anticipated performance, which starts at a labelled assumed value.

The ruling marks this as settled. No code changed.

## 2026-11-05 — The source sweep family; the IPCC table cited

**Done (same branch, `data-notes-sources`):** ruling 2026-11-05.
- The plan has a new **V2** family, M10 "Agent and module source sweep". The permission replies may never arrive, so
  a V2 sweep checks every agent's and module's sources. The stove and fuel preset sources moved there from M6.2 and
  are now M10.1.
- The kerosene, coal and LPG notes in `presets.ts` now cite the IPCC 2006 Guidelines, Vol. 2, Ch. 2, Table 2.5
  (residential) instead of "source pending". The table number was checked against the IPCC's published contents; the
  page was not, because this repo holds no standards PDF. The page is logged as M10.2, with a check of LPG's 63.1
  against the corrected table. Kerosene and coal still have no coded value and still count at zero. No value changed.

**Checked:** see the pull request.

**Open:** M10.1 and M10.2.

## 2026-11-05 — Data notes on screen cite their source; preset sources logged; where a value comes from

**Done (branch `data-notes-sources`, built on `role-wording`):** ruling 2026-11-02.
- Every note in Calvin's data files that reaches a screen, the report or Calvin's replies was read. None credits a
  ruling or a person. Each names its source: the fNRB labels, multi-national citation, footnote and refusal
  (A6.4-AMT-009 Tables 2 and 3), the rule-update line (its instrument), the DAF country rows (Tool 05 Table 03), the
  age-share default (UN WPP 2024), the embodied-emission classes (V2 §9.2 Table 10) and the household sizes (UN 2022).
- One note left out its section. The DAF fallback label said only "Gold Standard DAF tool's fallback". It now ends
  with the data file's own citation (457 §5.7.1(b), PDF p.8). A test pins it. No number or calculation changed, so
  the engine version stays 0.19.0.
- The longer notes in the data files that credit a ruling (`desc`, `notes`, `coverage` and struck records) are read
  by no screen or report. They are left as they are.
- The plan now holds two **(V1)** items: move this repo to the WaterBots GitHub organisation (M1.4; it was not in
  the plan before), and run the name scan on the packed files of every release (M2.2).
- The country-default notes in `presets.ts` were read one by one (ruling 2026-11-05). None has a published source
  this repo may use yet: the WHO and DHS figures wait on permission, and the mappings are our own. Every value is
  left unchanged. They are logged together as one open item, M6.2 **(V2)**, naming the pending request (#234 on the
  paid site). The baseline-mix data file holds no country rows, so none of these notes reaches a screen today.
- `CLAUDE.md` now says where every value shown to a user comes from (entered, default, derived or assumed), and that
  the preset sources are not raised again until the permission replies arrive (ruling 2026-11-05).
- `.claude/settings.local.json` is already in `.gitignore`, and git confirms it ignores the file. No change needed.

**Checked:** see the pull request.

**Open:** M6.2, the stove and fuel preset sources, until the permission replies arrive.

## 2026-11-02 — The maintainer, named by role

**Done (branch `role-wording`, built on the branches of #11 and #12):** ruling 2026-11-02. Every committed file
now says "the maintainer" where it named a person, and credits a ruling by its date ("ruling 2026-09-21"). That covers
`CLAUDE.md`, the plan, this log (older entries included, by that ruling), the workflows, `SEEDS.md`, the package
READMEs and Calvin's code comments and data notes. The pull request block is now **For the maintainer**. Copyright and
licence lines were left alone; none named a person. The module characters (Violet, Bridget) keep
their pronouns. No number, calculation or test changed.

**Checked:** typecheck, test and build pass. 48 of 48 in the engine-entry check. The seed check passes. The fixed name
scan, run on the whole repo, finds nothing.

**Open:** the data notes that reach a screen or report still credit rulings rather than sources. That is the next pull
request.

## 2026-11-02 — Name scan: the repository link

**Done (same branch, `name-scan-fixes`):** ruling 2026-11-02. The four `package.json` files keep the owner's GitHub
login in their repository link until the repo moves to the WaterBots organisation. The scan now lets through the
owner part of a GitHub link in a `package.json` "repository" field, and nowhere else. The rest of that line is still
checked, and so is every other field, file and link. A test with made-up names pins this.

A folder named to the scan is now read whole, built output (`dist`) included, so an unpacked release package is
scanned in full (ruling 2026-11-02: every release build scans the packed files). A test pins this too.

**Checked:** the 19 name-scan tests pass. The fixed scan finds nothing in the four `package.json` files. The other
hits are cleared in their own pull request.

## 2026-11-01 — Name scan: three fixes

**Done (branch `name-scan-fixes`):** the open site found three faults in the shared name scan. All three were in this
repo's copy too. `scripts/check-names.mjs` now:
- reads the copyright allowance note with or without its closing "only", and stops the scan on any note it does not
  know. Before, a note without "only" was read as part of the name, so that entry never matched anything;
- also finds a person with the allowance by first name alone and by surname alone;
- treats a line as a copyright or licence line only when it starts, after any comment marks, with "Copyright", "©",
  "(c)", "SPDX-" or "Licence". Before, the word anywhere in the line was enough.

Each fix has a test with made-up names. Each new test fails on the old scan.

**Checked:** the 17 name-scan tests pass. The fixed scan, run on the whole repo, now finds 249 hits in the committed
files. Every one comes from a single list entry that the first fault had switched off: a first name used on
purpose across the plan, `CLAUDE.md` and code comments, and the GitHub login in each package's repository link. The
built files carry the same first name in their comments. A local, uncommitted settings file has 3 more hits from
other entries.

**Open:** how to treat those hits is the maintainer's decision. Until then the scan fails on this repo, and the first release
cannot pass it.

## 2026-10-31 — V5 The first release held; test cases tagged; Calvin's color is Reef

**Done (branch `plan-simple-view-release`):**
- Prepared Calvin's first GitHub release from `main` at `dba49a8`, version 0.1.0. Packed two files with `npm pack`:
  `calvin`, and `core`, which Calvin's package lists and npm fetches on install. Worked out each file's SHA-256
  fingerprint and wrote the release notes. The maintainer then held the release (ruling 2026-10-31): nothing is published and no
  tag is pushed. It is rebuilt from `main` after this pull request merges.
- Took the note on how the test cases were worked out, `NOTE_test-case-methods_2026-10-31.md`, from the handoff
  folder (`%USERPROFILE%\GitHub\handoff\`), read-only. Used only its case IDs and methods. No figure came with it.
- `expected-outputs.json`: every one of the 47 made-up test cases now has a `workedOut` tag, and `workedOutTags`
  says what each tag means. The tags: the official V1.0 calculator's output, unchanged (5); its output, then
  recalculated by our engine at the official UN fNRB value (21); V1.0 worked from the methodology (3); V2.0 worked by
  hand, as no official V2.0 calculator exists (16); fNRB look-ups (2). No expected result changed.
- The report's sentence is now "Every build checks it against 47 made-up test cases. 5 of them match Gold Standard’s
  official V1.0 calculator on made-up inputs." Both numbers are read from the file and its tags. Tests pin the
  wording, both counts, and the total for each tag.
- Calvin's color is Reef (`#0E8A94`), not Plum (ruling 2026-10-31). Violet's color, Orchid (`#A457D4`), is noted on V7.
  The entry below, from an earlier pull request, still says Plum; it is left as written.
- `BUILD_PLAN.md`: V3 marked merged. V5 no longer waits on the simple view. New items: M5.5, the simple view, the
  bigger tap buttons and Reef ship together as the next release (V1); M2.6, put the 21 recalculated cases back
  through the official V1.0 calculator (V2); the release tag rule in M1.4, with the engineer, once the GitHub organisation
  exists (V1); a rebuild of the release on a second machine, under M2.2 (V2). M2.4 and M2.5 are closed by this pull
  request.

**Checked:** see the pull request for this branch's runs. Before the hold, on a clean checkout of `dba49a8`: CI, both
secrets scanners, typecheck, test and build, 48 of 48, the engine-entry check, the seed check and the name scan all
passed, in the repo and in the two packed files.

**Open:** the release tag rule (M1.4). A rebuild on another machine has not yet been shown to give the same bytes.

## 2026-10-31 — V3 Sliders: brought up to date, and four v1 items planned

**Done (same branch, `sliders`):**
- Merged `main` into the branch. Both sets of log entries are kept, newest first.
- `.claude/settings.local.json` is already in `.gitignore`, and git confirms it ignores the file. No change needed.
- Added four items to the plan, each marked **(V1)**:
  - M2.4: tag which made-up test cases are outputs of Gold Standard's official V1.0 calculator.
  - M2.5: record how each of the other test cases was worked out, including every V2.0 case.
  - M5.3 and M9.2: Calvin's question rows and the map's + and - buttons are big enough to tap on a phone.
  - M5.4: Calvin's color is Plum on his screens.

**Checked:** typecheck, test and build pass. The same 48 of 48 checks. Name scan on committed files: no finding.

**Open:** the test-case file records only what the engine returned for each case. Nothing in this repo says which
cases came from the official V1.0 calculator, or how any case was worked out. M2.4 and M2.5 need that from the maintainer.

## 2026-10-31 — The report's sentence on how the calculator is checked

**Done (open pull request, branch `report-test-case-count`):**
- Calvin's report now says: "Every build checks it against N made-up test cases, including results from Gold
  Standard's official V1.0 tools on made-up inputs." N is read from the committed test-case file
  (`expected-outputs.json`), not typed. It is 47 today.
- The sentence lives in `screen/buildCheck.ts`. The typed count, the accuracy figure and the claim about filings are
  gone from the report.
- The closing note's "tested against the reference cases described above" now says "test cases", to match.
- Tests pin the wording, check N against the file, and check the report carries no typed count, accuracy figure or
  claim about filings.

**Checked:** typecheck, test and build pass. The same 48 of 48 checks. Name scan on committed files: no finding.

**Open:** the committed test-case file marks every case "synthetic". It does not say which cases came from Gold
Standard's official V1.0 tools, so this repo cannot check that part of the sentence on its own.

## 2026-10-31 — V3 Sliders: community days start at 347

**Done (same branch, `sliders`):**
- Community systems' days-of-operation slider starts at 347, labelled with its source (V2.0 SDWS 32; V1.0 SDWS 27).
  With sliders on, an unsaved days value starts there too, so the slider, its label and the engine begin at the same
  number. A saved value always wins. Household treatment keeps 365. The typed boxes keep 365 for both.

**Checked:** typecheck, test and build pass. The same 48 of 48 test cases. Name scan: no finding.

## 2026-10-30 — V3 Sliders: answers on the pull request

**Done (same branch, `sliders`):**
- The panel's headline is the engine's yearly credit for the values set. It moves as any slider moves.
- Each slider shows the credited value only when it differs from the value set (for example, age-weighted litres).
- Community systems: water, days of operation and tests passing. Above 347 days, the row says an operation sensor is
  required (V2.0 SDWS 32; V1.0 SDWS 27). There is no usage slider, since V2.0 fixes usage at 100% for them.
- Household treatment: the same, with days the device is in the home (starting at 365, moving down only) and the
  share of homes that really use the device.
- The share of users who still boil the safe water stays a typed value. A project does not control it.
- Tests passing: below the V2.0 §7.4.3 corrective-action line (80% in year 1, 85% in year 2, 90% from year 3), the row
  says a corrective action plan is required and that crediting is suspended if the next tests don't improve. It says
  which years the share falls short in, since the run does not know the project's year. V2.0 runs only.
- Ends from a share (0% to 100%) or the year (365 days) are labelled "natural limit". Where no floor is cited, the
  slider just allows 0, with no note.
- A starting value with no source says "assumed: no source yet". The plan has an item to find one: the share of homes
  using the device (100%).

**Checked:** typecheck, test and build pass. The same 48 of 48 test cases. Tests cover the ends, the starts, the three
notes, the headline and the credited value.

## 2026-10-30 — V3 Sliders for anticipated performance

**Done (open pull request, branch `sliders`):**
- A setting a site turns on, `exAnteSliders`. On an ex-ante run it shows an "Anticipated performance" panel above the
  equations, with four sliders. Ex-post runs, and any site that leaves it off (the paid site), keep the typed boxes.
- The four: drinking water per person per day; days a year the water is available (household treatment: days the
  device is in the home, starting at 365 and moving down only); share of water tests that pass; share of homes that
  really use the device (household treatment only, never 0).
- Each starts at its value, labelled "assumed", and becomes "entered" once moved or typed. Each end shows its value and
  its source. An end with no citation is not made up: the row says "No cited floor".
- Each has a pencil to type an exact value. A value typed past a cited end is held at that end, and the row says the
  credit is capped.
- Each shows the number the engine credits, and one plain line on which way the credits move. Litres shows the
  engine's own volume. On a V2.0 household run with no volume entered, that is the age-weighted volume, not the
  starting 4.00 L.
- The equation rows for these four values show the credited value and point to the panel. There is one control per
  value.
- The logic is in `screen/exAnte.ts`; the row is `SliderRow.tsx`; the panel is `ExAntePanel.tsx`. The engine is
  unchanged.

**Checked:** typecheck, test and build pass. The same 48 of 48 test cases. New tests cover the ends, the labels, the
cap note and the credited number.

**Open, for a ruling:** no floor is cited for litres, for days, or for the share of homes using the device. The
starting value for that share (100%) has no rulebook citation either. The tests list these four, so a change shows.

## 2026-10-30 — V2 The engine's types under Node's own module rules

**Done (open pull request, branch `engine-types-node`):**
- The engine's own files now import each other with file endings (`./quantity.js`), and import data files with the
  JSON marker (`with { type: "json" }`). Eight files under `packages/calvin/src/calculators/`, import lines only.
- `scenario.ts`: the type for device classes is now named from the constant, not from the data file. Same type. This
  keeps the data file out of the built type files.
- `scripts/check-engine-entry.mjs` now also installs the built type files and typechecks a fresh project that uses
  Node's own module rules (`nodenext`), with the package's type files checked too. A small file there fails if any of
  the entry's 48 exports, or any function's inputs or result, falls back to "any". New tests cover this.
- `packages/calvin/src/reference-cases.ts` is now `test-cases.ts`, with its function and types renamed to match. It
  runs made-up test cases. "Reference cases" means real filings only.

**Checked:** clean typecheck, test and build pass. The same 48 of 48 in place, and 48 of 48 installed with no React.
Types of all 48 exports pass under Node's module rules. Before the change, the same fresh project failed with 10
errors (missing file endings, and a data file without the JSON marker).

## 2026-10-30 — M2.2 Engine entry: answers on the pull request

**Done (same branch, `add-engine-entry`):**
- Brought `main` in. Both sets of log entries are kept, newest first.
- Rulings are credited by date ("ruling 2026-10-27") in the lines this pull request adds to `BUILD_LOG.md`,
  `SEEDS.md` and `BUILD_PLAN.md`. `CLAUDE.md` now has this as a rule.
- One copy of the case-running steps: `packages/calvin/src/reference-cases.ts`, moved out of
  `prove-expected-outputs.test.ts`. That test, `test/engine-entry.test.mjs` and `scripts/check-engine-entry.mjs` all use
  it. The file is left out of the build.
- Gold Standard file and constant names stay as they are. They name the standard, not a partner.

**Checked:** clean typecheck, test and build pass. The same 48 of 48 in place, and 48 of 48 installed with no React.
Seed check 65 of 65 at the seed commit. Paid-code scan: no finding.

## 2026-10-30 — Road to v1: how D-3 is checked (plan only)

**Done (same branch, `road-to-v1`):**
- `BUILD_PLAN.md`: the VWBA 2.0 guidebook has no worked example for D-3. So V8, the finish line and the M8 stop now
  say: D-3 is tested on hand-worked cases, with every step cited to the guidebook (cited, not copied). An outside
  expert checks it once the prototype is up. The plan does not name the expert.
- V8 now also says: the VWBA spec is written alongside the build, in `docs/`, for the maintainer to review then.

**Open:** nothing for the maintainer in the plan itself. Nothing was built.

## 2026-10-30 — Road to v1, revised after the maintainer's answers (plan only)

**Done (same branch, `road-to-v1`):**
- `BUILD_PLAN.md`: the Road to v1 section now follows the maintainer's new finish line. It has 15 steps (V1 to V15).
- Sliders (V3) and the simple view (V4) are in v1, right after pull request #6. They follow the maintainer's description of
  them. Site pull request #156 lives in another repo and was not read here.
- No npm in v1. Each release is a GitHub release with the packed package and its fingerprint, which both sites pin
  (V5, V15). The first pinned version has the sliders. npm is v2.
- Violet, the water-benefit agent, is her own module (V7). She hosts D-3 first (V8).
- The paid site keeps its own data on top of the package. The engine lists what came from a site's tables (V13).
- No question cap. Each module counts its questions on each walk (V9 to V12); the average is reported.
- The two open questions are dropped, as the maintainer said.

**Open:** nothing for the maintainer in the plan itself. Nothing was built.

## 2026-10-30 — Road to v1 (plan only)

**Done (open pull request, branch `road-to-v1`):**
- `BUILD_PLAN.md`: a "Road to v1" section. It lists, in order, only the work in this repo that the maintainer's v1 finish line
  needs (V1 to V11). Each step says what it waits on, in this repo and in others, and how we know it is done.
  Everything else is marked "after v1".
- The reference filings are named by kind only (household, community). No project names or places.

**Open:** two questions for the maintainer, listed at the end of the section. Nothing was built.

## 2026-10-27 — M2.2 Engine-only entry, React optional, version 0.1.0

**Done (open pull request, branch `add-engine-entry`):**
- `packages/calvin/src/engine.ts`: a new entry, `@waterbots/calvin/engine`. It passes on the calculator's math and
  data only: no React, no screens, no agent code, no `@waterbots/core`. Re-exports only; it computes nothing.
- The calvin build now also bundles that entry into one plain file, `dist/engine.js`, with the `rolldown` command
  (a bundler: it joins many files into one). `rolldown` 1.2.14 is now a pinned dev tool. It was already installed, as
  part of vitest.
- React is an optional peer of `calvin` and `core`. Anyone using only the engine need not install it.
- `calvin` and `core` are version 0.1.0. `phoebe` and `bridget` stay at 0.0.0: they are still empty. All four stay
  `private`. Nothing was published.
- Two checks, both run by `npm test`: `packages/calvin/test/engine-entry.test.mjs` (the entry imports only engine
  files, and gives the same 48 answers in place), and `scripts/check-engine-entry.mjs` with its own tests (builds the
  entry, installs it alone in a fresh folder with no React, and gets the same 48 answers there in plain Node).
- No seed file was edited. Everything is in new files, package manifests, READMEs and the lockfile.
- Ruling 2026-10-27: since the seed, Calvin's home is this repo. Later changes are made here by Session C, with no new seal
  or seed. `SEEDS.md`, `BUILD_PLAN.md`, the 2026-10-25 entry below and a comment in `packages/calvin/tsconfig.json` now
  say so.
- `scripts/check-seed.mjs` now reads the seed's files from the commit where the seed landed (`09f6ad1`, pull request
  #5), not from today's files. It checks that commit is in history, that its files match the list, and that the list
  is unchanged. Normal changes to seeded files are allowed, and counted. Its tests now use a throwaway git repo. The CI
  check job fetches full history so the commit can be read.

**Checked:** clean install, typecheck, test and build all pass. Seed check 65 of 65 at the seed commit. Paid-code scan:
no finding. Name scan: no finding. The engine entry: 48 of 48 in place, and 48 of 48 installed with no React.

**Open:** the entry's types work fully for projects that use a bundler's module rules. For projects that use Node's
own module rules, the entry's names are typed, but some deeper types fall back to "any". The cause is the seed's
import paths, which have no file endings. Session C fixes this here, in its own pull request.

## 2026-10-25 — M2.1 Add calculator module (the Calvin seed)

**Done (open pull request, branch `add-calculator-module`):**
- The Calvin seed, read from the handoff folder and installed into `packages/core` and `packages/calvin`. 65 of the
  seed's 67 listed files are installed and match their fingerprints. `README.md` and `MANIFEST.md` are not installed.
  Both packages stay private, version 0.0.0, unpublished.
- `SEEDS.md`: the ledger row (seal tag `calculator-seal-2026-10-25`, commit `c94ccc1`, 2026-10-25, the list's
  fingerprint), each check's result, and the known gaps.
- `seeds/calvin/carry-hashes.sha256`: the seed's own list, kept as it arrived. `scripts/check-seed.mjs` checks the
  installed files against it on every `npm test`.
- Two scans, with tests on invented inputs: `scripts/check-names.mjs` (finds the private list in place through the
  `WB_NAMES_LIST` variable, with no default path in the code; matches whole words, fails closed when the variable is
  unset or the list is missing, never prints a name; run by hand, not in CI) and `scripts/check-paid-code.mjs` (runs in
  `npm test`). `CLAUDE.md` Rule Zero now says the name scan may read the private list in place, and nothing else there.
- Six small files in `packages/calvin/src/modules/core/` pass the seed's shared imports on to `@waterbots/core`, so no
  seed file was edited. `.gitattributes` keeps seeded files' line endings as they are.
- `BUILD_PLAN.md`: linting moved from M1.6 to M2.3, after the seed.

**Checked:** fingerprints 67 of 67; the folder holds exactly the files `MANIFEST.md` lists; rights; both scans on the
seed (no finding); typecheck passes; the seed's own tests pass (13 files, 84 tests); the prove-the-numbers test passes
(48 of 48).

**Open:** the number gate and the copied-text check could not run here and rest on Session A's results (known gap).
Two extra typing checks are off for `calvin`: a known gap, to be fixed here by a normal pull request (corrected by
ruling 2026-10-27: Calvin's home is this repo, with no new seal or seed). No
reviewed-version ledger file came with the seed. Some comments in the seed use words the word rules restrict. All four
are in `SEEDS.md`.

## 2026-10-25 — Tidy paths and comments

**Done (open pull request, branch `tidy-paths-and-comments`):**
- Checked every tracked file, every file name, the git history and the pull request text against the maintainer's private list.
  The list stayed where it is and was not copied. Nothing needed changing.
- `CLAUDE.md`: two rules. Never write a person's folder path or Windows username into the repo. Pull request titles,
  commit messages and descriptions never name what is being removed.

**Checked:** counts only, no names. Whole-word matches found nothing in files, file names, history or pull requests.

## 2026-10-23 — Safety pass SP6 and the close-out rule

**Done (open pull request, branch `sp6-review-and-closeout`):**
- `BUILD_PLAN.md`: safety pass SP6 added — a human engineer reviews the structure of all three repos, now, not
  blocking. A "Code standards" note: strict typing is on from day one.
- `CLAUDE.md`: close-out rule — at each family close, tidy what you touched (dead code, stale notes, duplicate logic).

**Found:** linting is **not** set up. Only strict typing is on. Added plan item M1.6 for a linter; not built here.

---

## 2026-10-20 — M1.3 the maintainer's answers on the pull request

**Done (same branch, `m1-3-package-skeleton`):**
- Copyright line "Copyright 2026 WaterBots AI, LLC" in the root `LICENSE` and in every package's `LICENSE` and `NOTICE`.
- Node pinned to one exact version, 24.20.0, in `ci.yml`, `publish.yml` and the root `engines` field.
- `scripts/check-packages.mjs` now also checks the copyright line and the exact Node version.
- `BUILD_PLAN.md`: at the seed (M2.1), show the carried calculator builds and tests the same under these versions.

**Kept by the maintainer:** the `@waterbots` names (the scope is the maintainer's open step N13); the tools; `publish.yml` left alone, since
the `private` flag and the check are the lock.

## 2026-10-20 — M1.3 Package skeleton

**Done (open pull request, branch `m1-3-package-skeleton`):**
- Workspace root: `package.json` (private), `tsconfig.base.json`, `package-lock.json`. TypeScript 7.0.2, vitest 5.0.5
  and `@types/node` 26.6.5, pinned exactly.
- Four stub packages under `packages/`: `@waterbots/core`, `calvin`, `phoebe`, `bridget`. Each is marked `private` and
  version `0.0.0`, builds with `tsc`, has one trivial test, an Apache 2.0 `LICENSE` and `NOTICE`, and a README that says
  "empty for now — Calvin arrives by a one-time seed".
- `scripts/check-packages.mjs`, run by `npm test`: every package stays private, Apache-2.0, carries a copy of the root
  `LICENSE`, and says it is empty for now.
- The typecheck, test and build checks in CI now run for real.

**Checked locally:** clean `npm ci --ignore-scripts`, typecheck, test and build all pass. `npm publish --dry-run` skips
the packages as private. The guard fails when a package is made public.

**Open:** the real plug points in `core` (later pull request). The `NOTICE` files name no copyright holder; the maintainer to say
what they should carry.

---

## 2026-10-19 — M1.1 Fixes after the outside review

**Done (same branch, `m1-ci-guards`):**
- `lanes.yml`: the dormant lane 1 auto-merge job is removed. Labelling stays. The design is kept as plan item M1.5.
- `CLAUDE.md`: every merge line now agrees — the maintainer merges every pull request; lane 1 may auto-merge only after the maintainer
  switches it on. Added: until the real number gate exists, lane 3 covers figures and names. Added: no "validate"
  in code names either.
- `publish.yml`, `number-gate.yml`: comments brought in line.
- `BUILD_PLAN.md`: the maintainer's approval on every release (environment reviewer) and a `v*` tag rule are now
  blocked-until-the-maintainer items, due before the first release, with branch protection, the npm scope and `NPM_TOKEN`.

**Kept by the maintainer:** the broad local deny rule; quoting banned words inside the rules.

## 2026-10-19 — M1.1 the maintainer's answers on the pull request

**Done (same branch, `m1-ci-guards`):**
- `CLAUDE.md`: the word rules — "golden" banned (say "reference"); WaterBots never says it validates ("validate" and
  "validation" only when explaining what validation is and that external auditors do it); never call the site or a
  module a demo. No other words are banned.
- `BUILD_PLAN.md`: the maintainer's hand-steps (branch protection, npm scope, `NPM_TOKEN`) marked blocked until the maintainer, due before
  the first release (M2.2).

**Accepted by the maintainer as built:** the number gate placeholder passes with a warning; the package skeleton is its own pull
request (M1.3); TruffleHog is the second scanner; the `CLAUDE.md` commit is `Grant: open`.

## 2026-10-19 — M1.1 Guards and rules

**Done (open pull request, branch `m1-ci-guards`):**
- `CLAUDE.md`: who does what, hard rules, merge lanes, the grant line, plain-English copy.
- `.gitignore`, keeping `.claude/settings.local.json` (Session C's deny rules) out of the repo.
- Lane labelling (`.github/workflows/lanes.yml`) with the rule in `.github/lanes/lane-rule.mjs` and its tests.
  Lane 1 auto-merge is built and off, behind two switches.
- `ci.yml`: lane rule tests, plus typecheck, test and build that wait for code.
- `secrets.yml`: Gitleaks and TruffleHog on every pull request, every push to `main`, and weekly.
- `number-gate.yml`: placeholder; passes with a warning and checks nothing yet.
- `publish.yml`: publish with provenance on a `v*` tag; refuses until the scope, the token and packages exist.
- Every GitHub Action pinned by full commit hash; the TruffleHog scanner image pinned by digest.
- `BUILD_PLAN.md` and this log.

**Checked:** lane rule tests pass locally (Node 24). Secret scanning and push protection were already on.

**Open:** this pull request labels itself only once the lane job is on `main` (by design, see the PR). The real
number gate (M1.2). The package skeleton (M1.3). The maintainer's settings (M1.4). The banned-word list.

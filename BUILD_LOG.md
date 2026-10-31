# Build log

Newest first. One entry per pull request: what was done, what is still open. Never rewrite an old entry; add a new one.

---

## 2026-10-30 — Road to v1, revised after Amy's answers (plan only)

**Done (same branch, `road-to-v1`):**
- `BUILD_PLAN.md`: the Road to v1 section now follows Amy's new finish line. It has 15 steps (V1 to V15).
- Sliders (V3) and the simple view (V4) are in v1, right after pull request #6. They follow Amy's description of
  them. Site pull request #156 lives in another repo and was not read here.
- No npm in v1. Each release is a GitHub release with the packed package and its fingerprint, which both sites pin
  (V5, V15). The first pinned version has the sliders. npm is v2.
- Violet, the water-benefit agent, is her own module (V7). She hosts D-3 first (V8).
- The paid site keeps its own data on top of the package. The engine lists what came from a site's tables (V13).
- No question cap. Each module counts its questions on each walk (V9 to V12); the average is reported.
- The two open questions are dropped, as Amy said.

**Open:** nothing for Amy in the plan itself. Nothing was built.

## 2026-10-30 — Road to v1 (plan only)

**Done (open pull request, branch `road-to-v1`):**
- `BUILD_PLAN.md`: a "Road to v1" section. It lists, in order, only the work in this repo that Amy's v1 finish line
  needs (V1 to V11). Each step says what it waits on, in this repo and in others, and how we know it is done.
  Everything else is marked "after v1".
- The reference filings are named by kind only (household, community). No project names or places.

**Open:** two questions for Amy, listed at the end of the section. Nothing was built.

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
Two extra typing checks are off for `calvin`: a known gap, to be fixed at the source before a later seal. No
reviewed-version ledger file came with the seed. Some comments in the seed use words the word rules restrict. All four
are in `SEEDS.md`.

## 2026-10-25 — Tidy paths and comments

**Done (open pull request, branch `tidy-paths-and-comments`):**
- Checked every tracked file, every file name, the git history and the pull request text against Amy's private list.
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

## 2026-10-20 — M1.3 Amy's answers on the pull request

**Done (same branch, `m1-3-package-skeleton`):**
- Copyright line "Copyright 2026 WaterBots AI, LLC" in the root `LICENSE` and in every package's `LICENSE` and `NOTICE`.
- Node pinned to one exact version, 24.20.0, in `ci.yml`, `publish.yml` and the root `engines` field.
- `scripts/check-packages.mjs` now also checks the copyright line and the exact Node version.
- `BUILD_PLAN.md`: at the seed (M2.1), show the carried calculator builds and tests the same under these versions.

**Kept by Amy:** the `@waterbots` names (the scope is her open step N13); the tools; `publish.yml` left alone, since
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

**Open:** the real plug points in `core` (later pull request). The `NOTICE` files name no copyright holder; Amy to say
what they should carry.

---

## 2026-10-19 — M1.1 Fixes after the outside review

**Done (same branch, `m1-ci-guards`):**
- `lanes.yml`: the dormant lane 1 auto-merge job is removed. Labelling stays. The design is kept as plan item M1.5.
- `CLAUDE.md`: every merge line now agrees — Amy merges every pull request; lane 1 may auto-merge only after Amy
  switches it on. Added: until the real number gate exists, lane 3 covers figures and names. Added: no "validate"
  in code names either.
- `publish.yml`, `number-gate.yml`: comments brought in line.
- `BUILD_PLAN.md`: Amy's approval on every release (environment reviewer) and a `v*` tag rule are now
  blocked-until-Amy items, due before the first release, with branch protection, the npm scope and `NPM_TOKEN`.

**Kept by Amy:** the broad local deny rule; quoting banned words inside the rules.

## 2026-10-19 — M1.1 Amy's answers on the pull request

**Done (same branch, `m1-ci-guards`):**
- `CLAUDE.md`: the word rules — "golden" banned (say "reference"); WaterBots never says it validates ("validate" and
  "validation" only when explaining what validation is and that external auditors do it); never call the site or a
  module a demo. No other words are banned.
- `BUILD_PLAN.md`: Amy's hand-steps (branch protection, npm scope, `NPM_TOKEN`) marked blocked until Amy, due before
  the first release (M2.2).

**Accepted by Amy as built:** the number gate placeholder passes with a warning; the package skeleton is its own pull
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
number gate (M1.2). The package skeleton (M1.3). Amy's settings (M1.4). The banned-word list.

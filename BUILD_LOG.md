# Build log

Newest first. One entry per pull request: what was done, what is still open. Never rewrite an old entry; add a new one.

---

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

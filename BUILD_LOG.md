# Build log

Newest first. One entry per pull request: what was done, what is still open. Never rewrite an old entry; add a new one.

---

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

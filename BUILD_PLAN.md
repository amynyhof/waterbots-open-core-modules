# Build plan — the open core modules, steps M1 to M9

Each step is one coherent, testable thing Amy can check in one sitting and undo in one motion. Each step is a family;
its items are the pull requests or checks inside it. `[x]` done (merged), `[~]` open pull request, `[ ]` not started,
`[!]` blocked until Amy acts.

**Every engine change is published first as a release candidate** (a trial version). The private side installs it,
runs its real-filing tests, and reports back through Amy: pass or fail and the reference line, never a figure. Only
then is it released.

All of M1 to M9 is `Grant: open`. Edits to this plan and the build log are `Grant: neither`.

---

## M1 — Skeleton and guards, before any code

*Stop for Amy:* read the CI run. *Waits on:* the npm scope (N13) — for publishing only. Amy may revisit the number
gate's design before the real gate is built.

- [x] **M1.1 Guards and rules**
  - [x] `CLAUDE.md`: who does what, hard rules, merge lanes, the grant line, plain-English copy
  - [x] Session deny rules in `.claude/settings.local.json` (local, not committed)
  - [x] Lane labelling job (`lanes.yml`) and the lane rule with tests. It labels only; it never merges.
  - [x] Typecheck, test and build jobs (`ci.yml`) (they now run for real: see M1.3)
  - [x] Gitleaks and a second secrets scan (`secrets.yml`)
  - [x] Number gate placeholder (`number-gate.yml`)
  - [x] Publish with provenance on a tag (`publish.yml`), refusing until the scope is real
  - [x] This plan and the build log
- [ ] **M1.2 Real number gate:** keyed fingerprints (HMAC-SHA256); key and list as Actions secrets; a missing key
      fails the run. *Waits on:* Amy's go on the design (N2), then the private side's first fingerprint list.
- [~] **M1.3 Package skeleton** (open pull request): the empty boxes. No calculator code, no data.
  - [~] Workspace root with TypeScript, vitest and a build; versions pinned, lockfile committed; Node pinned to one
        exact version (24.20.0) in the workflows and `engines`
  - [~] Four stubs: `@waterbots/core`, `calvin`, `phoebe`, `bridget`. Each builds, has one trivial test, an Apache 2.0
        `LICENSE` and `NOTICE` (copyright line: WaterBots AI, LLC), and a README that says it is empty for now. All marked `private`: nothing goes to npm.
  - [~] `scripts/check-packages.mjs`, run by the test job: keeps every package private, licensed and empty-for-now
  - [~] The real plug points in `core` (`ModuleProject`, `StandardId`, `SaveOutcome`, the agent contract) and Calvin's
        folders arrive with the seed (M2.1). Design tokens and the base stylesheet are still to do, in their own pull
        request.
- **M1.4 Amy's hand-steps** — blocked until Amy; Session C cannot do these. **Due before the first release (M2.2).**
  - [!] Branch protection on `main`: a pull request before merging, every check required, no force pushes or
        deletions, applied to admins too. Can be done now; steps are in pull request #1.
  - [!] The npm scope: create the npm organisation or confirm Amy owns it (N13)
  - [!] The `NPM_TOKEN` Actions secret
  - [!] Amy as required reviewer on the `npm-publish` environment, so every release needs her approval
  - [!] A tag rule so only Amy can create `v*` tags
- [ ] **M1.5 Lane 1 auto-merge** — not built; the earlier dormant job was removed. Rebuild only when the real
      number gate (M1.2) exists and Amy says to switch it on. Design: lane 1 and not a draft → arm GitHub's
      auto-merge; any other lane → disarm it. Needs the branch protection above, or it would merge at once.
- [x] Secret scanning with push protection — already on in the repo settings.

## M2 — The seed lands

*Stop for Amy:* the private side confirms the package matches the seed. *Waits on:* the seed (Amy's one-time carry).

- [~] **M2.1** Seed arrives unchanged, with its reviewed-version ledger kept exactly as it arrives. Show that the
      carried calculator builds and tests the same under this repo's tool versions (TypeScript 7.0.2, vitest 5.0.5,
      Node 24.20.0), and say so in the pull request. (Open pull request. `SEEDS.md` records it. No ledger file came
      with the seed; see its known gaps.)
- [ ] **M2.2** Publish `0.1.0` with no changes to what arrived. *Blocked until* Amy's hand-steps in M1.4 are done.
- [ ] **M2.3 Linting** (was M1.6): add a linter that runs as part of CI, with the strictest settings that fit. Amy
      ruled on 2026-10-23 that it comes right after the seed lands (after M2.2), not before it. The seed is carried
      as it is first.

## M3 — The method registry (no look change)

*Waits on:* M2.

- [ ] **M3.1** Registry with one entry per method (carbon V1.0, carbon V2.0, the transition), each wrapping the
      engine's pure functions and the seed's `Calculator` interface
- [ ] **M3.2** Release candidate; private side reports pass or fail

## M4 — Openings and labels, one release candidate each

*Stop for Amy:* the numbers, before and after. *Waits on:* the rulings in the brief.

- [ ] **M4.1** Household opening (usage, labelled "starting point")
- [ ] **M4.2** Community opening and the operating-days cap, with its label
- [ ] **M4.3** The baseline-share label ("assumed; your baseline survey replaces it")
- [ ] **M4.4** The "days present" label for household systems

## M5 — The friendly view

*Stop for Amy:* pixels twice — the mockup, then the built page. *Waits on:* the captured image of today's paid page;
the litres check on the cap (N5). A step with no image yet has not started.

- [ ] **M5.1** Mockup from the captured image
- [ ] **M5.2** Built page; the litres slider's **default** and **cap** kept as two separate things

## M6 — The fuel-mix floor

*Stop for Amy:* before and after for a country with no survey. *Waits on:* a rights read of the WHO clean-fuel
indicator.

- [ ] **M6.1** Fuel-mix floor, labelled

## M7 — Diesel and grid factors

*Stop for Amy:* a worked pumped system. *Waits on:* the source document held, and a ruled grid-factor source.

- [ ] **M7.1** Diesel and grid factors

## M8 — The water-supply method (VWBA D-3)

*Stop for Amy:* the worked example reproduced. *Waits on:* the activity-type signature; any further gates (N6).
The first release does not wait for this.

- [ ] **M8.1** Water-supply method entry and engine
- [ ] **M8.2** The free site's water file brought in

## M9 — Phoebe and Bridget

*Waits on:* their own rulings. Bridget also needs a rights read on every data file and a ruling on the shared map key.

- [ ] **M9.1** Phoebe (eligibility) to its first release
- [ ] **M9.2** Bridget (the map) to its first release

---

## Safety passes

Amy's safety passes cover all three repos. This repo's own parts are listed here.

- [ ] **SP6 — Human engineer review of the structure**, covering all three repos. A human engineer reads how the
      repos are laid out and how they fit together, and reports. Do it now. It does **not** block any M step.

## Code standards

- **Strict typing is on from day one.** `tsconfig.base.json` sets `strict` plus extra checks (unchecked indexed
  access, exact optional properties, no implicit override, verbatim module syntax). Every package extends it, and the
  `typecheck` check must pass on every pull request.
- **Two of the extra checks are off for `calvin`.** The seed was typechecked with `strict` only. Unchecked indexed
  access and exact optional properties flag its code in 95 places, so `packages/calvin/tsconfig.json` leaves them
  off. `core` keeps them. Bringing the seed's code up to them is its own pull request (lane 3).
- **Linting is not set up yet.** Only strict typing is on today. Adding a linter is its own pull request (lane 3):
  plan item M2.3, right after the seed lands.

---

## Open questions

- **N2:** Amy may revisit the number gate's design before M1.2.
- **N4:** how the transition splits (not ruled). The recommendation: build the maths, not the checklist.
- **N5:** whether a higher litres cap applies with true meters — affects the cap only.
- **N6:** whether further gates stand on D-3.
- **N13:** the npm scope.

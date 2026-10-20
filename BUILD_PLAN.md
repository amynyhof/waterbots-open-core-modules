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

- [~] **M1.1 Guards and rules** (this pull request)
  - [~] `CLAUDE.md`: who does what, hard rules, merge lanes, the grant line, plain-English copy
  - [~] Session deny rules in `.claude/settings.local.json` (local, not committed)
  - [~] Lane labelling job (`lanes.yml`) and the lane rule with tests; lane 1 auto-merge built but off
  - [~] Typecheck, test and build jobs (`ci.yml`), ready for when code lands
  - [~] Gitleaks and a second secrets scan (`secrets.yml`)
  - [~] Number gate placeholder (`number-gate.yml`)
  - [~] Publish with provenance on a tag (`publish.yml`), refusing until the scope is real
  - [~] This plan and the build log
- [ ] **M1.2 Real number gate:** keyed fingerprints (HMAC-SHA256); key and list as Actions secrets; a missing key
      fails the run. *Waits on:* Amy's go on the design (N2), then the private side's first fingerprint list.
- [ ] **M1.3 Package skeleton:** root workspace, `packages/core` (the shared plug points: `ModuleProject`,
      `StandardId`, `SaveOutcome`, the agent contract, design tokens and base stylesheet), and stubs for `calvin`,
      `phoebe`, `bridget`. No calculator code.
- **M1.4 Amy's hand-steps** — blocked until Amy; Session C cannot do these. **Due before the first release (M2.2).**
  - [!] Branch protection on `main`, requiring every check (also needed before lane 1 auto-merge can ever be on)
  - [!] The npm scope: create the npm organisation or confirm Amy owns it (N13)
  - [!] The `NPM_TOKEN` Actions secret
  - [ ] Optional: Amy as required reviewer on the `npm-publish` environment, to approve each release
- [x] Secret scanning with push protection — already on in the repo settings.

## M2 — The seed lands

*Stop for Amy:* the private side confirms the package matches the seed. *Waits on:* the seed (Amy's one-time carry).

- [ ] **M2.1** Seed arrives unchanged, with its reviewed-version ledger kept exactly as it arrives
- [ ] **M2.2** Publish `0.1.0` with no changes to what arrived. *Blocked until* Amy's hand-steps in M1.4 are done.

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

## Open questions

- **N2:** Amy may revisit the number gate's design before M1.2.
- **N4:** how the transition splits (not ruled). The recommendation: build the maths, not the checklist.
- **N5:** whether a higher litres cap applies with true meters — affects the cap only.
- **N6:** whether further gates stand on D-3.
- **N13:** the npm scope.

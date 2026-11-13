# VWBA 2.0 D-3: the Volume Provided method in Violet

This is the spec for Violet's first method. The maintainer reviews it with the build (plan step V8).
VWBA is Volumetric Water Benefit Accounting. It is a way to count the water a project gives back.
D-3 is its Volume Provided method.

**The source.** *Volumetric Water Benefit Accounting 2.0*, World Resources Institute, 2025,
<https://doi.org/10.46830/wrigb.23.00112>. It is published under CC BY 4.0. We cite it by section and page.
We copy no text from it. Every summary below is in our own words.

## 1. What D-3 covers here

- Household and community water supply. Table C-1 points these projects to D-3 (Appendix C, p.39).
- **Not covered yet:** irrigation supply (Appendix D, Table D3.2, p.45), and rainwater harvesting. The guidebook
  works out rainwater harvesting with the Recharge method, D-4 (p.45).

## 2. The sum

1. **The benefit** is the water provided with the project, less the water the same supply gave without it
   (Appendix D, D-3, p.45).
2. **The water with the project** comes from one of three ways. The guidebook ranks them (p.45 to 46):
   1. **Meter readings.** Only after the project runs.
   2. **Capacity.** The system's design flow, or its expected average flow, times the hours it runs (p.46).
   3. **People served.** People with access × litres per person per day × days of access ÷ 1,000 (p.46).
3. **The capacity check.** With the people-served way, when the system's capacity is known, the engine uses the
   smaller of the two. This keeps the benefit from being overstated (p.46; Table D3.3, p.46).

## 3. Every input

Three kinds of value. **Project facts** come from the project record or the user, and are never guessed.
**Method defaults** are filled in from the guidebook. **Anticipated performance** starts at a value labelled
"assumed", for the user to set to their planned project.

| Input | Kind | Ex-ante (before the project runs) | Ex-post (after it runs) | Source |
|---|---|---|---|---|
| Water the supply gave before the project (m³ a year) | Project fact | Typed. Awaited until given. 0 for a new supply. | Typed | The record or the user |
| People served, and whether the count is people or households | Project fact | From the record | From the record | The record |
| People per household (households only) | Project fact | From the record | From the record | The record |
| Full or limited access | Project fact | Typed. It picks the default below. | Typed | The record or the user |
| Default litres per person per day | Method default | 20 for full access, 2 for limited access | Same | Appendix D, Table D3.3, p.46 |
| Litres per person per day used | Method default, or the user's own figure | The default, or a local figure with its source | The default, or a monitored figure | Appendix D, D-3, Option 3, p.46 |
| Days of access in a year | Anticipated performance | Slider. Full access starts at 365, labelled "assumed". Limited access has no default: awaited. | Typed, from monitoring | Appendix D, D-3, Option 3, p.46 |
| Flow of the system (m³ an hour) | Project fact | Typed | Typed | The record or the user |
| Hours the system runs in a year | Anticipated performance | Slider. No cited start: awaited until set. | Typed, from operating logs | Appendix D, D-3, Option 2, p.46 |
| Metered water for the year (m³) | Project fact | Not offered | Typed | Meter readings |

**Bounds.** Each slider runs from 0 (a starting point) to its ceiling: 365 days, or 8,760 hours (365 days × 24
hours). The default and the cap are kept as two separate values, even where they hold the same number.

**Above a cap** (ruling 2026-11-12). Ex-post, a typed value above a cap is kept as typed. The sum uses the cap.
A plain note says so. Ex-ante, a typed value past a slider's ceiling is held to the ceiling, as in Calvin.

**Conditions.** The engine lists them; the user confirms them. The water is free from contamination and meets
local quality standards for its use. The people counted have reasonable access (Appendix D, D-3, p.45). Each unit
of water is counted once (Step 3, p.21).

## 4. Where Violet works

- **Agent Commons.** Violet works alone. She asks the user for every value she needs. She never sends the user to
  another agent (ruling 2026-11-12).
- **The sites.** She reads the project record, never asks again for a fact it holds, and hands back to Wellington.
- **The screening.** The water calculator always shows. Carbon shows beside it only when Phoebe reads carbon as
  "likely" or "not enough known" (ruling 2026-10-01).

## 5. Water and carbon: open item N14

Whether one project may split its water between a carbon claim and a VWBA claim is open. A group of outside
professionals will rule (ruling 2026-11-12). Until then the two calculators sit side by side and are never added
together. Nothing in Violet adds a water figure to a carbon figure.

What each side says, in our own words, for the group to read in full:

- **Gold Standard.** *Gold Standard for the Global Goals, Principles & Requirements*, version 2.1, section 3.1.1(c),
  p.6. To avoid double counting, a project may not also sit in another voluntary or compliance programme unless
  Gold Standard approves it, for example through dual certification. Where a project's area overlaps another
  programme of a similar kind, the project must show at design and at performance certification that no impact is
  counted twice.
- **VWBA 2.0.**
  - Step 3, foundational principles, p.21. One volume of water may bring more than one benefit. But each unit of
    volume is counted only once.
  - Step 4.2, p.24. Where the way to attribute a benefit is unclear, for example in voluntary markets or with
    credit-based products, the guidebook lists traits to look for before claiming: intention, additionality and
    permanence.
  - Appendix B, project selection, p.35. A project may bring benefits beyond water volume, carbon among them. Each
    may need its own tracking.

## 6. How D-3 is checked

- No worked example for D-3 is confirmed in the guidebook (ruling 2026-11-12).
- So the tests are **hand-worked cases on invented projects**. Each one writes its working beside it, with the
  page for each step. They are in `packages/violet/src/d3/compute.test.ts`.
- An **outside expert** checks the cases once the prototype is up.

## 7. Open for the maintainer

- **Hours the system runs.** The guidebook gives no starting value. The slider starts empty, as awaited, rather
  than at a number we would have to make up.

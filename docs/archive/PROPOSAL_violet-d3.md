# Proposal: Violet's first module, VWBA 2.0 D-3

Status: archived 2026-11-13. Kept as it stood before the build; the rulings that followed are in `BUILD_LOG.md`. The build is pull request #18.
First written 2026-11-12. Updated the same day with the rulings of 2026-11-12.

Violet is the water-benefit agent. Her colour is Orchid (`#A457D4`) (ruling 2026-10-31).
VWBA is Volumetric Water Benefit Accounting. It is a way to count the water a project gives back.
D-3 is the water-supply method in the VWBA 2.0 guidebook. Violet hosts it first (plan steps V7 and V8).

**One gap is left.** The VWBA 2.0 guidebook is not here yet. So every source cell below that says "to fill" stays
empty until I can read it. I wrote no figure from the guidebook.

---

## 1. The check

No worked example for D-3 is confirmed (ruling 2026-11-12). This matches the plan (V8 and M8).

So the check is:

1. **Test cases worked by hand.** Each one is an invented project. Each step of the sum is cited to the guidebook:
   section and page. No passage is copied.
2. **An outside expert** checks those cases once the prototype is up.

The cases hold no real project figure. They live in the tests, beside the engine.

---

## 2. Where the guidebook goes

The maintainer places the VWBA 2.0 PDF in a local folder that git ignores (ruling 2026-11-12). It never enters
the repo.

**The folder to use:**

```
%USERPROFILE%\GitHub\waterbots-open-core-modules\sources-local\
```

That is a folder named `sources-local` at the top of this repo, beside `BUILD_PLAN.md`. Any file name inside it is
fine.

**Before the PDF goes in, git must ignore that folder.** Today nothing ignores it. There are two ways:

- **A.** I add one line, `sources-local/`, to `.gitignore`. That is a committed change, so it goes in a small pull
  request. It is lane 3, because `.gitignore` is on no lane-1 or lane-2 list.
- **B.** I add the same line to `.git/info/exclude`. That file stays on this machine and is never committed.
  It works today, with no pull request. But a fresh copy of the repo would not ignore the folder.

I suggest **both**: B now, so the PDF can go in safely today; A in the first Violet pull request, so the rule is
written down for everyone.

When I read the guidebook, I only read it. I copy no text into the repo. I write section and page, and our own
words.

---

## 3. How it is built (like Calvin)

- **One engine.** The engine does every sum. The screen computes nothing (hard rule 6).
- **Every value is cited**: document, section, page.
- **Speech and wording** follow the existing agent rules on speech, plain words and citations (ruling 2026-11-12).
  Violet cites section and page and says it in our own words.
- **Two views**, as in Calvin:
  - **Ex-ante** (before the project runs): sliders for anticipated performance. Each slider sits between a cited
    floor and a cited ceiling, or a floor and ceiling labelled "starting point" if no source gives one. Each has a
    pencil to type an exact value. The number shown is the engine's.
  - **Ex-post** (after the project runs): typed boxes for monitoring data. No sliders.
- **A value above a method cap, in ex-post** (ruling 2026-11-12):
  - Violet keeps what the user typed. It is shown as typed.
  - The engine calculates with the cap, not the typed value.
  - A plain note beside the value says the cap was applied. For example: "You entered more than the method's cap.
    The cap is used in the sum."
  - The engine returns the note, so the screen computes nothing.
- **The default and the cap stay two separate things**, in code and on screen. This matters most for litres per
  person per day.
- **Package:** `@waterbots/violet`, with a folder for each D-n module. D-3 is the first.
- **The VWBA spec** is written alongside the build, in `docs/`, for the maintainer to review (V8).

### The three kinds of value

- **Project facts.** The user gives them at intake. Wellington collects them. Until then, the field shows
  "awaiting user project input". Never guessed.
- **Method defaults.** At screening, the site fills them in from a cited source, chosen by the project facts.
- **Anticipated performance.** Starts at a labelled "assumed" value. Violet asks the user to set it to their
  planned project.

### The inputs

This is the list I expect D-3 to need. **It is a draft.** I will check it against the guidebook before it is
final. The method may name inputs I have not listed, or not use some I have.

| Input | Kind | Ex-ante | Ex-post | Source |
|---|---|---|---|---|
| People served | Project fact | From the record | Typed, from monitoring | The project record (`population.served`) |
| Count mode: people or households | Project fact | From the record | From the record | The project record (`population.mode`) |
| People per household | Project fact, or method default if the record has none | From the record, else default | From the record | Record; default source to fill |
| Country and region | Project fact | From the record | From the record | The project record |
| Water supplied before the project (the baseline) | Project fact | From the record, else "awaiting user project input" | Typed, from a baseline survey | Record. Guidebook rule for the baseline: section and page to fill |
| Litres per person per day: the **default** | Method default | Shown as the default | Not used: the measured value replaces it | Guidebook, or a source it names: to fill |
| Litres per person per day: the **cap** | Method default | The slider's ceiling | A typed value above it is kept, the cap is used, and a note says so | Guidebook: to fill. If none, labelled "starting point" |
| Litres per person per day: planned | Anticipated performance | "Assumed" slider, default to cap | Typed, from meter or survey | Assumed. The user sets it |
| Days of supply per year | Anticipated performance | "Assumed" slider | Typed, from operating logs | Guidebook: to fill |
| Share of time the system works (uptime) | Anticipated performance | "Assumed" slider | Typed, from monitoring | Guidebook: to fill |
| Share of people who use it | Anticipated performance | "Assumed" slider | Typed, from a user survey | Guidebook: to fill |
| Water lost before it reaches people | Method default or anticipated performance | To decide from the guidebook | Typed, from meters | Guidebook: to fill |
| Years the benefit is counted | Method default | Shown | Shown | Guidebook: to fill |
| Reporting period | Project fact | Not used | Typed | The project record |

Output: the volume of water benefit, in cubic metres per year, with each step of the sum shown and cited.

---

## 4. Doors: where Violet works

- **In the Agent Commons.** This door is part of this module (ruling 2026-11-12). Violet works alone there. She
  asks the user for everything she needs: the project facts as well as the performance values. She never points
  the user to another agent. Her agent files sit in the package, as Calvin's do: a config, a prompt, her
  knowledge notes, and her calculator tools. The tools call the engine; Violet does no sums herself.
- **On the sites.** Violet reads the project record. She does not ask again for a fact the record holds. When she
  is done, she hands back to Wellington.
- **On the screening.** The water calculator always shows. The carbon calculator shows beside it only when Phoebe
  reads carbon as "likely" or "not enough known" (ruling 2026-10-01).

---

## 5. Stacking: one project, two claims

**Open. Not decided here.**

The question: can one project split its water between two claims? Carbon would claim up to its per-person cap.
VWBA would claim only the water above that cap.

This goes to a group of outside professionals that the maintainer will bring together (ruling 2026-11-12).

**Until it is ruled:** the two calculators sit side by side. Their results are never added together. No screen,
report or engine call gives a total of the two.

**To log as a V1 open item.** The plan's open questions run N2 to N13 today. I propose this line, to add to the
open questions in `BUILD_PLAN.md` in the next plan pull request:

> **N14 (V1):** whether one project may split its water between a carbon claim (up to the per-person cap) and a
> VWBA claim (only the water above it). A group of outside professionals will rule. Until then, the two
> calculators sit side by side and are never added together.

For the group, I will give section and page for what each programme says, in our own words, once I have read
them:

- **Gold Standard.** The Gold Standard for the Global Goals *Principles & Requirements*, in its eligibility
  section. A public search shows it limits a project that is also in another voluntary or compliance programme
  unless Gold Standard approves it. The current version and its page are to fill. The SDWS methodology may have its
  own rule. Section and page to fill.
  [Principles & Requirements, an older public copy](https://dev-globalgoals.goldstandard.org/standards/101_V1.1_PAR_Principles-Requirements.pdf)
- **VWBA 2.0.** The guidebook's part on claims, and on counting the same benefit twice. Section and page to fill.
  [VWBA 2.0, WRI, 2025, doi 10.46830/wrigb.23.00112](https://doi.org/10.46830/wrigb.23.00112)

---

## 6. Source documents

| Document | Needed for | Have it? |
|---|---|---|
| VWBA 2.0 guidebook (WRI, 2025, 72 pages) | D-3 method, every input, the claims rule | Not yet. The maintainer places it in `sources-local\`. |
| VWBA 1.0 (WRI, 2019) | Only if VWBA 2.0 points back to it for D-3 | No. Only if needed. |
| Any table or source VWBA 2.0 names for D-3 defaults (for example, litres per person per day) | Method defaults | No. I will know which ones after I read the guidebook. |
| Gold Standard *Principles & Requirements*, current version | The stacking note for the outside group | No |
| Gold Standard SDWS methodology, V2.0 | The carbon side of stacking, and the per-person cap | Calvin already cites it. I do not have the document itself here. |

---

## Rulings of 2026-11-12, in short

1. No D-3 worked example is confirmed. Hand-worked cases, every step cited; then an outside expert.
2. The guidebook goes in a git-ignored local folder. It never enters the repo.
3. Follow the existing agent rules on speech, plain words and citations. Cite section and page; own words.
4. Stacking goes to an outside group. A V1 open item. Side by side, never added, until ruled.
5. Carbon shows beside water only when Phoebe reads carbon as "likely" or "not enough known" (ruling 2026-10-01).
6. Violet's Agent Commons door is part of this module.
7. Ex-post above a cap: keep the typed value, calculate with the cap, show a plain note.

## Still needed from the maintainer

1. **The ignore line.** May I add `sources-local/` to `.git/info/exclude` now, and to `.gitignore` in the first
   Violet pull request? The PDF should not go in until one of them is in place.
2. **The PDF itself**, in `sources-local\`. Then I read it and fill every "to fill" cell above.

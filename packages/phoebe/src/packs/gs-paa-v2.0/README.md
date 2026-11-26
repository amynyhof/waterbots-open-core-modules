# gs-paa-v2.0 — Phoebe's second Knowledge Pack

**Version 0.8.1. Not live.** This folder is the home of what Phoebe will know
about eligibility under Gold Standard's safe-drinking-water carbon methodology, the
Paris-aligned version. **Nothing on the live site reads it yet**, no card is approved,
and Phoebe still says that carbon eligibility is coming and not live. Item K7 in
[BUILD_LOG.md](../../../BUILD_LOG.md); the maintainer's rulings of 22 Sep 2026 on the
proposal.

**Second pack in the new shape**, beside [`vwba-2.0/`](../vwba-2.0/). One seat now holds
two packs; the shape is the one ruled on 17 Sep 2026 and written in the
[tree README](../../README.md). Nothing from the water pack is folded in here, and
nothing from here is folded into it.

## What she will know

Three card sets, drafted one at a time for the maintainer's grade, and read by the site
only once approved:

| Set | What it is | Cards | State |
|---|---|---|---|
| Routes | One cited fix per common gap: nineteen routes resting on the methodology, the documents it names as binding, or a held published project. A route hangs on a Fixable row; never a promise. | 19 | **Approved 23 Sep 2026**, in [`cards/routes-cards-gs.md`](./cards/routes-cards-gs.md); read by nothing until the routes reader is built (proposal step 5) |
| Applies | Whether this pathway is in play for a project at all. Four questions: safe water from a low-emission technology; boiling or going without today; one of four technology classes; which version. Never a verdict; each "no" is sorted into Fixable, Unknown or Blocked. | 4 | **Approved 23 Sep 2026**, in [`cards/applies-cards-gs.md`](./cards/applies-cards-gs.md); read by nothing until the pack-keyed reader (proposal step 5) |
| Eligibility | One card per basic eligibility requirement, one worksheet row each: seventeen from the methodology's own gate, two from the Paris-alignment framework, thirteen from the rules for every Gold Standard project. Each with a **Can it be fixed?** line; a miss is Fixable, Unknown or Blocked. | 32 | **All 32 approved 23 Sep 2026**, in [`cards/eligibility-cards-gs.md`](./cards/eligibility-cards-gs.md), each with a Phase line; read by nothing until the pack-keyed reader (proposal step 5) |

Every card is a rewrite in plain words. No sentence is copied from a source. Every card
carries the four-part citation (from CITATIONS.md, retired in #192) and the
publisher's canonical link, so each one stands alone. Where a card rests on a table of
figures it says so and sends the reader to the link.

## What she will help with

- **Whether the carbon pathway is in play for a project**, from the standard's own scope
  words, said with the reason when it is not.
- **Whether a safe-water project can enter Gold Standard's methodology**, row by row,
  only the rows its technology class and version open. Every "not yet" arrives with a
  route forward.
- **One verdict per pathway.** A project may qualify as a water benefit and not as a
  carbon project, or the other way round. "Eligible" from her never means eligible
  everywhere.

## What she does not cover

- **Working a number out.** That is the Quantify step, and it is Calvin's. His two
  carbon method packs cite the same methodology page for its arithmetic; this pack
  cites it for its gate. Each stands alone.
- **The map.** That is the Partners step, and it is Bridget's.
- **Any Gold Standard methodology but this one**, and any programme of activities.
- **What happens at Gold Standard's review stages**: listing, the auditor's checks,
  design review, performance review, issuance.
- **The Core Carbon Principles label.** Optional, and its requirements list no
  safe-water methodology.
- **Whether any credit was issued or verified.** Nothing here says so.
- **Anything without a card.** She says she does not have a card for it, and each miss
  is written down for the maintainer to read.

## Route cards to draft after v1

**Logged 24 Sep 2026, when the tool file was written.** Three cards describe a fix that a
route card would carry, and no route card carries it. The tool file names no route on those
rows rather than inventing an id or pointing at prose, and says so in a comment on each.
**Nothing here changes a card**: the card sets are sealed at their versions of 23 Sep 2026,
and a route card is an addition to the routes set, not an edit to these three.

| Row | The fix the card describes | Where the card rests it |
|---|---|---|
| T1 | Change a pump on its own fossil-fuel engine for a handpump, a solar pump or a grid pump | V2.0 §3.2.1.1 b and §3.2.1.2, p. 9 |
| M2 | The same change of drive, seen from the eligibility row | V2.0 §3.2.1.2, p. 9 |
| M14 | A justified sub-national area for the common-practice test, or a change of design | V2.0 §6.7.3, p. 23 |

**After v1**, with the other parked work in [BUILD_PLAN.md](../../../BUILD_PLAN.md). Two of the
three are one fix seen twice, so the drafting is likely two cards, not three. Until they exist,
a project that hits one of these hears the fix in the card's own words with no route to render.

## Timing facts the standard fixes

Carried here as facts, not rows, because they set the calendar rather than decide entry.

- **Crediting period:** five years, renewable twice, fifteen in all, never beyond the
  technology's technical life unless replacement measures are in place. GS4GG PAA
  M400-12 V2.0, Table 1, p. 5; §17.1.1, p. 79. Community Services Activity Requirements
  v1.2 §4.1.5, p. 6, says the same fifteen.
- **Start date:** for distributed household and institutional units, the first day of use
  by an end-user; for community systems, the day supply begins subject to the first
  water-quality check. V2.0, Table 1, p. 5. Principles & Requirements v2.1 §4.1.41,
  pp. 14–15, agrees for distributed technologies.
- **Certification cycle:** five years, renewable; the auditor's check within two years of
  listing; the first performance check within two years of implementation or design
  certification, whichever is later. Principles & Requirements v2.1 §5.1.1, p. 19.
- **Retroactive crediting:** at most two years before design certification. Principles &
  Requirements v2.1 §5.1.37, p. 27.
- **The sunset:** a new project submitted for preliminary review after 30 June 2026 uses a
  Paris-aligned methodology; credits dated 2026 or later issue only after PA-alignment.
  Requirements for Paris Agreement Alignment PR100-01 v1.1 §3.1.1, p. 5; §4.1.1, p. 6.
- **Entry into force of V2.0:** ninety days after publication. V2.0 §3.3.1, p. 13.

## Folder

| | |
|---|---|
| [`cards/`](./cards/) | All three card sets approved — applies, all 32 eligibility cards, and the nineteen routes — with the grader notes. None is read by the site yet. |
| [`tool/`](./tool/) | **[`eligibility-worksheet.yaml`](./tool/eligibility-worksheet.yaml) is this pack's section of the tool, and its one home** (24 Sep 2026): all thirty-six rows, what each takes, where its value comes from, which card it cites, which routes it may name and which projects it exists for. [`README.md`](./tool/README.md) names the worksheet section and its reader-to-be. No code. No agent-facing region yet; one arrives with Phoebe's runtime step. |
| [`evals/`](./evals/) | No exam has been sat. Says so. |
| `README.md` | This page. |
| [`CHANGELOG.md`](./CHANGELOG.md) | This pack's own version history. |

## Cited documents

One table, so a card names its section and page and points here for the rest. Every
Gold Standard page below, twelve pages for fourteen documents, resolved on 22 Sep 2026
and named the version held; the three WHO and JMP pages are still to be confirmed, as
the last table says. No PDF body
text is kept here; the source PDFs stay in `sources-local/`, gitignored, never published.
No endorsement is implied.

### The methodology, both versions, and its product rules

| Document | Version | Link |
|---|---|---|
| *Emission Reductions from Safe Drinking Water Supply*, GS4GG PAA M400-12 | Version 2.0, 9 July 2026 on the cover; the page headers and the publisher's page say 7 July 2026. In force ninety days after publication. | https://globalgoals.goldstandard.org/429-ee-sws-emission-reductions-from-safe-drinking-water-supply/ |
| *Supplementary Information* to the above | Its own "Version 1.0", 9 July 2026. The methodology governs where they differ. | same page |
| *Methodology for Emission Reductions from Safe Drinking Water Supply* (the legacy version a transitioning project came in on) | Version 1.0, 3 May 2021 | same page |
| *GHG Emissions Reduction & Sequestration Product Requirements* | Version 3.2, 12 December 2025 | https://globalgoals.goldstandard.org/501-pr-ghg-emissions-reductions-sequestration/ |

### The Paris-alignment framework

| Document | Version | Link |
|---|---|---|
| *Requirements for Paris Agreement Alignment*, PR100-01 | Version 1.1, 2 February 2026, effective 1 January 2026 | https://globalgoals.goldstandard.org/119_paa_pr_100-01 |
| *PAA Validation and Verification Requirements for Methodologies Update*, VVS100-01 (its Annex 5 is the safe-water transition matrix) | Version 2.0, 10 July 2026 | https://globalgoals.goldstandard.org/120_paa-vvs100-01-paa-validation-and-verification-requirements-for-methodologies-update/ |
| *Requirements for Additionality Demonstration* | Version 1.0, 24 April 2025 | https://globalgoals.goldstandard.org/447-requirements-for-additionality-demonstration/ |
| *Community Services Activity Requirements* | Version 1.2, effective 24 October 2019 | https://globalgoals.goldstandard.org/201-ar-community-services-activity-requirements/ |

### The rules for every Gold Standard project

| Document | Version | Link |
|---|---|---|
| *Principles & Requirements* | Version 2.1, 31 January 2025, effective 5 December 2024 | https://globalgoals.goldstandard.org/101-par-principles-requirements/ |
| *Safeguarding Principles & Requirements* | Version 2.1, 29 June 2023 | https://globalgoals.goldstandard.org/103-par-safeguarding-principles-requirements/ |
| *Stakeholder Consultation and Engagement Requirements* | Version 2.1, 14 June 2022 | https://globalgoals.goldstandard.org/102-par-stakeholder-consultation-requirements/ |
| *Gender Equality Requirements & Guidelines* | Version 2.0, 16 May 2023 | https://globalgoals.goldstandard.org/104-par-gender-equality-requirements-and-guidelines/ |
| *Requirements for Selection of Monitoring Indicators in the SDG Impact Tool* | Version 1.0, 18 October 2025 | https://globalgoals.goldstandard.org/118_par_requirements-for-monitoring-indicator-selection/ |
| *Programme of Activity Requirements and Procedures* (only if a project is a programme; no row) | Version 3.0, 12 November 2024 | https://globalgoals.goldstandard.org/107-par-programme-of-activity-requirements/ |

### Standards the methodology hands conditions to

| Standard | Edition the methodology points at | Link |
|---|---|---|
| WHO *Guidelines for Drinking-water Quality*, fourth edition | 2017 (first addendum) for the collection-point table; 2022 (first and second addenda) named in V2.0; the latest edition is the 2026 third addendum | https://www.who.int/publications/i/item/9789240045064 |
| WHO *International Scheme to Evaluate Household Water Treatment Technologies* | Results of Rounds III and IV, published 18 March 2026 (the local copy's file was created February 2026) | https://www.who.int/publications/i/item/9789240112124 |
| WHO/UNICEF JMP *Core questions on water, sanitation and hygiene for household surveys* | 2018 update | https://washdata.org/reports/jmp-2018-core-questions-household-surveys |

The three WHO and JMP pages were confirmed on the publishers' sites on 23 Sep 2026, the
maintainer's condition on the M1–M17 grade, before those cards moved in.

## One thing kept straight with Calvin's packs

Calvin's `gs-sdws-paa-v2` pack cites the same methodology as "Version 2.0, 9 July 2026
(cover date)". This pack says the same and notes the two-day discrepancy with the page
headers once, above, so the two packs never disagree about the document they share.

# vwba-2.0 — Phoebe's Knowledge Pack

**Version 0.12.1.** This folder is the one home of what Phoebe knows about the
water pathway (corrected 22 Sep 2026; see the CHANGELOG). Her carbon pathway has
its own folder beside this one, [`../gs-paa-v2.0/`](../gs-paa-v2.0/), a scaffold,
not live. The card files live in [`cards/`](./cards/), and everything on the live
site that reads them reads them from here. Maintainer's ruling, 17 Sep 2026.

## What she knows

Four card sets, drawn from one document, *Volumetric Water Benefit
Accounting 2.0*, and one real published project:

| Set | Source | Cards | File |
|---|---|---|---|
| Eligibility | Appendix A | Six criteria. All must be met. Approved 21 Aug 2026. From 23 Sep 2026 each card carries a **Can it be fixed?** line — five *yes*, one *depends* (criterion 4) — the only place the word Blocked can come from. | [`cards/eligibility-cards-vwba.md`](./cards/eligibility-cards-vwba.md) |
| Feasibility | Appendix B | Ten considerations. Guidance, never a gate. Approved 21 Aug 2026. | [`cards/feasibility-cards-vwba.md`](./cards/feasibility-cards-vwba.md) |
| Routes | Figure 3, Steps 1, 3 and 4, Appendices A, C, D and E; and the Meta 2023 volumetric water benefits report | Nine cited fixes, one per common gap. A route hangs on a Fixable row; never a promise. Approved 23 Sep 2026. **Not read by anything until the routes reader is built** (item A18). | [`cards/routes-cards-vwba.md`](./cards/routes-cards-vwba.md) |
| Applies | Glossary; Appendix A criterion 1; Appendix C, Table C-1; Step 3 | Two questions that say whether the water pathway is in play; never a verdict; each "no" sorted into Fixable, Unknown or Blocked. Approved 23 Sep 2026. **Not read by anything until the pack-keyed reader is built** (item K7). | [`cards/applies-cards-vwba.md`](./cards/applies-cards-vwba.md) |

Every card is a rewrite in plain words. No sentence is copied from the source.
Every card carries the four-part citation (from CITATIONS.md, retired in #192)
and the publisher's canonical link, so each one stands alone.

## What she helps with

- **Whether a project can count a volumetric water benefit.** The six criteria are
  a hard gate: miss one and the project is not eligible. Every "not yet" arrives
  with a route forward, in the words of the card.
- **How to weigh a project that already passes.** The ten considerations help a
  visitor choose well between eligible projects. None of them is a bar to entry,
  and they carry no ranking. Weighing them is the visitor's job.
- **Reading the project record against the cards.** She sees the visit record
  with every ask, and her verdicts come back to her row in the record.

## What she does not cover

- **Working a number out.** That is the Quantify step, and it is Calvin's.
- **The map.** That is the Partners step, and it is Bridget's.
- **Any standard other than VWBA 2.0.** Gold Standard's safe-water methodology
  has its own eligibility pack beside this one, [`../gs-paa-v2.0/`](../gs-paa-v2.0/),
  a scaffold with no approved card; its arithmetic lives in Calvin's packs. Until
  that pack is live she checks nothing carbon and says so (corrected 22 Sep 2026;
  see the CHANGELOG).
- **The activity table (Appendix C) and the glossary.** Drafted, not approved,
  not read. Draft card files stay untracked until the maintainer approves them.
- **Whether a benefit was delivered or verified.** Nothing here says so.
- **Anything without a card.** She says she does not have a card for it. That is
  an answer, and each miss is written down for the maintainer to read. The
  rule for a question no source covers is agent rule 9 in [AGENT_RULES.md](../../../AGENT_RULES.md).

## Folder

| | |
|---|---|
| [`cards/`](./cards/) | The two card sets. The live site reads these files. From 20 Sep 2026 [`cards/grader-notes.md`](./cards/grader-notes.md) sits beside them: the notes to the maintainer that used to sit at the foot of each card file, moved out whole so Phoebe does not read them as knowledge. Nothing reads it. |
| [`tool/`](./tool/) | **[`eligibility-worksheet.yaml`](./tool/eligibility-worksheet.yaml) is this pack's section of the tool, and its one home** (24 Sep 2026): every row, what it takes, where its value comes from, which card it cites and which routes it may name. [`README.md`](./tool/README.md) names the checklist and its live reader and carries the agent-facing region her prompt embeds; that region stays until Phoebe's runtime step reads the file instead, and then it retires. No code lives here. |
| [`evals/`](./evals/) | No exam has been sat. Says so. |
| `README.md` | This page. |
| [`CHANGELOG.md`](./CHANGELOG.md) | This pack's own version history. |

## Cited document

| | |
|---|---|
| **Document** | *Volumetric Water Benefit Accounting 2.0* |
| **Version** | Version 1, September 2025 |
| **Sections** | Appendix A, "Project eligibility criteria" (six criteria) · Appendix B, "Project selection considerations" (ten considerations) |
| **Link** | https://doi.org/10.46830/wrigb.23.00112 |

Publisher: World Resources Institute, with LimnoTech, Bluerisk, and Bonneville
Environmental Foundation. CC BY 4.0. No endorsement is implied.

No PDF body text is kept here. The source PDF stays in `sources-local/`, which is
gitignored and never publishes.

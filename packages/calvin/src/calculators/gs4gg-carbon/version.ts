/**
 * The gs4gg-carbon calculator version — owned by the engine, re-exported by the agent tools and
 * printed on every report. Bumped on any change to math or defaults (calculators/README.md), with
 * the reference suite re-run and the delta shown in the PR.
 *
 *   0.1.0  first release (legacy V1.0 + PAA v2.0 stepwise baseline)
 *   0.2.0  2026-09-21 — PAA market leakage: Option 1 default (V2 §9.3.2, Eq. 20) made explicit;
 *          answers the reviewer's comment 1.6 ([#208], [#209])
 *   0.3.0  2026-09-21 — PAA embodied emissions (V2 §9.2, Table 10, Eq. 17–19) as an explicit input,
 *          a warning when absent; answers comment 1.7
 *   0.4.0  2026-09-21 — Method 2 done as Method 2: Eq.4's Q_m cap is Method 1 only; Eq.7's device
 *          term runs when capacity is entered (t_p default 5 h, DN_p assumed 1, both noted) and its
 *          absence is stated; the seat passes the household count as N_p and seeds the rulebooks'
 *          4 L/p/d default instead of an uncited value; answers comments 1.1–1.4, 1.11
 *   0.5.0  2026-09-21 — V2 Table 9 age tiers on household runs (§7.3.11, SDWS 29 Option 1) weighted
 *          by census age shares from the UN WPP 2024 single-age file (exact 18/19 boundary); the
 *          suppressed-demand ×0.95 in one place; Amy's ruling R4, [#24]; answers comment 1.5
 *   0.6.0  2026-09-21 — the charcoal guard ([#213]): V2's charcoal factors (SDWS 9 p.51 / SDWS 10
 *          p.52) in a cited data file; a v2.0 run refuses a charcoal entry that names no V2 convention
 *          or carries V1's 165.22 / 44.83; presets resolve charcoal per version
 *   0.7.0  2026-09-21 — the legacy fNRB comparator (Amy's ruling R1): a saved project's filed V1
 *          value, else fNRB held equal to the V2 value on both sides and said so; the workbook's
 *          leftover value retired and never called a default again; answers comments 1.9 / 2.1
 *   0.8.0  2026-09-21 — the fNRB rule update as its own report line (Amy's amended R1): legacy ER at
 *          the filed V1 value versus legacy ER at the current standardised value, kept apart from the
 *          methodology transition, which now holds fNRB equal on both sides and has no fNRB step;
 *          null with the reason when nothing is filed; the year and citation read from the data file
 *   0.9.0  2026-09-22 — the official fNRB source (Amy's rulings (2) and (4), 2026-09-21): national
 *          defaults cited to A6.4-AMT-009 v01.0 Table 3, with CDM TOOL33 v03.0 (EB 125, 12 June 2025)
 *          and MoFuSS as its origin — the data file's "both take the June 2024 report's Table 5" note
 *          struck (the tools took the adm0 dataset); the reference dataset re-anchored to the official
 *          Table 3 values (IND 0.07 / KEN 0.29 / UGA 0.39 / MWI 0.48 / TZA 0.51 / NER 0.61), 29
 *          entries re-derived. No engine arithmetic changed; the demo project's figure is unchanged
 *   0.10.0 2026-09-22 — the official fNRB fallback (Amy's ruling (3), 2026-09-21): a country with no
 *          A6.4-AMT-009 Table 3 national value takes Table 2's multi-national value for its UN M49
 *          region (Asia 0.18 / Latin America 0.32 / Sub-Saharan Africa 0.40), labelled and carrying
 *          footnote 5's condition wherever the number is shown; a country in none of the three
 *          regions gets NO NUMBER — the engine refuses (FnrbUnavailableError), the seat and the
 *          report show the refusal, and the project's own filed value is the way forward. The
 *          quartile fallback dial is retired for fNRB (struck in the data file, kept as the record)
 *          and `fnrbFallbackStop` is dropped from state and ScenarioInput; the dial stays for
 *          household size. Region map: calculators/data/regions/un-m49.json (registry unsd-m49)
 *   0.11.0 2026-09-24 — [#225](a)-(g), then REBUILT the same day after Amy rejected the first cut at
 *          the eyeball. THE DERIVATION WAS NEVER WRONG AND IS NOW VISIBLE. Traced end to end on the
 *          seeded demo project's own record: households × household size = people, N_p the household
 *          count, HN_p the size — HN_p and the size used are exactly equal, and Q_pop reconciles by
 *          both routes. The ER was unchanged, and the same inputs read as PEOPLE would have credited
 *          less, which is the proof the seat was not doing that. (The demo project's figures are
 *          archived in docs/archive/SUPERSEDED_TEXT.md, not carried.)
 *          WHAT CHANGED IS WHAT THE SURFACES SHOW. `derivePeopleServed` and `derivedPremisesCount`
 *          are exported from `scenario.ts` as the ONE place the households→people and
 *          household-count-is-N_p rules live; `computeScenario`, the seat's `effectivePremises` and
 *          the project-record page all CALL them, so no screen can drift from the credited figure.
 *          A "people served" line and a cited, pencil-bearing household size (`householdSizeOverride`,
 *          mirroring `fnrbOverride`) on the seat and the record; N_p filled from the record rather
 *          than left blank while in use, tagged "from record"; HN_p printed to the size's precision;
 *          the QPW_hh header's "filter limit not checked" flag; the report masthead's
 *          "Ex-ante estimate" / "Ex-post" from the mode toggle. No ER math changed — every addition
 *          is display-only or an override that defaults to the prior behaviour
 *   0.12.0 2026-09-24 — RULING R1 AMENDED (Amy, 2026-09-24), two parts, both on [#208].
 *          (1) A TRANSITION RUN REQUIRES THE PROJECT'S FILED V1.0 fNRB. No filed value, no
 *          transition run: `resolveFnrbLegacy` no longer takes a V2 value to fall back to, and
 *          throws `FiledFnrbRequiredError` instead; `computeTransitionWaterfall` refuses at entry;
 *          `transitionAvailability()` is the ask-before-computing pre-check, mirroring
 *          `fnrbAvailability`. The 0.7.0 behaviour — fNRB HELD EQUAL to the V2 value on both sides
 *          when nothing was filed — IS RETIRED, along with its footnote on the report, because a
 *          borrowed number makes the comparison look complete when half of it was invented. The
 *          seat and the report artifact now ASK for the value and name where it is written:
 *          V1.0 methodology, SDWS 21, p.32 (which points to CDM TOOL30), the value itself in the
 *          project's own PDD or monitoring report. A new project never sees this; it runs the
 *          official current value on the ordinary calculator. THE DECOMPOSITION'S OWN hold-equal
 *          STAYS — that is 0.8.0's amendment and a different mechanism: with a filing present, the
 *          same fNRB is used on both sides of the methodology-transition line so the fNRB rule
 *          update can be reported as its own line. No arithmetic changed either way.
 *          (2) CREDITS ARE WORKED OUT BY CALENDAR YEAR, in a crediting-rules file outside the engine: 2025
 *          and earlier on the legacy V1.0 math and the filed fNRB; 2026 and later on the PAA V2.0
 *          math and the official fNRB, ONCE the project has passed validation under PAA. The report
 *          labels every monitoring year with the rules that apply, and a monitoring year that does
 *          not start on 1 January carries BOTH calendar years' labels rather than one tidy wrong
 *          one. Whether PAA validation has passed is a fact about the project and NO FIELD HOLDS IT
 *          YET, so 2026+ reads "not settled" rather than claiming PAA — logged on [#208].
 *          NO ER ARITHMETIC CHANGED. The reference suite is untouched: its 120 deltas call
 *          `computeLegacyEr` / `computePaaEr` with fNRB supplied directly as an input, so they never
 *          reach `resolveFnrbLegacy`, and its only two `computeScenario` cases are `version: "paa"`
 *   0.13.0 2026-09-24 — THE WORDS-AND-LABELS ROUND (Amy, five rulings, all on the report's wording;
 *          no engine math changed and the reference numbers did not move).
 *          (1) THE GOLD STANDARD REGISTRY'S TIME WORDS: *crediting period*, *monitoring period*,
 *          *vintage*. "Crediting year" and "monitoring year" are retired everywhere — they read as
 *          synonyms for each other and for a vintage, and they are three different things.
 *          `monitoringYears()` is `monitoringPeriods()` (P1, P2 …); `creditingRules.ts` speaks in
 *          vintages throughout. The report labels each VINTAGE with its rules, and a monitoring
 *          period that straddles a year end shows as TWO VINTAGES.
 *          (2) THE TAG KEY IS FOUR WORDS, THE SAME ON EVERY SURFACE: entered · default · derived ·
 *          assumed. "fixed" and "adjusted" are retired, and so are `override` and `from record`,
 *          which were never in the key — the distinctions they carried live in the tip and the
 *          provenance line, which is where a reader looks for *which* source. TEAL IS NO LONGER A
 *          BADGE COLOUR: it means one thing, *a baseline survey can replace this value*, and only
 *          ever sits on a default or an assumed one. A one-line legend sits on the calculator page,
 *          and the report's Source column carries the same four words.
 *          (3) EVERY SDWS CITATION CARRIES ITS RULEBOOK VERSION — `V1.0 SDWS n` / `V2.0 SDWS n`,
 *          survey and records sources included. `sdwsRef()` now returns the versioned form, so the
 *          number comes from the per-rulebook symbol table rather than from a typed literal; the
 *          two rulebooks genuinely number parameters differently (QPW_p is 24 under V1.0 and 29
 *          under V2.0; N_p is 28 and 33; t_p is 30 and 35).
 *          (4) THE BASELINE PROFILE ROW NAMES THE MIX IT ASSUMED and says "screening preset, no
 *          source" — printed from the values the engine used, never a second copy. A baseline
 *          survey (V2.0 SDWS 6, V2.0 SDWS 8) replaces it.
 *          (5) A NEW RECORD FIELD, *PAA validation* (date + validator), entered from the validation
 *          report and never set by the site. The vintage rule reads it; with either half missing,
 *          2026+ vintages read "not settled". This closes the gap v0.12.0 logged on [#208].
 *   0.14.0 2026-09-25 — THE CALCULATOR-SCREEN WALK-THROUGH (Amy). Screen wording and controls only;
 *          no engine math changed and the reference numbers did not move.
 *          THE SLIDERS ARE GONE. Eight rows used an `<input type="range">` — η, M_q, C_b,
 *          X_cleanboil, QPW_p, the operational days and U_p on both methods — and a drag cannot
 *          state a methodology value: you cannot type an exact two-decimal value on a track, and
 *          two values one hundredth apart look the same. They are the same typed `InRowNum` every other row uses, so the
 *          derivation reads one way. The bounds moved with them: min/max are CLAMPED on change
 *          rather than enforced by a track that could not be dragged past its ends.
 *          TWO ROWS WERE BLANK BUT USED — the [#225] defect, one parameter along. `t_p` showed an
 *          empty box beside the words "default 5 h" and `DN_p` an empty box beside "assumed 1",
 *          so the figure the engine was using appeared nowhere on screen. Both now show it.
 *          TWO ROWS CARRIED NO TAG WHEN EMPTY. `q_i` and `Q_m` are tagged ASSUMED when blank,
 *          because that is what the engine does with them — no device limit, no supply cap — and
 *          an assumption with no default behind it is what the word means. The tips name it.
 *          THE OPERATIONAL-DAYS ROW HAD NO CITATION: its citation slot printed "365 d", a unit.
 *          It cites the parameter now, versioned per rulebook and per method (V1.0 SDWS 27 / 31,
 *          V2.0 SDWS 32 / 36).
 *          Reported for Amy's word, not built: the baseline preset's stove and fuel rows wear teal
 *          but have no box and no pencil (the editable-presets slice); the equation headline values
 *          and the four summary metrics carry no tag though all are derived; U_p appears twice on a
 *          V2.0 Method 2 screen, read-only in Eq.6 and editable in Eq.8.
 *   0.15.0 2026-09-26 — THE FOUR HELD QUESTIONS, RULED (Amy, 26 Sep). One engine addition; the
 *          reference numbers did not move and two entries were ADDED.
 *          (1) THE BASELINE STOVE AND FUEL ROWS ARE TYPED BOXES. `resolveBaselineEdit` (presets.ts)
 *          turns typed SHARES — stove classes per V2.0 SDWS 6 (four: three-stone, other conventional,
 *          improved, fossil fuel system) and fuels per SDWS 8 (wood, charcoal, LPG: the fuels with a
 *          factor in our data) — into the strata and fuel list, with η from SDWS 11 and factors from
 *          SDWS 9/10. THE 100% GUARD: a list more than half a point from 100% is held, the preset
 *          stands for that half, and `ScenarioResult.baselineMix.held` carries the reason to the row.
 *          A fossil fuel system share needs its own η (SDWS 11 gives none); a charcoal share needs
 *          its V2.0 factor set on either rulebook ([#213]), pre-selected WCCF 6:1 only for UN M49
 *          Sub-Saharan Africa. With nothing typed the labelled screening preset stands, unchanged.
 *          Reference coverage: `synthetic-entered-mix-paa` and `-legacy`, hand-derived, resolved
 *          through `resolveBaselineEdit` by the runner.
 *          (2) Every equation header value and the four summary metrics are tagged DERIVED.
 *          (3) U_p shows once, in its entry box; V2.0's Eq.6 references it instead of repeating it.
 *          (4) TWO MARKS: teal = a baseline sets this value; SLATE = monitoring data sets it (usage
 *          survey, water tests, sales records — M_q, X_cleanboil, U_p, t_p, N_p, DN_p). The legend
 *          shows both. Whether each box is editable in each mode is logged ([#230]), not built.
 *   0.16.0 2026-09-26 — THE PER-COUNTRY BASELINE MIX AS A CITED DEFAULT ([#227], pulled forward by
 *          Amy's ruling (5); her six mapping rulings of the same day). Where the project has typed no
 *          shares, `countryBaselineDefault` (presets.ts) supplies them from
 *          calculators/data/baseline-mix/countries.json: fuel shares from the WHO household energy
 *          series (GHO PHE_HHAIR_PROP_POP_CATEGORY_FUELS, data year 2023, published 2025-07-29; 160
 *          countries), stove shares from a DHS survey of 2023 or later (12 countries). Tagged DEFAULT,
 *          teal, in place of "screening preset, no source"; a country with no data keeps the preset.
 *          THE SIX MAPPINGS, each labelled on the page and logged for the reviewer ([#232]): biomass
 *          at wood's factor; gaseous fuels as LPG; electricity at zero; kerosene and coal at zero (no
 *          coded value existed) and LPG's 63.1, all "source pending: IPCC 2006 Vol. 2 Ch. 2"; WHO
 *          shares scaled to 100%; DHS classes onto SDWS 6 with gas/electric/liquid-fuel stoves leaving
 *          the stove row. Freshness counts from the data year (SDWS 6/8, three years); a stale figure
 *          still shows, with its year and a note. `countryDefaults: false` pins the preset.
 *          THE REFERENCE NUMBERS DID NOT MOVE — every entry passes its strata and fuel list, or its
 *          typed shares, straight to the calculators. THE DEMO PROJECT'S NUMBER DID MOVE: see the PR.
 *   0.16.1 2026-10-03 — THE ENGINE SCRUB (maintainer's ruling, 2026-10-01). NO ARITHMETIC CHANGED and
 *          every reference case gives the same result, byte for byte. The engine now holds no project's
 *          numbers. The one preset that carried an issued filing's strata, fuel mix and filed
 *          efficiencies is REMOVED: engine inputs are the project's own numbers or cited
 *          defaults, never another project's and never invented, so a filing's baseline lives with that
 *          filing's reference case and a project's own baseline enters as typed shares or a cited
 *          country default. Project figures are gone from four comments (the ER-tool note in
 *          emissions-legacy.ts, the U_p note in quantity.ts, the household-derivation notes here and in
 *          scenario.ts), and the two remaining presets' citations no longer name reference cases.
 *          The old wording is kept in docs/archive/SUPERSEDED_TEXT.md.
 *   0.17.0 2026-10-19 — THE FULL DAF TABLE (E1 of the open core modules plan). The DAF data file
 *          now holds every row of the 457 tool's Table 03 (199 countries and areas, the 2026-2030
 *          window) where it held six; 165 selectable countries that took the 1.25% floor now take
 *          their published Default DAF. For 160 of them that is above 1.25%, so their PAA v2.0 credits
 *          go down; the other five are published at 1.25% themselves. The cite says "Table 03"
 *          (it said "Annex 01"). Fifteen selectable territories the table does not list keep the
 *          1.25% floor under the tool's fallback rule (§5.7.1(b)), and every screen that shows the
 *          DAF says so beside it. Where Table 03 and the tool's own rule disagree (Russia, Guyana),
 *          the published value is used (Amy's rulings, 19 Oct). No arithmetic changed and no
 *          reference case moved: every PAA reference entry passes its DAF explicitly, and the
 *          real filings are V1.0, which has no DAF. Sealed 19 Oct 2026; the record was written before
 *          the tag, as at v0.16.1.
 *   0.18.0 2026-10-23 — NO PROJECT FACT IS ASSUMED (Amy, CALCULATOR_SPEC §0.2). `computeScenario`
 *          refuses (`ProjectFactMissingError`) instead of assuming: (1) a technology — it used to take
 *          Method 1 from its default preset when a caller named neither a method nor a preset; (2) the
 *          counting unit — a count with no people/households choice was read as people; (3) a household
 *          size — the 25th-percentile stop of the UN table stood in for a country with no UN figure,
 *          our own statistic rather than a published default, now retired with its dial. Household
 *          size is the project's own, else the cited UN average. The screening preset's label now
 *          says it is replaced by country data or the baseline survey. Devices per household (DN_p)
 *          is a project fact: a whole number, 1 or more, or refused; not given, it is 1, the lowest
 *          and safest cap. No arithmetic changed and no
 *          reference case moved: every reference run names a method or a preset and a counting unit,
 *          and none used the household-size stand-in.
 *   0.18.1 2026-10-23 — NAMES OUT, AND THE DAF DEFAULT NOTE (Amy's rulings, 23 Oct). NO ARITHMETIC
 *          CHANGED and no reference case moved. Comments name a role ("the reviewer", "the demo
 *          project") where they named a person, an organisation or a project. A country with no row in
 *          the DAF data file is labelled "Default value: 0.0125 (Gold Standard DAF tool's fallback)."
 *          (Amy, 25 Oct) where the label spoke of the DAF tool's table, which was false in a copy of the
 *          engine that carries fewer rows.
 *   0.19.0 2026-10-25 — A MISSING COUNTING UNIT IS REFUSED EVERYWHERE (Amy, 25 Oct). `derivePopulation`
 *          used to read a count with no people/households choice as people; it now refuses
 *          (`ProjectFactMissingError("countedAs")`), as `computeScenario` already did at 0.18.0.
 *          `resolveHouseholdSize` is exported, so the project record's grey household-size default
 *          needs no counting unit. NO ARITHMETIC CHANGED and no reference case moved: every reference
 *          run names a counting unit.
 *
 * Seal records are kept in the build plan and the carry rules, not in this file.
 */
export const GS4GG_CALCULATOR_VERSION = "0.19.0";

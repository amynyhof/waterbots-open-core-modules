"use client";

import type { ReactNode } from "react";

import { ReadOnlySeat } from "../../core/readOnly";
import { ValueNotesProvider } from "@waterbots/core/notes";
import EquationStack from "./EquationStack";
import ExAntePanel from "./ExAntePanel";
import { CalculatedTag, InRowNum, TagLegend, WithEqNums } from "./EquationStack";
import ReportView, { type ReportSlots } from "./ReportView";
import VersionTabs, { TabsNote, V2OnlyTab } from "./VersionTabs";
import { fmt, fmtExp } from "./format";
import { fnrbSourceLine } from "./citations";
import { missingFactsPrompt, type CalvinProject } from "./state";
import { enterMonitoring, isEntered, monitoringSource, monitoringValues, MONITORING_FIELD, type MonitoringValue } from "./monitoring";
import type { CalculatorState } from "./useCalculatorState";
import { monitoringRange, refuseIn, type OutOfRange } from "./valueRanges";
import { RangeMessage } from "@waterbots/core/rangedNumber";

/**
 * CalculatorWork — the calculator's WORK SURFACE (OPEN #72 step 2).
 *
 * The derivation and its results: version totals, the metrics strip, the equation
 * stack, the transition checklist, and the always-mounted report. In the single
 * console this is the content of the calculator seat's tab.
 *
 * Markup is unchanged from the standalone calculator that preceded it — the zones
 * were extracted, never restyled.
 *
 * `tab` is a PROP, not state. Which artifact you are looking at belongs to the
 * console's tab strip, not to the calculator (UI_REFERENCE §5: tabs answer "which
 * artifact", selection answers "which subject"). The console owns it as of step 4.
 * NOTE: this is the seat's INNER tab (Calculator / Transition / Report), distinct
 * from the console's Calculator tab that selects the seat itself.
 *
 * CONTRACT. A work surface consumes from the state hook:
 * `state`, `patch`, `seed`, the engine results (`result`, `legacyResult`,
 * `paaResult`, `waterfall`), the derived display values, and `printAt` /
 * `exportReport`. It COMPUTES NOTHING — every number it renders came from the
 * deterministic engine.
 *
 * WHAT THE HOST ADDS (the cut, PR C). A tab the module does not own renders `otherTab` —
 * the paid site's transition checklist (seam S12) — inside the same read-only frame. `report`
 * carries the host's own report sections (seam S13: the paid record rows and the monitoring
 * periods with their vintages). The project arrives as a plain `ModuleProject` (seam S3).
 */
/** The narrowest a figure tile may be: wide enough for its number and its tag side by side. */
const TILE_MIN_WIDTH = "9.5rem";
/** The figure strip's columns: as many as the panel fits at `TILE_MIN_WIDTH`, sharing the rest. */
const TILE_COLUMNS = `repeat(auto-fit, minmax(min(${TILE_MIN_WIDTH}, 100%), 1fr))`;

/**
 * A summary figure. EVERY ONE IS TAGGED DERIVED (ruling (2), 2026-09-26): the four are
 * outputs of the equations below, and the tag says so in the same four-word key as the stack.
 *
 * The number and its tag may wrap: in a narrow tile the tag drops under the number rather than
 * running into the next tile.
 */
function Metric({ label, value, sub, tip }: { label: string; value: string; sub?: string; tip: string }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="t-mono text-fg-1" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>{value}</span>
        <CalculatedTag tip={tip} />
      </div>
      <div className="text-fg-4" style={{ fontSize: 10, marginTop: 4, lineHeight: 1.25 }}><WithEqNums text={label} /></div>
      {sub ? <div className="t-mono text-fg-4" style={{ fontSize: 9.5, marginTop: 1 }}>{sub}</div> : null}
    </div>
  );
}

/**
 * ONE EX-POST MONITORING VALUE IN THE ASK (ruling 2026-11-21). Not entered: the box is blank, with a light highlight
 * and a small red dot, because the calculation needs it, and no label under it (0.5.1). Entered: the box holds the
 * figure, and the line under it says where the figure comes from. A number outside its range is refused, as on every other row.
 */
function MonitoringAskRow({ m, needed, value, onEnter, source, refuse }: {
  m: MonitoringValue; needed: boolean; value: number | null; onEnter: (v: number) => void; source: string;
  refuse: (v: number) => string | null;
}) {
  return (
    <div data-monitoring={m.key} data-needed={needed ? "" : undefined}>
      <div className="calvin-row flex items-baseline gap-2">
        <span className="t-caption min-w-0 flex-1 text-fg-2" style={{ overflowWrap: "anywhere" }}><WithEqNums text={m.label} /></span>
        {/* The controls move together when the row wraps on a narrow screen. */}
        <span className="inline-flex min-w-0 flex-wrap items-baseline gap-2">
        <span
          className="relative inline-flex shrink-0 rounded-sm"
          style={needed ? { padding: 2, background: "color-mix(in oklab, var(--coral) 10%, transparent)" } : { padding: 2 }}
        >
          <InRowNum value={value} onChange={onEnter} refuse={refuse} settle step={m.step} min={m.min} width={72} />
          {needed ? (
            <span
              role="img"
              aria-label="Needed for the calculation"
              title="Needed for the calculation"
              data-needed-dot=""
              style={{ position: "absolute", top: -3, right: -3, width: 7, height: 7, borderRadius: "50%", background: "var(--coral)" }}
            />
          ) : null}
        </span>
        <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10, minWidth: 18 }}>{m.unit}</span>
        </span>
      </div>
      {source ? <p className="t-caption text-fg-4" style={{ fontSize: 10 }}>{source}</p> : null}
    </div>
  );
}

/**
 * ONE NUMBER OUTSIDE ITS RANGE (value ranges, ruled 2026-11-23). It came from the record, an older save or the site. The
 * box shows it as it is, with the message. No figures show until it is put right, or cleared where it may be blank.
 */
function OutOfRangeRow({ r, state, patch }: { r: OutOfRange } & Pick<CalculatorState, "state" | "patch">) {
  const { value } = r;
  return (
    <div data-out-of-range={value.id}>
      <div className="flex flex-wrap items-baseline gap-2">
        <InRowNum
          value={r.shown}
          onChange={(v) => patch(value.set(state, v / value.scale))}
          {...(value.clear ? { optional: true, onClear: () => patch(value.clear!(state)) } : {})}
          refuse={refuseIn(value.key, value.scale, value.words)}
          settle
          showMessage={false}
          step={1 / value.scale}
          width={92}
        />
        {value.scale === 100 ? <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10 }}>%</span> : null}
        <RangeMessage message={r.message} />
      </div>
    </div>
  );
}

export default function CalculatorWork({
  calc,
  project,
  appVersion,
  tab,
  otherTab,
  report,
}: {
  calc: CalculatorState;
  project: CalvinProject;
  appVersion: string;
  /** No longer shown (0.5.0: the footer that used it is gone). Still accepted, so a site that passes it keeps working. */
  referenceCaseCount?: number;
  /** "calculator" and "report" are the module's; any other tab shows `otherTab`. */
  tab: string;
  otherTab?: ReactNode;
  report?: ReportSlots;
}) {
  const {
    state,
    patch,
    seed,
    missingFacts,
    fnrbRefusal,
    filedFnrbRefusal,
    result,
    legacyResult,
    paaResult,
    waterfall,
    warning,
    defaultCount,
    fallbackCount,
    erPerPerson,
    creditingPeriodYears,
    printAt,
    exportReport,
    readOnly,
    transition,
  } = calc;
  /** The V1.0 side and the transition, for a project credited under V1.0. A new project has neither. */
  const comparison = transition && legacyResult && waterfall ? { legacyER: legacyResult.result.ER, waterfall } : null;

  /**
   * A MISSING PROJECT FACT, NO FIGURES (ruling 2026-10-23). The seat used to fill
   * a missing fact itself — 10,000 people, Method 1 for no technology, an empty country code — and
   * every figure on the page was worked out from it. Now nothing is computed: the seat names what is
   * missing and where it is filled in, in the same words the paid site's record check uses. This
   * comes first because every figure, on every tab, depends on these facts.
   */
  const factsPrompt = missingFactsPrompt(missingFacts, project.technology, project.notCoveredYet);
  if (factsPrompt) {
    return (
      <ReadOnlySeat readOnly={readOnly}>
        <section
          className="rounded-lg p-4"
          style={{ border: "1px solid var(--amber)", background: "color-mix(in oklab, var(--amber) 8%, transparent)" }}
          role="status"
        >
          <span className="eyebrow warn">Project facts needed</span>
          <p className="t-body mt-2 text-fg-1" style={{ fontSize: 13 }}>{factsPrompt}</p>
          {calc.recordRefusals.map((m) => <p key={m} className="mt-2"><RangeMessage message={m} /></p>)}
        </section>
      </ReadOnlySeat>
    );
  }

  /** A NUMBER OUTSIDE ITS RANGE, NO FIGURES. The number is shown with its message, never used (`valueRanges.ts`). */
  if (calc.outOfRange.length > 0) {
    return (
      <ReadOnlySeat readOnly={readOnly}>
        <section
          className="rounded-lg p-4"
          style={{ border: "1px solid var(--amber)", background: "color-mix(in oklab, var(--amber) 8%, transparent)" }}
          role="status"
          data-out-of-range-ask=""
        >
          <span className="eyebrow warn">Outside the range</span>
          <div className="mt-3 flex flex-col gap-2">
            {calc.outOfRange.map((r) => <OutOfRangeRow key={r.value.id} r={r} state={state} patch={patch} />)}
          </div>
        </section>
      </ReadOnlySeat>
    );
  }

  /**
   * THE PUMP RUNS ON DIESEL OR GRID POWER (item 15). Zero is right only for a hand pump, gravity or solar supply, so
   * the seat asks for the pump's yearly emissions and shows no figures until they are entered.
   */
  if (calc.activityAsk) {
    return (
      <ReadOnlySeat readOnly={readOnly}>
        <section
          className="rounded-lg p-4"
          style={{ border: "1px solid var(--amber)", background: "color-mix(in oklab, var(--amber) 8%, transparent)" }}
          role="status"
          data-activity-ask=""
        >
          <span className="eyebrow warn">Pump emissions needed</span>
          <p className="t-body mt-2 text-fg-1" style={{ fontSize: 13 }}>
            The project record says the pump runs on {calc.activityAsk.power === "diesel" ? "diesel" : "grid power"}, so running it
            gives off greenhouse gas. How much, in a year? Enter it in tonnes of CO₂e. No figures are shown until it is entered.
          </p>
          <div className="calvin-row mt-2 flex items-baseline gap-2">
            <span className="t-caption text-fg-2">Pump emissions a year</span>
            {/* The controls move together when the row wraps on a narrow screen. */}
            <span className="inline-flex min-w-0 flex-wrap items-baseline gap-2">
            <InRowNum value={null} onChange={(v) => patch({ activityEmissions: v })} refuse={refuseIn("pumpEmissions")} settle step={0.1} width={92} />
            <span className="t-mono text-fg-4" style={{ fontSize: 10 }}>tCO₂e</span>
            </span>
          </div>
        </section>
      </ReadOnlySeat>
    );
  }

  /**
   * AN EX-POST RUN NEEDS ITS MONITORING VALUES (ruling 2026-11-21). After the project runs, the operating days and
   * the other monitoring values come from the operation log or monitoring. Until each is entered its box is blank:
   * no starting value, no fallback. Every figure depends on them, so none is shown until all are entered.
   */
  if (calc.missingMonitoring.length > 0) {
    const missing = new Set(calc.missingMonitoring.map((m) => m.key));
    return (
      <ReadOnlySeat readOnly={readOnly}>
        <section
          className="rounded-lg p-4"
          style={{ border: "1px solid var(--amber)", background: "color-mix(in oklab, var(--amber) 8%, transparent)" }}
          role="status"
          data-monitoring-ask=""
        >
          <span className="eyebrow warn">Monitoring values needed</span>
          <p className="t-body mt-2 text-fg-1" style={{ fontSize: 13 }}>
            This is an ex-post run, so these values come from your project&rsquo;s operation log and monitoring. Enter each
            one marked with a red dot. No figures are shown until every one is entered.
          </p>
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            {monitoringValues(state).map((m) => (
              <MonitoringAskRow
                key={m.key}
                m={m}
                needed={missing.has(m.key)}
                value={isEntered(state, m.key) ? state[MONITORING_FIELD[m.key].value] : null}
                onEnter={(v) => patch(enterMonitoring(m.key, v))}
                source={monitoringSource(state, m.key)}
                refuse={(v) => {
                  const r = monitoringRange(state, m.key);
                  return refuseIn(r.key, 1, r.words)(v);
                }}
              />
            ))}
          </div>
        </section>
      </ReadOnlySeat>
    );
  }

  /**
   * NO OFFICIAL fNRB COVERS THIS PROJECT'S COUNTRY (ruling (3)(b), 2026-09-21). The engine
   * has refused, so there is nothing to show on any tab: no totals, no equation stack, no report.
   * The honest empty state names what is missing and what unblocks it, and the fNRB pencil on the
   * project record is the way forward. A surface with nothing true to show says so.
   */
  /**
   * NO FILED V1.0 fNRB ON THE RECORD, SO THERE IS NO TRANSITION RUN (R1 amended, 2026-09-24,
   * part 1). A transition compares this project's V1.0 credits with its V2.0 credits, and the V1.0
   * side is only true if it uses the fNRB the project was actually credited on. The old behaviour
   * borrowed the V2.0 value for the V1.0 side and said so in a footnote; that is retired, because a
   * borrowed number makes the comparison look complete when half of it was invented. So the seat
   * ASKS, and the ask names the document and the page, which is what makes it answerable.
   *
   * Only a transitioning project comes here. A new project has no V1.0 history: the hook never asks it for a
   * filing, and its seat shows V2.0 alone (ruling 2026-09-21).
   */
  if (filedFnrbRefusal) {
    return (
      <ReadOnlySeat readOnly={readOnly}>
        <section
          className="rounded-lg p-4"
          style={{ border: "1px solid var(--amber)", background: "color-mix(in oklab, var(--amber) 8%, transparent)" }}
          role="status"
        >
          <span className="eyebrow warn">Filed V1.0 fNRB needed</span>
          <p className="t-body mt-2 text-fg-1" style={{ fontSize: 13 }}>{filedFnrbRefusal.message}</p>
          <p className="t-caption mt-2 text-fg-3" style={{ fontSize: 11 }}>
            fNRB is the share of firewood counted as unsustainably harvested. The transition compares
            what this project earns under the old rules with what it earns under the new ones, so the
            old side has to use the project&rsquo;s own filed number. Nothing is shown here rather than
            a borrowed one. Enter it in the box below, with the source it came from.
          </p>
          <p className="t-caption mt-2 text-fg-4" style={{ fontSize: 10 }}>Where to find it: {filedFnrbRefusal.cite}</p>
          {/* THE ASK CARRIES THE BOX IT ASKS FOR. Pointing at the fNRB row would be a dead end —
              that row lives in the worksheet this panel is standing in front of. It writes the SAME
              one value the worksheet's row writes (`fnrbFiledV1`), so there is still one value in
              one place; this is simply where it can be reached while the transition is held. */}
          <div className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
            <label className="t-caption text-fg-2" htmlFor="filed-v1-fnrb" style={{ fontSize: 12 }}>
              Filed V1.0 fNRB (a fraction between 0 and 1)
            </label>
            <span id="filed-v1-fnrb">
              <InRowNum
                value={state.fnrbFiledV1}
                onChange={(v) => patch({ fnrbFiledV1: v })}
                refuse={refuseIn("fnrb")}
                settle
                onClear={() => patch({ fnrbFiledV1: null })}
                optional
                step={0.001}
                width={90}
              />
            </span>
          </div>
        </section>
      </ReadOnlySeat>
    );
  }

  if (fnrbRefusal || !result || !paaResult || (transition && !comparison)) {
    return (
      <ReadOnlySeat readOnly={readOnly}>
        <section
          className="rounded-lg p-4"
          style={{ border: "1px solid var(--amber)", background: "color-mix(in oklab, var(--amber) 8%, transparent)" }}
          role="status"
        >
          <span className="eyebrow warn">No official fNRB default</span>
          <p className="t-body mt-2 text-fg-1" style={{ fontSize: 13 }}>{fnrbRefusal?.message}</p>
          <p className="t-caption mt-2 text-fg-3" style={{ fontSize: 11 }}>
            fNRB is the share of firewood counted as unsustainably harvested. The emission
            reduction cannot be worked out without it, so nothing is shown here rather than a
            stand-in figure. Enter your project&rsquo;s own fNRB, with the source it came from, on
            the project record, and the calculator runs.
          </p>
          <p className="t-caption mt-2 text-fg-4" style={{ fontSize: 10 }}>{fnrbRefusal?.cite}</p>
        </section>
      </ReadOnlySeat>
    );
  }

  /**
   * NOTES ON VALUES (J5, ruling 2026-11-23). On the Paid site every value row and equation row carries the person's
   * note box (`RowNote`). A read-only seat sees the notes and cannot write them. Elsewhere the rows show no box.
   */
  const withNotes = (node: ReactNode) =>
    calc.notesKind === "person" ? (
      <ValueNotesProvider notes={calc.valueNotes} {...(readOnly ? {} : { onChange: calc.setValueNote })}>
        {node}
      </ValueNotesProvider>
    ) : (
      node
    );

  /** The smaller figures, right under the main credit tiles. */
  const figureBlock = (
    <section className="rounded-lg border border-line bg-card shadow-sm" style={{ padding: "14px 20px" }} data-figure-numbers="">
      {/* THE COLUMNS FOLLOW THE PANEL, NOT THE WINDOW. A count picked from the window's width gave
          four narrow columns in a panel beside a side rail and chat, and the figures ran into each
          other at laptop width. Each tile now gets at least TILE_MIN_WIDTH; tiles that do not fit
          move to the next row, and three tiles never leave an empty fourth column. */}
      <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: TILE_COLUMNS }} data-figure-tiles>
        <Metric label="ER / person / yr" value={`${fmt(erPerPerson, 4)}`} sub="tCO₂e" tip="Worked out from the credits (ER_y) and the people served — change either and this follows." />
        <Metric label="Baseline EF_b (Eq.1)" value={fmtExp(result.result.EF_b, 3)} sub="tCO₂e / L" tip="Worked out by Eq.1 from the stoves, fuels and fNRB below." />
        <Metric label="Water volume Q_y" value={`${fmt(result.result.Q_y / 1e6, 2)}`} sub="ML / yr" tip="Worked out by Eq.4 — the smaller of the water people use and the water supplied." />
        {creditingPeriodYears != null ? (
          <Metric
            label={`Total · 1st CP (${creditingPeriodYears} yr)`}
            value={fmt(result.result.ER * creditingPeriodYears, 0)}
            sub="tCO₂e"
            tip="Worked out from the yearly credits (ER_y) over the first crediting period."
          />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-fg-3" style={{ fontSize: 11 }}>
        {/* Provenance line. */}
        <span data-fnrb-source="">fNRB · {fnrbSourceLine(result, state)}</span>
        <span aria-hidden>·</span>
        <span className="t-mono">{defaultCount} default{defaultCount === 1 ? "" : "s"}</span>
        {fallbackCount > 0 ? (
          <span className="inline-flex items-center gap-1 t-mono" style={{ color: "var(--amber)" }}>
            <span className="inline-block h-2 w-2 rounded-pill" style={{ background: "var(--amber)" }} aria-hidden />
            {fallbackCount} fallback dial{fallbackCount === 1 ? "" : "s"} fired
          </span>
        ) : null}
      </div>
    </section>
  );

  return (
    <ReadOnlySeat readOnly={readOnly}>
      {/* ── Calculator tab ── */}
      {tab === "calculator" ? withNotes(
        <>
          {/* THE PINNED HEADER (0.5.0). The main credit figures, the V1.0 and V2.0 tiles in tCO₂e a year, stay at the
              top while the reader scrolls, whatever the site sets. The smaller figures sit right under them: pinned
              with them by default, scrolling with the page when the site sets `unpinFigureBlock`. On a phone only the
              tiles stay pinned (`styles.css`), so the header never fills the screen. Everything below can collapse. */}
          <div className="calvin-pin" data-pinned-header="" data-figure-block={calc.figureBlockPinned ? "pinned" : "scrolls"}>
            <div className="calvin-pin-main" data-pinned-main="">
              {comparison ? (
                <VersionTabs
                  legacyER={comparison.legacyER}
                  paaER={paaResult.result.ER}
                  selected={state.version}
                  onSelect={(v) => patch({ version: v })}
                  showNote={false}
                />
              ) : (
                <V2OnlyTab paaER={paaResult.result.ER} showNote={false} />
              )}
            </div>
            {calc.figureBlockPinned ? figureBlock : null}
          </div>
          <TabsNote transition={comparison !== null} />
          {calc.figureBlockPinned ? null : figureBlock}

          {warning ? (
            <div
              className="flex items-center gap-2 rounded-md px-3 py-2"
              style={{ border: "1px solid var(--coral)", background: "color-mix(in oklab, var(--coral) 8%, transparent)" }}
              role="alert"
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-pill" style={{ background: "var(--coral)" }} aria-hidden />
              <span className="t-caption" style={{ color: "var(--coral)", fontSize: 12 }}>{warning}</span>
            </div>
          ) : null}

          {/* EVERYTHING BELOW THE HEADER CAN COLLAPSE (0.5.0): the sliders and the equations, each behind its own
              title. Both start open. The key to the tags sits with the equations, where the tags are read. */}
          {calc.sliders ? <ExAntePanel state={state} result={result} patch={patch} /> : null}

          <details open className="calvin-fold" data-fold="equations">
            <summary className="calvin-fold-title">
              <span className="eyebrow">The calculation, step by step</span>
            </summary>
            <div className="flex flex-col gap-3">
              <TagLegend />
              <EquationStack result={result} state={state} patch={patch} canonPopulation={project.population?.served} seed={seed} sliders={calc.sliders} tables={calc.tables} screening={calc.exAnteOnly} />
            </div>
          </details>
        </>,
      ) : null}

      {/* ── A tab the host owns (the paid site's transition checklist) ── */}
      {tab !== "calculator" && tab !== "report" ? otherTab : null}

      {/* ── Report tab header (the preview itself is the always-mounted ReportView below) ── */}
      {tab === "report" ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span className="eyebrow solo">{comparison ? "PAA Transition Report" : "PAA V2.0 Report"} — preview</span>
            {calc.exportButton ? (
            <button
              type="button"
              onClick={exportReport}
              className="ml-auto rounded-md border border-line px-3 py-1 text-caption text-fg-1 outline-none transition-colors duration-base hover:border-tide focus-visible:ring-2 focus-visible:ring-tide"
            >
              Export (PDF)
            </button>
            ) : null}
          </div>
          <p className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            Assembled from the calculator — no separate report content. Release is handled manually
            out-of-band in the pilot; payment-gated release is a later milestone (M6, OPEN #32).
          </p>
        </div>
      ) : null}

      {/* Report export/preview — ONE ReportView, always mounted so Export works from any tab;
          revealed on-screen only under .report-preview (Report tab). No status sticker lives
          inside it — the client deliverable stays clean (canon). */}
      <div className={tab === "report" ? "report-preview" : undefined}>
        <ReportView
          project={project}
          state={state}
          result={result}
          legacyER={comparison?.legacyER}
          paaER={paaResult.result.ER}
          waterfall={comparison?.waterfall}
          warning={warning}
          generatedAt={printAt ?? ""}
          appVersion={appVersion}
          canonPopulation={project.population?.served}
          creditingPeriodYears={creditingPeriodYears}
          slots={report}
          tables={calc.tables}
          noteLines={calc.noteLines}
        />
      </div>
    </ReadOnlySeat>
  );
}

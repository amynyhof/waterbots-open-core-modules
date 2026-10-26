"use client";

import type { ReactNode } from "react";

import { ReadOnlySeat } from "../../core/readOnly";
import EquationStack from "./EquationStack";
import { DerivedTag, InRowNum, TagLegend } from "./EquationStack";
import ReportView, { type ReportSlots } from "./ReportView";
import VersionTabs from "./VersionTabs";
import BetaTag from "./BetaTag";
import { fmt, fmtExp } from "./format";
import { missingFactsPrompt, type CalvinProject } from "./state";
import type { CalculatorState } from "./useCalculatorState";

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
 * CONTRACT (CALCULATOR_SPEC §9). A work surface consumes from the state hook:
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
/**
 * A summary figure. EVERY ONE IS TAGGED DERIVED (Amy's ruling (2), 2026-09-26): the four are
 * outputs of the equations below, and the tag says so in the same four-word key as the stack.
 */
function Metric({ label, value, sub, tip }: { label: string; value: string; sub?: string; tip: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="t-mono text-fg-1" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>{value}</span>
        <DerivedTag tip={tip} />
      </div>
      <div className="text-fg-4" style={{ fontSize: 10, marginTop: 4, lineHeight: 1.25 }}>{label}</div>
      {sub ? <div className="t-mono text-fg-4" style={{ fontSize: 9.5, marginTop: 1 }}>{sub}</div> : null}
    </div>
  );
}

export default function CalculatorWork({
  calc,
  project,
  appVersion,
  referenceCaseCount,
  tab,
  otherTab,
  report,
}: {
  calc: CalculatorState;
  project: CalvinProject;
  appVersion: string;
  /** Read by the host from its reference dataset; the Beta footer states it. */
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
  } = calc;

  /**
   * A MISSING PROJECT FACT, NO FIGURES (CALCULATOR_SPEC §0.2, Amy 2026-10-23). The seat used to fill
   * a missing fact itself — 10,000 people, Method 1 for no technology, an empty country code — and
   * every figure on the page was worked out from it. Now nothing is computed: the seat names what is
   * missing and where it is filled in, in the same words the paid site's record check uses. This
   * comes first because every figure, on every tab, depends on these facts.
   */
  const factsPrompt = missingFactsPrompt(missingFacts, project.technology);
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
        </section>
        <div className="border-t border-line pt-2">
          <BetaTag caseCount={referenceCaseCount} />
        </div>
      </ReadOnlySeat>
    );
  }

  /**
   * NO OFFICIAL fNRB COVERS THIS PROJECT'S COUNTRY (Amy's ruling (3)(b), 2026-09-21). The engine
   * has refused, so there is nothing to show on any tab: no totals, no equation stack, no report.
   * The honest empty state names what is missing and what unblocks it, and the fNRB pencil on the
   * project record is the way forward. A surface with nothing true to show says so.
   */
  /**
   * NO FILED V1.0 fNRB ON THE RECORD, SO THERE IS NO TRANSITION RUN (Amy, R1 amended, 2026-09-24,
   * part 1). A transition compares this project's V1.0 credits with its V2.0 credits, and the V1.0
   * side is only true if it uses the fNRB the project was actually credited on. The old behaviour
   * borrowed the V2.0 value for the V1.0 side and said so in a footnote; that is retired, because a
   * borrowed number makes the comparison look complete when half of it was invented. So the seat
   * ASKS, and the ask names the document and the page, which is what makes it answerable.
   *
   * This is the transition seat. A new project has no V1.0 history and never comes here — it runs
   * the current official value on the ordinary calculator.
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
                onClear={() => patch({ fnrbFiledV1: null })}
                optional
                step={0.001}
                width={90}
              />
            </span>
          </div>
        </section>
        <div className="border-t border-line pt-2">
          <BetaTag caseCount={referenceCaseCount} />
        </div>
      </ReadOnlySeat>
    );
  }

  if (fnrbRefusal || !result || !legacyResult || !paaResult || !waterfall) {
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
        <div className="border-t border-line pt-2">
          <BetaTag caseCount={referenceCaseCount} />
        </div>
      </ReadOnlySeat>
    );
  }

  return (
    <ReadOnlySeat readOnly={readOnly}>
      {/* ── Calculator tab ── */}
      {tab === "calculator" ? (
        <>
          <VersionTabs
            legacyER={legacyResult.result.ER}
            paaER={paaResult.result.ER}
            selected={state.version}
            onSelect={(v) => patch({ version: v })}
          />

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

          {/* Summary row is sticky so the changed values stay visible while scrolling the derivation. */}
          <section
            className="sticky top-0 z-10 rounded-lg border border-line bg-card shadow-sm"
            style={{ padding: "14px 20px" }}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
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
              {/* Provenance line. The single Beta marker (surface hedge) is the footer line below the equations. */}
              <span className="t-mono">fNRB · {result.fnrbVintage}</span>
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

          {/* THE KEY, WHERE THE TAGS ARE READ (Amy's ruling (2), 2026-09-24). One line above the
              derivation, so a reader never has to remember what four small words mean. */}
          <TagLegend />

          <EquationStack result={result} state={state} patch={patch} canonPopulation={project.population?.served} seed={seed} />

          {/* ── Beta footer — one line, honest state, shown to visitors (Amy, 2026-09-07) ── */}
          <div className="border-t border-line pt-2">
            <BetaTag caseCount={referenceCaseCount} />
          </div>
        </>
      ) : null}

      {/* ── A tab the host owns (the paid site's transition checklist) ── */}
      {tab !== "calculator" && tab !== "report" ? otherTab : null}

      {/* ── Report tab header (the preview itself is the always-mounted ReportView below) ── */}
      {tab === "report" ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span className="eyebrow solo">PAA Transition Report — preview</span>
            <button
              type="button"
              onClick={exportReport}
              className="ml-auto rounded-md border border-line px-3 py-1 text-caption text-fg-1 outline-none transition-colors duration-base hover:border-tide focus-visible:ring-2 focus-visible:ring-tide"
            >
              Export (PDF)
            </button>
          </div>
          <p className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            Assembled from the calculator — no separate report content. Release is handled manually
            out-of-band in the pilot; payment-gated release is a later milestone (M6, OPEN #32).
          </p>
        </div>
      ) : null}

      {/* Report export/preview — ONE ReportView, always mounted so Export works from any tab;
          revealed on-screen only under .report-preview (Report tab). No Beta/status sticker lives
          inside it — the client deliverable stays clean (canon). */}
      <div className={tab === "report" ? "report-preview" : undefined}>
        <ReportView
          project={project}
          state={state}
          result={result}
          legacyER={legacyResult.result.ER}
          paaER={paaResult.result.ER}
          waterfall={waterfall}
          warning={warning}
          generatedAt={printAt ?? ""}
          appVersion={appVersion}
          canonPopulation={project.population?.served}
          creditingPeriodYears={creditingPeriodYears}
          slots={report}
        />
      </div>
    </ReadOnlySeat>
  );
}

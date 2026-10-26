"use client";

import type { ReactNode } from "react";

import { saveNotice } from "../../core/saveOutcome";
import SaveNoticeBox from "../../core/SaveNotice";
import { ReadOnlySeat } from "../../core/readOnly";

import type { CalculatorState } from "./useCalculatorState";

/**
 * CalculatorLens — the calculator's LENS zone (OPEN #72 step 2).
 *
 * The project facts and regime controls, plus the save/export affordances pinned
 * beneath them. In the single console this renders in the rail's **leaf lens**
 * slot: UI_REFERENCE §2 describes the rail as "a navigation tree whose LEAF
 * carries the lens", and the Analysis Basis toggle is exactly that.
 *
 * Markup is unchanged from the standalone calculator that preceded it — the zones
 * were extracted, never restyled. It is mounted in the console rail (step 4); the
 * standalone page it came from is retired (step 5).
 *
 * CONTRACT (CALCULATOR_SPEC §9). A lens consumes from the state hook:
 * `state`, `patch`, `dirty`, `saving`, `save`, `exportReport` — inputs and the
 * affordances that persist them. It never touches engine results; showing a
 * computed number is the work surface's job.
 *
 * The analysis-state tag lives HERE, with the Save affordance, and never on the
 * canonical record card (Working Surface Standard §3).
 *
 * WHAT THE HOST PUTS IN IT (the cut, PR C). `header` is the host's own top of the lens — the
 * paid site puts its project-record card and its forecast/measured switch there (seam S14). The
 * Save button appears only when the host passed `onSave` (S1), and a read-only seat shows the
 * host's `readOnlyReason` in its place (S5); the module never words a role itself.
 */
export default function CalculatorLens({
  calc,
  header,
  readOnlyReason,
}: {
  calc: CalculatorState;
  /** Rendered at the top of the lens, above where the values live. */
  header?: ReactNode;
  /** The host's sentence for why this seat is read-only. */
  readOnlyReason?: string;
}) {
  const { dirty, saving, saveState, save, canSave, exportReport, readOnly } = calc;

  return (
    <ReadOnlySeat readOnly={readOnly}>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
          {header}
          {/* THE SIGNPOST POINTS AT SOMETHING THIS READER CANNOT DO ([#97]) — it said values "are
              adjusted" in the rows, which is false for a contributor. It became a description of
              where the values LIVE, which is the useful half and stays true either way. */}
          <p className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            All values — population, metered volume, and every methodology parameter (η, M_q, C_b,
            X_cleanboil, QPW, DO, U_p) — {readOnly ? "are shown inside their formula rows →" : "are adjusted inside their formula rows →"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
        {/* Analysis-state tag lives HERE, with the Save affordance — never on the canon card.
            With nowhere to save (no `onSave`), "unsaved" would describe nothing, so it is not shown. */}
        {dirty && canSave ? (
          <span
            className="t-mono self-start rounded-pill px-2"
            style={{ fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-1)", background: "color-mix(in oklab, var(--amber) 20%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--amber) 40%, transparent)" }}
          >
            modified · unsaved
          </span>
        ) : null}
        {/* ── SAVE IS REPLACED BY THE REASON, NOT DISABLED ([#97], Amy 2026-08-12) ──
            A disabled Save button is still an OFFER — it says "you could save, just not
            right now", which is false: this caller can never save here. Amy's canon is
            that the UI stops OFFERING what the database will refuse, so the affordance
            leaves and a plain sentence takes its place. The sentence names the way out
            rather than stopping at the refusal (governing statement 8). */}
        {readOnly ? (
          readOnlyReason ? (
            <p className="text-fg-3" style={{ fontSize: 11, lineHeight: 1.55 }}>
              {readOnlyReason}
            </p>
          ) : null
        ) : !canSave ? null : (
          <>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className={`w-full rounded-md px-3 py-2 text-caption font-medium outline-none focus-visible:ring-2 focus-visible:ring-tide ${
                dirty && !saving ? "btn-primary" : "border border-line text-fg-4"
              }`}
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
            {/* THE BUTTON STATES THE ATTEMPT; THIS STATES THE OUTCOME (#98 2b). Without it a
                refused save left the label reading "Saved" over a record that never changed —
                and these inputs drive the ER figures a filing is built on. */}
            <SaveNoticeBox notice={saveNotice(saveState, dirty)} />
          </>
        )}
        {/* EXPORT STAYS FOR EVERYONE, INCLUDING A CONTRIBUTOR. Amy's contributor canon names
            exactly two allowances — "asking agents questions, and exporting reports" — so
            removing this alongside Save would take away half of what the role is FOR. */}
        <button
          type="button"
          onClick={exportReport}
          className="w-full rounded-md border border-line px-3 py-2 text-caption text-fg-1 outline-none transition-colors duration-base hover:border-tide focus-visible:ring-2 focus-visible:ring-tide"
          title="Export the report (print / save as PDF) with the full Sources & Assumptions"
        >
          Export report (PDF)
        </button>
      </div>
    </ReadOnlySeat>
  );
}

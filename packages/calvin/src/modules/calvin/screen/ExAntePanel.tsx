"use client";

import type { ScenarioResult } from "../engine";
import { CalcEditContext } from "./EquationStack";
import SliderRow from "./SliderRow";
import { sliderSpecs } from "./exAnte";
import { fmt } from "./format";
import type { CalcState } from "./state";

/**
 * ANTICIPATED PERFORMANCE — the ex-ante sliders in one place, above the equations (Road to v1, V3).
 * Shown only when the site turns sliders on and the run is ex-ante. The headline is the engine's
 * yearly credit for the values set, so it moves as any slider moves. The equation rows these values
 * feed show the credited value and point here, so each value has one control.
 */
export default function ExAntePanel({ state, result, patch }: {
  state: CalcState;
  result: ScenarioResult;
  patch: (p: Partial<CalcState>) => void;
}) {
  return (
    <CalcEditContext.Provider value={{ state, patch }}>
    {/* IT CAN COLLAPSE (0.5.0). The title row is the toggle, and it keeps the headline in view when closed. It starts open. */}
    <details open className="calvin-fold rounded-lg border border-line bg-card" style={{ padding: "12px 20px" }} aria-label="Anticipated performance" data-fold="sliders">
      <summary className="calvin-fold-title flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="eyebrow" style={{ fontSize: 11 }}>Anticipated performance</span>
        <span className="ml-auto inline-flex items-baseline gap-2">
          <span className="t-caption text-fg-3" style={{ fontSize: 11 }}>Credits a year</span>
          <span className="t-mono text-fg-1" data-headline="" style={{ fontSize: 17, fontWeight: 600 }}>{fmt(result.result.ER, 0)}</span>
          <span className="t-mono text-fg-4" style={{ fontSize: 10 }}>tCO₂e</span>
        </span>
      </summary>
      <p className="t-caption mt-1 text-fg-3" style={{ fontSize: 11 }}>
        For a planned project, move the sliders to match its expected performance. To type an exact number, tap the
        pencil.
      </p>
      <div className="mt-1 divide-y divide-line">
        {sliderSpecs(state).map((spec) => (
          <SliderRow key={spec.key} spec={spec} state={state} result={result} patch={patch} />
        ))}
      </div>
    </details>
    </CalcEditContext.Provider>
  );
}

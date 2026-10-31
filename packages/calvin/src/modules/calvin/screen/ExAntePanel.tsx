"use client";

import type { ScenarioResult } from "../engine";
import SliderRow from "./SliderRow";
import { sliderSpecs } from "./exAnte";
import type { CalcState } from "./state";

/**
 * ANTICIPATED PERFORMANCE — the ex-ante sliders in one place, above the equations (Road to v1, V3).
 * Shown only when the site turns sliders on and the run is ex-ante. The equation rows these values
 * feed show the credited value and point here, so each value has one control.
 */
export default function ExAntePanel({ state, result, patch }: {
  state: CalcState;
  result: ScenarioResult;
  patch: (p: Partial<CalcState>) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-card" style={{ padding: "12px 20px" }} aria-label="Anticipated performance">
      <span className="eyebrow" style={{ fontSize: 11 }}>Anticipated performance</span>
      <p className="t-caption mt-1 text-fg-3" style={{ fontSize: 11 }}>
        Before a project runs, these four values are what you expect. Each starts at its cited value. Move it, or
        type an exact value with the pencil.
      </p>
      <div className="mt-1 divide-y divide-line">
        {sliderSpecs(state).map((spec) => (
          <SliderRow key={spec.key} spec={spec} state={state} result={result} patch={patch} />
        ))}
      </div>
    </section>
  );
}

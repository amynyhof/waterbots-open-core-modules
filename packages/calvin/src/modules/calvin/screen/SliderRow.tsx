"use client";

import { useState } from "react";

import { useReadOnlySeat } from "../../core/readOnly";
import type { ScenarioResult } from "../engine";
import { EditGlyph, InRowNum, StateBadge } from "./EquationStack";
import {
  applySlider, capNote, creditedIfDifferent, endLabel, shownValue, sliderLabel, sliderNotes, storedValue,
  type SliderSpec,
} from "./exAnte";
import type { CalcState } from "./state";

const TIP = {
  assumed: "The starting value, not this project's own figure yet. Move the slider, or type an exact value, to enter the figure you anticipate.",
  entered: "Set for this project: the figure you anticipate.",
};

/**
 * ONE EX-ANTE SLIDER (Road to v1, step V3). The track runs between its two ends; the pencil types an
 * exact value; the row shows the value the ENGINE credits when it differs from the value set, the
 * notes the value triggers, and one plain line on which way the credits move. Everything it knows
 * about the slider comes from `exAnte.ts`; it computes nothing.
 */
export default function SliderRow({ spec, state, result, patch }: {
  spec: SliderSpec;
  state: CalcState;
  result: ScenarioResult;
  patch: (p: Partial<CalcState>) => void;
}) {
  const readOnly = useReadOnlySeat();
  const [refused, setRefused] = useState<string | null>(null);
  const label = sliderLabel(state, spec.key);
  const credited = creditedIfDifferent(state, result, spec);
  const cap = capNote(state, spec);
  const notes = sliderNotes(state, spec);
  const value = storedValue(state, spec.key) * spec.scale;

  function change(display: number) {
    const c = applySlider(state, spec, display);
    if (!c.ok) return setRefused(c.reason);
    setRefused(null);
    patch(c.patch);
  }

  return (
    <div className="py-2" data-slider={spec.key}>
      <div className="flex items-baseline gap-2">
        <span className="t-caption flex-1 text-fg-2">{spec.label}</span>
        <StateBadge state={label} tip={TIP[label]} />
        <EditGlyph title={`Type an exact value, from ${shownValue(spec, spec.floor.value)} to ${shownValue(spec, spec.ceiling.value)}.`} />
        <InRowNum value={value} onChange={change} step={spec.step} min={0} width={64} />
        <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10, minWidth: 18 }}>{spec.unit}</span>
      </div>
      <input
        type="range"
        aria-label={spec.label}
        min={spec.floor.value * spec.scale}
        max={spec.ceiling.value * spec.scale}
        step={spec.step}
        value={value}
        onChange={(e) => change(Number(e.target.value))}
        disabled={readOnly}
        className="mt-1 w-full"
        style={{ accentColor: "var(--tide)" }}
      />
      <div className="flex justify-between gap-4 t-caption text-fg-4" style={{ fontSize: 9.5 }}>
        <span data-end="floor">{endLabel(spec, spec.floor)}</span>
        <span data-end="ceiling" className="text-right">{endLabel(spec, spec.ceiling)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        {credited ? (
          <>
            <span className="t-caption text-fg-3" style={{ fontSize: 11 }}>Credited</span>
            <span className="t-mono text-fg-1" data-credited="" style={{ fontSize: 12, fontWeight: 600 }}>{credited}</span>
          </>
        ) : null}
        <span className="t-caption text-fg-4" data-start="" style={{ fontSize: 10 }}>
          {credited ? "· " : ""}starts at {shownValue(spec, spec.start.value)}, {spec.start.source ? `assumed (${spec.start.source})` : "assumed: no source yet"}
        </span>
      </div>
      {cap ? <p className="t-caption" data-cap="" style={{ fontSize: 10, color: "var(--amber)" }}>{cap}</p> : null}
      {notes.map((n) => (
        <p key={n} className="t-caption" data-note="" style={{ fontSize: 10, color: "var(--amber)" }}>{n}</p>
      ))}
      {refused ? <p className="t-caption" role="alert" style={{ fontSize: 10, color: "var(--amber)" }}>{refused}</p> : null}
      <p className="t-caption text-fg-3" style={{ fontSize: 10 }}>{spec.direction}</p>
    </div>
  );
}

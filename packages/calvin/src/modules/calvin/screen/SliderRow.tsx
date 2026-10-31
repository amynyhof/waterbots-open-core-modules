"use client";

import { useState } from "react";

import { useReadOnlySeat } from "../../core/readOnly";
import type { ScenarioResult } from "../engine";
import { EditGlyph, InRowNum, StateBadge } from "./EquationStack";
import {
  applySlider, capNote, creditedValue, shownValue, sliderLabel, storedValue, trackEnds, type SliderSpec,
} from "./exAnte";
import type { CalcState } from "./state";

const TIP = {
  assumed: "The cited starting value, not this project's own figure yet. Move the slider, or type an exact value, to enter the figure you anticipate.",
  entered: "Set for this project: the figure you anticipate.",
};

/**
 * ONE EX-ANTE SLIDER (Road to v1, step V3). The track runs between the cited floor and ceiling; the
 * pencil types an exact value; the row always shows the number the ENGINE credits, read from the
 * engine, and one plain line on which way the credits move. Everything it knows about the slider
 * comes from `exAnte.ts`; it computes nothing.
 */
export default function SliderRow({ spec, state, result, patch }: {
  spec: SliderSpec;
  state: CalcState;
  result: ScenarioResult;
  patch: (p: Partial<CalcState>) => void;
}) {
  const readOnly = useReadOnlySeat();
  const [refused, setRefused] = useState<string | null>(null);
  const { min, max } = trackEnds(spec);
  const label = sliderLabel(state, spec.key);
  const credited = creditedValue(state, result, spec.key);
  const note = capNote(state, spec);
  const shown = (v: number | null) => shownValue(spec, v);

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
        <EditGlyph title={`Type an exact value. Its ends: ${spec.floor ? shown(spec.floor.value) : "no cited floor"} to ${shown(max)}.`} />
        <InRowNum value={storedValue(state, spec.key) * spec.scale} onChange={change} step={spec.step} min={0} width={64} />
        <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10, minWidth: 18 }}>{spec.unit}</span>
      </div>
      <input
        type="range"
        aria-label={spec.label}
        min={min * spec.scale}
        max={max * spec.scale}
        step={spec.step}
        value={storedValue(state, spec.key) * spec.scale}
        onChange={(e) => change(Number(e.target.value))}
        disabled={readOnly}
        className="mt-1 w-full"
        style={{ accentColor: "var(--tide)" }}
      />
      <div className="flex justify-between gap-4 t-caption text-fg-4" style={{ fontSize: 9.5 }}>
        <span data-end="floor">{spec.floor ? `${shown(spec.floor.value)} · ${spec.floor.source}` : "No cited floor"}</span>
        <span data-end="ceiling" className="text-right">{spec.ceiling ? `${shown(spec.ceiling.value)} · ${spec.ceiling.source}` : "No cited ceiling"}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="t-caption text-fg-3" style={{ fontSize: 11 }}>Credited</span>
        <span className="t-mono text-fg-1" data-credited="" style={{ fontSize: 12, fontWeight: 600 }}>{shown(credited)}</span>
        <span className="t-caption text-fg-4" style={{ fontSize: 10 }}>
          · starts at {shown(spec.start.value)} {spec.start.source ? `(${spec.start.source})` : "(no rulebook citation)"}
        </span>
      </div>
      {note ? <p className="t-caption" data-cap style={{ fontSize: 10, color: "var(--amber)" }}>{note}</p> : null}
      {refused ? <p className="t-caption" role="alert" style={{ fontSize: 10, color: "var(--amber)" }}>{refused}</p> : null}
      <p className="t-caption text-fg-3" style={{ fontSize: 10 }}>{spec.direction}</p>
    </div>
  );
}

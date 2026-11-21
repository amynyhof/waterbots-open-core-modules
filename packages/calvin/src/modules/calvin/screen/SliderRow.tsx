"use client";

import { useState } from "react";

import { useReadOnlySeat } from "../../core/readOnly";
import type { ScenarioResult } from "../engine";
import { EditGlyph, InfoIcon, InRowNum, ProveLater, StateBadge, type Mark } from "./EquationStack";
import HelpTip from "./HelpTip";
import {
  applySlider, assumedLine, capNote, creditedIfDifferent, shownValue, sliderLabel, sliderNotes, sliderSources, storedValue,
  type SliderSpec,
} from "./exAnte";
import type { CalcState } from "./state";

const TIP = {
  assumed: "Assumed: a cautious estimate of how the project will perform. Change it to match your project.",
  entered: "Set for this project: the figure you anticipate.",
};

/**
 * ONE EX-ANTE SLIDER (Road to v1, step V3). The track runs between its two ends; the pencil types an
 * exact value. Under the track (the maintainer's walk of the open site, 2026-11-16):
 *   - one line on the value: "Assumed: [value], a cautious estimate." until it is set;
 *   - one plain line on which way the credits move;
 *   - for drinking water, one line on what a project must do to claim more, with its page.
 * The citations for the starting value and the two ends sit behind the info icon. The row shows the value
 * the ENGINE credits when it differs from the value set, and the notes the value triggers. Everything it
 * knows about the slider comes from `exAnte.ts`; it computes nothing.
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
  const mark: Mark | undefined = spec.provenBy ? { kind: "monitoring", ...spec.provenBy } : undefined;

  function change(display: number) {
    const c = applySlider(state, spec, display);
    if (!c.ok) return setRefused(c.reason);
    setRefused(null);
    patch(c.patch);
  }

  return (
    <div className="py-2" data-slider={spec.key}>
      <div className="calvin-row flex items-baseline gap-2">
        <span className="t-caption flex-1 text-fg-2">{spec.label}</span>
        {/* The controls move together when the row wraps on a narrow screen. */}
        <span className="inline-flex min-w-0 flex-wrap items-baseline gap-2">
        <HelpTip text={sliderSources(spec)} label={`Where the ${spec.label.toLowerCase()} values come from`}>
          <span className="inline-flex text-fg-3" data-sources="">
            <InfoIcon />
          </span>
        </HelpTip>
        <StateBadge state={label} tip={TIP[label]} mark={mark} />
        <EditGlyph title={`Type an exact value, from ${shownValue(spec, spec.floor.value)} to ${shownValue(spec, spec.ceiling.value)}.`} />
        <InRowNum value={value} onChange={change} step={spec.step} min={0} width={64} />
        <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10, minWidth: 18 }}>{spec.unit}</span>
        </span>
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
        <span data-end="floor">{shownValue(spec, spec.floor.value)}</span>
        <span data-end="ceiling" className="text-right">{shownValue(spec, spec.ceiling.value)}</span>
      </div>
      {credited ? (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className="t-caption text-fg-3" style={{ fontSize: 11 }}>Credited</span>
          <span className="t-mono text-fg-1" data-credited="" style={{ fontSize: 12, fontWeight: 600 }}>{credited}</span>
        </div>
      ) : null}
      {label === "assumed" ? (
        <p className="t-caption mt-1 text-fg-2" data-start="" style={{ fontSize: 11 }}>{assumedLine(spec)}</p>
      ) : (
        <ProveLater entered mark={mark} />
      )}
      <p className="t-caption text-fg-3" data-direction="" style={{ fontSize: 10 }}>{spec.direction}</p>
      {spec.claimMore ? <p className="t-caption text-fg-3" data-claim-more="" style={{ fontSize: 10 }}>{spec.claimMore}</p> : null}
      {cap ? <p className="t-caption" data-cap="" style={{ fontSize: 10, color: "var(--amber)" }}>{cap}</p> : null}
      {notes.map((n) => (
        <p key={n} className="t-caption" data-note="" style={{ fontSize: 10, color: "var(--amber)" }}>{n}</p>
      ))}
      {refused ? <p className="t-caption" role="alert" style={{ fontSize: 10, color: "var(--amber)" }}>{refused}</p> : null}
    </div>
  );
}

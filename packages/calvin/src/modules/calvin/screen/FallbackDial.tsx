"use client";

import { useReadOnlySeat } from "../../core/readOnly";
import type { FallbackStopKey, FiredFallback } from "../engine";

/**
 * The labeled conservative-default dial — rendered in place, only when a fallback fires
 * (no country data for the active vintage). Per canon it anchors to the flagged value: the
 * fNRB dial renders inside the EF_b equation row, next to the fNRB it substitutes. Compact
 * stops (name + percentile) so long values never overflow; the selected value drops to the
 * explanation line.
 */
export default function FallbackDial({
  fired,
  value,
  onChange,
}: {
  fired: FiredFallback;
  value?: FallbackStopKey;
  onChange: (s: FallbackStopKey) => void;
}) {
  // READ-ONLY SEATS SHOW WHICH STOP IS IN FORCE BUT CANNOT MOVE IT ([#97]). The dial stays
  // rendered rather than hidden: which conservative default fired is a FACT about the number
  // above it, and hiding it would remove information a reader is entitled to.
  const readOnly = useReadOnlySeat();
  const selected = value ?? fired.selectedStop;
  const current = fired.stops.find((s) => s.stop === selected) ?? fired.stops[0];
  return (
    <div
      className="mt-2 overflow-hidden rounded-md p-2"
      style={{
        border: "1px solid var(--amber)",
        background: "color-mix(in oklab, var(--amber) 8%, transparent)",
      }}
    >
      <span className="eyebrow warn" style={{ fontSize: 9 }}>No country data — conservative fallback</span>
      <div className="mt-1 flex gap-1 rounded-md border border-line p-1">
        {fired.stops.map((s) => {
          const active = s.stop === selected;
          return (
            <button
              key={s.stop}
              type="button"
              onClick={() => onChange(s.stop)}
              disabled={readOnly}
              className={`min-w-0 flex-1 rounded-sm px-1 py-1 transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-tide ${
                active ? "btn-primary font-medium" : "text-fg-3 hover:text-fg-1"
              } ${readOnly ? "cursor-default" : ""}`}
              aria-pressed={active}
            >
              <span className="block truncate text-caption" style={{ fontSize: 11 }}>
                {s.stop[0].toUpperCase() + s.stop.slice(1)}
              </span>
              <span className="block truncate t-mono" style={{ fontSize: 8, opacity: 0.75 }}>
                {s.percentile}th
              </span>
            </button>
          );
        })}
      </div>
      <p className="t-caption mt-1 text-fg-3" style={{ fontSize: 10 }}>
        <span className="t-mono text-fg-1">= {current.value}</span> · {current.explanation}
      </p>
    </div>
  );
}

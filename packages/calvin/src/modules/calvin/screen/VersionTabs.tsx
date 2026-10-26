"use client";

import { fmt } from "./format";
import { useReadOnlySeat } from "../../core/readOnly";

/**
 * Single-row notebook tabs at the top of the center console. Both methodology versions are
 * active tabs showing their OWN live ER total (no toggling to compare); the selected tab's
 * equation stack renders below and the transition delta shows underneath. This is the shared
 * tab-card format. (Other-standard placeholders belong on the future general calculator, not the
 * PAA module — removed here.)
 */

function VerTab({
  name,
  total,
  active,
  onClick,
  disabled = false,
}: {
  name: string;
  total: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex shrink-0 flex-col items-start gap-1 rounded-t-md border px-3 py-2 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-tide${disabled ? " cursor-default" : ""}`}
      style={{
        borderColor: active ? "var(--tide)" : "var(--line)",
        background: active ? "var(--card)" : "transparent",
        boxShadow: active ? "inset 0 -2px 0 var(--tide)" : "none",
      }}
    >
      <span
        className="t-mono rounded-pill px-1"
        style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-1)", background: "color-mix(in oklab, var(--tide) 12%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--tide) 40%, transparent)" }}
      >
        Carbon
      </span>
      <span className="t-h4" style={{ fontSize: 13, color: active ? "var(--fg-1)" : "var(--fg-3)" }}>{name}</span>
      <span className="t-mono" style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--tide)" : "var(--ink-4)" }}>{total}</span>
    </button>
  );
}

export default function VersionTabs({
  legacyER,
  paaER,
  selected,
  onSelect,
}: {
  legacyER: number;
  paaER: number;
  selected: "legacy" | "paa";
  onSelect: (v: "legacy" | "paa") => void;
}) {
  /*
   * WHY THIS IS DISABLED ON A READ-ONLY SEAT, and it is the one control where the call was
   * genuinely close ([#97]).
   *
   * `version` LOOKS like a view toggle and IS a saved input: it lives in `CalcState` and is
   * persisted by `toGs4ggCarbonContext`. Amy's ruling — *"not even on-screen"* — therefore
   * reaches it. And the alternative is worse than the cost: `patch` is inert on a read-only
   * seat, so leaving these tabs live would give a Contributor **a control that responds to
   * nothing**, which is the precise defect this item exists to remove.
   *
   * THE COST, STATED RATHER THAN HIDDEN: a Contributor reads the derivation of the SAVED
   * version only. **Both totals stay visible either way** — they are rendered above,
   * unconditionally — so no figure is withheld; what is withheld is the expanded working of
   * the other one. Making `version` view state rather than a saved input would return that,
   * and it is a refactor of the seat's contract, not part of this fix.
   */
  const readOnly = useReadOnlySeat();
  const delta = paaER - legacyER;
  const deltaPct = legacyER !== 0 ? (delta / legacyER) * 100 : undefined;
  const t = (n: number) => `${fmt(n, 0)} tCO₂e/yr`;

  return (
    <div>
      <div className="flex items-end gap-1 border-b border-line">
        <VerTab name="Legacy V1.0" total={t(legacyER)} active={selected === "legacy"} onClick={() => onSelect("legacy")} disabled={readOnly} />
        <VerTab name="PAA v2.0" total={t(paaER)} active={selected === "paa"} onClick={() => onSelect("paa")} disabled={readOnly} />
      </div>
      <p className="t-caption mt-2 text-fg-3" style={{ fontSize: 11 }}>
        Transition delta (PAA − Legacy):{" "}
        <span className="t-mono" style={{ color: delta >= 0 ? "var(--mint)" : "var(--coral)" }}>
          {delta >= 0 ? "+" : ""}
          {fmt(delta, 0)} tCO₂e/yr
          {deltaPct !== undefined ? ` (${deltaPct >= 0 ? "+" : ""}${fmt(deltaPct, 1)}%)` : ""}
        </span>
      </p>
      <p className="t-caption text-fg-4" style={{ fontSize: 10 }}>
        Difference attributable to the methodology transition, computed on identical project data.
      </p>
    </div>
  );
}

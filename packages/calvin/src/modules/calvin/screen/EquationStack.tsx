"use client";

import { useEffect, useState } from "react";

import { useReadOnlySeat } from "../../core/readOnly";
import {
  PRESETS, DEFAULT_STOVE_ETA, STOVE_SHARE_KEYS, STOVE_CLASS_LABEL, FUEL_SHARE_KEYS, FUEL_LABEL, FUEL_FACTOR_NOTE,
  presetShares, defaultCharcoalConvention, validDevicesPerPremises, DEVICES_PER_PREMISES_RULE, type CharcoalConvention,
  type LegacyErOutput, type PaaErOutput, type ScenarioResult,
} from "../engine";
import { peopleServed, projectFacts, type CalcState } from "./state";
import { fmt, fmtExp, parseNumericInput } from "./format";
import HelpTip from "./HelpTip";
import { sdwsRef, citeShort, type Basis } from "./citations";

/*
 * Derivation view — structured by the GS methodology's NATIVE sections (Baseline emissions →
 * Project emissions → Leakage → Emission reductions), the skeleton every GS-literate reader
 * already thinks in. Rows stay in computation order; Eq. numbers cite the methodology.
 *
 * Plain-English explanations are OUR OWN WORDS from the primary PDFs (content-derivation policy;
 * never verbatim GS text — these render publicly), 6th-grade register, credit direction, cited
 * inline. ⚠ PENDING PRACTITIONER REVIEW. A practitioner reviews; a VVB validates.
 */

const ML = (v: number) => `${fmt(v / 1e6, 2)} ML`;

// ── section + sub-header ─────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 pt-1">
      <span className="eyebrow" style={{ fontSize: 11 }}>{title}</span>
    </div>
  );
}

/** One typographic step below a Section — reduced-weight, no heavy band (keeps density). */
function SubHeader({ label, note }: { label: string; note: string }) {
  return (
    <div className="mt-2" style={{ paddingLeft: 26 }}>
      <span className="t-mono text-fg-4" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {label}
      </span>
      <p className="t-caption text-fg-3" style={{ fontStyle: "italic", fontSize: 11, marginTop: 2 }}>{note}</p>
    </div>
  );
}

// ── editability grammar (canon) ──────────────────────────────────────────────
// One consistent language for what can change vs what is locked. FIXED / DERIVED = locked
// (computed or constant, never adjustable, no glyph). DEFAULT = adjustable, untouched.
// ADJUSTED = a parameter moved from its default. OVERRIDE = a lookup/fact changed from canon
// (carries "record: X · this analysis: Y" provenance). Every editable value shows the ✎ glyph.

// THE THREE WORDS THE RECORD AND THE CALCULATOR SHARE are `entered`, `default` and `derived`
// (Amy's glossary, 2026-09-24). `fixed`, `adjusted`, `override` and `record` remain for the rows
// that genuinely mean something narrower — an override still says "changed from the record".
/**
 * THE TAG KEY — FOUR WORDS, THE SAME ON EVERY SURFACE (Amy's ruling (2), 2026-09-24; [#225]).
 *
 * A tag answers ONE question: *where does this number come from?* Four answers cover every value
 * the product shows, and a value carries its tag everywhere it appears — seat, record and report.
 *
 *   entered  — typed for this project, from a named source
 *   default  — the rulebook's or a cited reference's value, shown with citation and version
 *   derived  — worked out from other values on the record
 *   assumed  — our placeholder where no default exists and nothing was entered
 *
 * ⚠ *"fixed"* AND *"adjusted"* ARE RETIRED, and so are `override` and `from record`, which were
 * never in the key. Six words for four ideas is how two surfaces end up disagreeing: *fixed* and
 * *default* both meant "the rulebook's number", *adjusted*, *override* and *from record* all meant
 * "somebody typed it". The distinctions they carried are real and they have not been thrown away —
 * they live in the tip and in the provenance line under the value, which is where a reader looks for
 * *which* source, rather than in a one-word badge.
 *
 * ⚠ AND TEAL IS NO LONGER A BADGE COLOUR. Teal now means exactly one thing — *a baseline survey
 * can replace this value* (`BaselineChip`) — so a badge may not wear it. `assumed` takes amber
 * because a placeholder with nothing behind it is the thing a reader most needs to notice.
 */
type EditState = "entered" | "default" | "derived" | "assumed";

const STATE_META: Record<EditState, { text: string; color: string; editable: boolean; tip: string }> = {
  entered: { text: "entered", color: "var(--iris)",  editable: true,  tip: "Typed for this project, from a named source — not a rulebook default and not computed here." },
  default: { text: "default", color: "var(--ink-4)", editable: true,  tip: "The rulebook's own value, or a cited reference's, shown with its citation and rulebook version." },
  derived: { text: "derived", color: "var(--ink-4)", editable: false, tip: "Worked out from other values on the record — change those and this follows." },
  assumed: { text: "assumed", color: "var(--amber)", editable: true,  tip: "Our placeholder. No rulebook default covers this and nothing has been entered, so nothing stands behind the number yet." },
};

/**
 * THE KEY, PRINTED WHERE THE TAGS ARE READ (Amy's ruling (2), 2026-09-24). One line, four words,
 * plain English — a legend a reader can check without leaving the page they are reading.
 */
export function TagLegend() {
  return (
    <p className="t-caption text-fg-3" style={{ fontSize: 10, lineHeight: 1.6 }}>
      <span className="text-fg-2">What the tags mean:</span>{" "}
      <b>entered</b> — typed for this project, from a named source ·{" "}
      <b>default</b> — the rulebook&rsquo;s or a cited reference&rsquo;s value, with its citation and
      version · <b>derived</b> — worked out from other values on the record ·{" "}
      <b>assumed</b> — our placeholder, where no default exists and nothing was entered.
      {/* TWO MARKS, TWO MEANINGS, BOTH SHOWN (Amy's ruling (4), 2026-09-26). The marks are drawn
          here exactly as they are on the rows, so the key is the thing itself, not a description. */}
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-fg-2">What the marks mean:</span>
        <SourceMark kind="baseline" />
        <span>a baseline sets this value — a baseline survey can replace it ·</span>
        <SourceMark kind="monitoring" />
        <span>monitoring data sets this value — the usage survey, water tests or sales records.</span>
      </span>
    </p>
  );
}

/**
 * The universal "editable" affordance — a subtle pencil on the value. Never on FIXED/DERIVED.
 *
 * ⚠ IT DISAPPEARS ENTIRELY ON A READ-ONLY SEAT ([#97]), and the check lives HERE rather than at
 * the seven call sites. **The browser walk is what forced this.** The first build guarded only
 * the slider's pencil, and the walk showed six more still on screen — on `SE`, on the fNRB
 * override, on premises, on metered volume, on every editable row header. **The glyph is a
 * PROMISE that a value can be changed**, so leaving one on a seat that refuses the change is
 * the [#114] defect: a marker advertising a capability the reader does not have. Guarding the
 * component means a seventh call site added tomorrow cannot reintroduce it.
 */
function EditGlyph({ title }: { title?: string }) {
  const readOnly = useReadOnlySeat();
  if (readOnly) return null;
  const text = title ?? "Adjustable in this row";
  // CLICK OPENS THE SAME NOTE THE HOVER SHOWS (Job 3, 2026-09-03) — `HelpTip` wraps the glyph.
  return (
    <HelpTip text={text} label="How this value can be changed">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, color: "var(--iris)", opacity: 0.85 }}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </HelpTip>
  );
}

/**
 * THE BADGE OPENS ITS NOTE ON CLICK (Job 3, 2026-09-03). It was a `title` attribute under a
 * `cursor: help` — the cursor promised a note, hover delivered it after a delay, a click did
 * nothing, and on a touch screen it never appeared at all. The note is the one that already
 * existed (`tip`, or the state's own line); nothing new is written here.
 */
function StateBadge({ state, tip }: { state: EditState; tip?: string }) {
  const b = STATE_META[state];
  return (
    <HelpTip text={tip ?? b.tip} label={`What does "${b.text}" mean here?`}>
      <span
        className="t-mono shrink-0 rounded-sm px-1"
        style={{ fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-1)", background: `color-mix(in oklab, ${b.color} 12%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${b.color} 40%, transparent)` }}
      >
        {b.text}
      </span>
    </HelpTip>
  );
}

/** The `derived` badge on its own, for the summary metrics above the stack (Amy's ruling (2), 2026-09-26). */
export function DerivedTag({ tip }: { tip: string }) {
  return <StateBadge state="derived" tip={tip} />;
}

/**
 * THE BASELINE MARKER — a teal chip saying a project's BASELINE SURVEY is where this value really
 * comes from (Amy, 2026-09-23: *"every baseline-settable field gets a teal marker, surveyed ages
 * included"*; [#215], proposal part C2).
 *
 * ⚠ IT IS NOT A PENCIL AND PROMISES NOTHING ABOUT EDITING. The pencil says *you may change this
 * here*; this says *the true source of this number is a survey we have not read yet*. They answer
 * different questions and a row can carry one, both, or neither.
 *
 * ⚠ AND IT STAYS ON A READ-ONLY SEAT — deliberately unlike `EditGlyph`, which removes itself
 * ([#97]). A Contributor may not change the value, and the fact about where the value comes from is
 * still true for them. Hiding it would tell a read-only reader less about the number's provenance
 * than a writer gets, which is the opposite of what a view-only seat is for.
 *
 * The rulebook parameter is named in the note rather than assumed: five fields can be set by a
 * baseline survey (V2.0 SDWS 6 stove shares, V2.0 SDWS 8 fuel shares, V2.0 SDWS 12 C_b, V2.0 SDWS 30
 * people per premises
 * and its age split) and they are not interchangeable.
 */
function BaselineChip({ sdws }: { sdws: string }) {
  return (
    <HelpTip
      text={`A project's baseline survey sets this value (${sdws}). Until the uploaded survey is wired in, it is entered by hand here — or left at a default.`}
      label="Where does this value really come from?"
    >
      <SourceMark kind="baseline" />
    </HelpTip>
  );
}

/**
 * THE MONITORING MARKER — a slate chip saying MONITORING DATA sets this value: the usage survey,
 * water-quality tests or sales records (Amy's ruling (4), 2026-09-26). Two marks, two meanings:
 * teal = a baseline sets it once, at the start; slate = monitoring sets it, year by year, during
 * the crediting period (V2.0 §14.3.1 lists these as parameters to be monitored).
 *
 * Slate, because the token file already names `--slate` "quiet monitoring" and it is Monty's
 * accent, the monitor seat. Like the teal mark it promises nothing about editing and it stays on a
 * read-only seat. WHETHER THE BOX IS EDITABLE IN EACH MODE (ex-ante vs ex-post) is logged, not
 * built — [#230].
 */
function MonitoringChip({ sdws, instrument }: { sdws: string; instrument: string }) {
  return (
    <HelpTip
      text={`Monitoring data sets this value — the ${instrument} (${sdws}), measured during the crediting period. Before monitoring starts, the figure here is entered by hand or left at its starting value.`}
      label="Where does this value really come from?"
    >
      <SourceMark kind="monitoring" />
    </HelpTip>
  );
}

/**
 * The two source marks, drawn once. Same wash/keyline recipe as every other chip on a row, so each
 * reads as one of them rather than a new species; only the hue and the word differ.
 */
function SourceMark({ kind }: { kind: "baseline" | "monitoring" }) {
  // Teal = the Surf family, the palette's only teal. Slate = `--slate`, "quiet monitoring".
  const hue = kind === "baseline" ? "var(--surf)" : "var(--slate)";
  return (
    <span
      className="t-mono shrink-0 rounded-sm px-1"
      style={{
        fontSize: 8,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--fg-1)",
        background: `color-mix(in oklab, ${hue} 12%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${hue} 40%, transparent)`,
      }}
    >
      {kind}
    </span>
  );
}

/** A LOCKED value row — only FIXED or DERIVED (never carries the edit glyph). */
function VarRow({ label, value, unit, state, tip, baselineSdws }: { label: string; value: string; unit?: string; state: EditState; tip?: string; baselineSdws?: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="t-caption flex-1 text-fg-3">{label}</span>
      <span className="t-mono text-fg-1" style={{ fontSize: 11 }}>
        {value}
        {unit ? <span className="text-fg-4"> {unit}</span> : null}
      </span>
      {baselineSdws ? <BaselineChip sdws={baselineSdws} /> : null}
      <StateBadge state={state} tip={tip} />
    </div>
  );
}

/**
 * AN ADJUSTABLE PARAMETER — A TYPED BOX, NOT A SLIDER (Amy's walk-through, 25 Sep 2026:
 * *"every field is a typed box with its tag and a pencil, no sliders on this site"*).
 *
 * ⚠ IT WAS A SLIDER, AND THE SLIDER WAS THE PROBLEM. Eight rows used one — η, M_q, C_b,
 * X_cleanboil, QPW_p, the operational days and U_p twice — and a drag cannot state a methodology
 * value. You cannot type an exact two-decimal value on a track, you cannot tell two values one
 * hundredth apart by eye, and a person
 * filing a number against a rulebook needs to set the number, not approach it. The same
 * `InRowNum` every other row uses is the control now, so the whole derivation reads one way.
 *
 * ⚠ THE BOUNDS DID NOT GO WITH THE TRACK. A slider could not be dragged past its ends; a box can
 * be typed past them, so `min`/`max` are enforced on change instead. An out-of-range entry is
 * CLAMPED rather than refused — refusing silently would leave the box showing a number the engine
 * is not using, which is the blank-but-used defect wearing a different hat.
 *
 * Tagged ENTERED once somebody types; before that it takes its RESTING tag, which is *default* for
 * most rows and *assumed* for the ones the rulebook gives no value for (C_b is the standing
 * example: its zero is the seat's starting point, not the methodology's).
 */
function Param({ label, sdwsRef, value, onChange, min, max, step, unit, baseline, tip, changed, baselineSdws, monitor, resting = "default" }: {
  label: string; sdwsRef: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string; baseline: string; tip?: string; changed: boolean;
  /** Set when a project's BASELINE SURVEY is the real source of this value — see `BaselineChip`. */
  baselineSdws?: string;
  /** Set when MONITORING DATA is the real source of this value — see `MonitoringChip`. */
  monitor?: { sdws: string; instrument: string };
  /** The tag this row carries while nobody has typed in it. */
  resting?: EditState;
}) {
  return (
    <div className="py-1">
      <div className="flex items-baseline gap-2">
        <span className="t-caption flex-1 text-fg-2">{label}</span>
        <span className="t-mono shrink-0 rounded-sm px-1" style={{ fontSize: 8, letterSpacing: "0.06em", color: "var(--fg-1)", background: "color-mix(in oklab, var(--tide) 12%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--tide) 40%, transparent)" }}>{sdwsRef}</span>
        {baselineSdws ? <BaselineChip sdws={baselineSdws} /> : null}
        {monitor ? <MonitoringChip sdws={monitor.sdws} instrument={monitor.instrument} /> : null}
        <StateBadge state={changed ? "entered" : resting} tip={tip} />
        {/* The pencil removes itself on a read-only seat — see `EditGlyph` ([#97]). */}
        <EditGlyph title={`Type a value between ${min} and ${max}`} />
        <InRowNum
          value={Number.isFinite(value) ? value : undefined}
          onChange={(v) => onChange(Math.min(max, Math.max(min, v)))}
          step={step}
          min={min}
          width={72}
        />
        {unit ? <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10, minWidth: 18 }}>{unit}</span> : null}
      </div>
      <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>{resting === "assumed" ? "assumed" : "default"} {baseline}</div>
    </div>
  );
}

/**
 * Compact in-row number input with the rail field's hold/clear semantics (empty is a state,
 * never NaN): required → empty holds the last value; optional → empty clears (onClear). Used
 * for the values that live inside their governing equation row (population, metered volume).
 */
export function InRowNum({ value, onChange, onClear, optional = false, step = 1, min = 0, width = 90 }: {
  value: number | null | undefined; onChange: (v: number) => void; onClear?: () => void;
  optional?: boolean; step?: number; min?: number; width?: number;
}) {
  const readOnlySeat = useReadOnlySeat();
  const asText = (v: number | null | undefined) =>
    v === null || v === undefined || !Number.isFinite(v) ? "" : String(v);
  const [raw, setRaw] = useState<string>(() => asText(value));
  useEffect(() => {
    const parsed = raw.trim() === "" ? undefined : Number(raw);
    const finite = value === null || value === undefined || !Number.isFinite(value) ? undefined : value;
    if (finite !== parsed) setRaw(finite === undefined ? "" : String(finite));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    const res = parseNumericInput(e.target.value, optional);
    if (res.action === "set") onChange(res.value);
    else if (res.action === "clear") onClear?.();
  }
  return (
    <input
      type="number" inputMode="decimal" value={raw} min={min} step={step} onChange={handle}
      // `readOnly` rather than `disabled`: the VALUE still has to be legible and selectable —
      // a contributor's whole allowance is reading and exporting, and a disabled number input
      // greys its own text. This blocks the edit without dimming the fact.
      readOnly={readOnlySeat}
      className="t-mono shrink-0 rounded-sm border border-line bg-card text-right text-fg-1 outline-none focus:border-tide focus:ring-2 focus:ring-tide"
      style={{ fontSize: 11, width, padding: "1px 6px" }}
    />
  );
}

function LiveRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded-sm px-2 py-1 t-mono" style={{ fontSize: 11, background: "color-mix(in oklab, var(--tide) 6%, transparent)", color: "var(--fg-3)" }}>
      {children}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 160ms var(--ease-out)", flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// ── one equation row ─────────────────────────────────────────────────────────

interface RowProps {
  eqNum: string; symbol: string; title: string; formula: string; value: string;
  oneLiner: string; binding?: string; open: boolean; onToggle: () => void; children?: React.ReactNode;
  /** True when the row contains adjustable/overridable values — shows the ✎ even when collapsed. */
  editable?: boolean;
  /** Methodology section citation, e.g. "per M400-12 v2.0 §7.3.7" — opens the explanation, muted. */
  cite?: string;
  /** A short flag beside the header's own value — e.g. "filter limit not checked" — visible even
   *  collapsed, never buried only in the expanded caption or the report's Source column ([#225](e)). */
  flag?: string;
}
function EqRow({ eqNum, symbol, title, formula, value, oneLiner, binding, open, onToggle, children, editable, cite, flag }: RowProps) {
  return (
    <div className="border-t border-line">
      <button type="button" onClick={onToggle} className="flex w-full items-baseline gap-2 rounded-sm py-2 pl-1 pr-1 text-left outline-none transition-colors duration-fast hover:bg-paper focus-visible:ring-2 focus-visible:ring-tide">
        <span className="self-center text-fg-4"><Chevron open={open} /></span>
        <span className="t-mono shrink-0 text-fg-1" style={{ width: 54, fontWeight: 700 }}>{symbol}</span>
        <span className="t-caption flex-1 text-fg-2">
          {title}
          {/* Eq. number inline with the label — the methodology numbering is non-sequential, so a
              leading Eq. column read as rows being out of order. */}
          <span className="t-mono text-fg-4" style={{ fontSize: 9, marginLeft: 6, letterSpacing: "0.02em" }}>Eq.{eqNum}</span>
        </span>
        {editable ? <span className="self-center"><EditGlyph title="This row has adjustable / overridable values" /></span> : null}
        {flag ? (
          <span className="t-mono shrink-0 rounded-sm px-1" style={{ fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-1)", background: "color-mix(in oklab, var(--amber) 12%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--amber) 40%, transparent)" }}>{flag}</span>
        ) : null}
        {/* EVERY HEADER VALUE IS AN EQUATION'S OUTPUT, SO EVERY ONE IS TAGGED DERIVED (Amy's ruling
            (2), 2026-09-26). A number without a tag was the one place on the page the key did not
            reach. `HelpTip` stops the click, so opening the note never also toggles the row. */}
        <span className="self-center"><StateBadge state="derived" tip={`Worked out by this equation from the values inside it — change those and ${symbol} follows.`} /></span>
        <span className="t-mono text-fg-1" style={{ fontSize: 12 }}>{value}</span>
      </button>
      {open ? (
        <div className="pb-3" style={{ paddingLeft: 40 }}>
          {/* Explanation opens with its methodology section citation (muted), then the plain-English line. */}
          {cite ? <p className="t-mono text-fg-4" style={{ fontSize: 10, letterSpacing: "0.02em" }}>{cite}</p> : null}
          <p className="t-caption text-fg-3" style={{ fontStyle: "italic", fontSize: 12, marginTop: cite ? 2 : 0 }}>{oneLiner}</p>
          <div className="t-mono mt-2 text-fg-2" style={{ fontSize: 11 }}>{symbol} = {formula}</div>
          {binding ? <div className="t-caption mt-1" style={{ color: "var(--iris)", fontSize: 11 }}>{binding}</div> : null}
          {children ? (
            <>
              {/* Muted "where" label above the variable list (mirrors the export's "Where," — no columns on screen). */}
              <div className="eyebrow solo mt-3 text-fg-4" style={{ fontSize: 9 }}>where</div>
              <div className="mt-1">{children}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── the stack ────────────────────────────────────────────────────────────────

export default function EquationStack({ result, state, patch, canonPopulation, seed }: { result: ScenarioResult; state: CalcState; patch: (p: Partial<CalcState>) => void; canonPopulation?: number; seed?: CalcState }) {
  // Read once here for the legend below; the input primitives read it for themselves ([#97]).
  const readOnlySeat = useReadOnlySeat();
  // Method 2 (HWT/IWT) opens the Eq.6/7 quantity rows by default so its per-premises derivation
  // (N_p · U_p · QPW_hh · DP_p) is visible without a click — it is the point of a Method-2 run.
  const [open, setOpen] = useState<Set<string>>(() =>
    new Set(state.method === 2 ? ["ef_b", "q_y", "q_pop", "qpw_hh"] : ["ef_b", "q_y"]),
  );
  // DN_p typed as something the engine refuses (0, negative, a decimal, blank): the box keeps what
  // was typed, the row says why, and the engine keeps the last value that was allowed.
  const [dnRefused, setDnRefused] = useState(false);
  const toggle = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const basis: Basis = state.version;
  const v2 = state.version === "paa";
  const m2 = state.method === 2;
  const etaPct = (state.etaOverride ?? result.etaWeighted) * 100;
  const preset = PRESETS["traditional-wood-cws"];
  // THE MIX, NAMED (Amy's ruling (4), 2026-09-24). The row used to print "read-only", which told a
  // reader nothing about WHAT had been assumed on their behalf. It now prints the stoves and fuels
  // themselves, from the same values the engine used — never a second copy typed here.
  const presetMixSummary = [
    result.stoveStrata.map((s) => `${s.label ?? "stove"} ${fmt(s.share * 100, 0)}%`).join(" + "),
    result.fuelMix.map((f) => `${f.fuel} ${fmt(f.energyFraction * 100, 0)}%`).join(" + "),
  ].filter(Boolean).join(" · ");
  // Fallback dials anchor to their flagged value (canon): fNRB → EF_b row; household size →
  // the Q_pop population line (fires when population is entered as households + no country data).
  // fNRB no longer fires the quartile dial (v0.10.0). When a country has no national row the engine
  // substitutes AMT-009 Table 2's multi-national value, says so in the provenance label, and attaches
  // footnote 5's condition — both come from the engine, so this component only prints them.
  const fnrbRegional = result.fnrbMultiNational;
  const fnrbRegionalLabel = result.provenance.find((p) => p.field === "fNRB")?.label;
  // Population lives in the Q_pop row; an analysis figure differing from canon is an override.
  const popOverride = typeof canonPopulation === "number" && state.populationCount !== canonPopulation;
  // N_p CAME FROM THE RECORD when nothing was typed here and the engine worked it out from the
  // record's count — the case where HN_p and the household size are the same number ([#225]).
  const npFromRecord = state.premises == null && result.premises != null;
  const enteredAsHouseholds = state.populationMode === "households";
  /**
   * THE DERIVED COUNTERPART — the number that was NOT entered, worked out in whichever direction
   * applies (Amy's two rulings of 2026-09-24). Households × size = people; people ÷ size =
   * households. Both are the ENGINE's figures — `result.people` and `result.premises` — never
   * recomputed here, so the row cannot print a number the calculator did not use.
   */
  const householdCitation =
    result.provenance.find((p) => p.field === "householdSize")?.label ?? "UN 2022 country average";
  const counterpart =
    result.householdSizeUsed == null
      ? null
      : enteredAsHouseholds
        ? {
            label: "People served",
            value: fmt(result.people, 0),
            working: `${fmt(state.populationCount, 0)} households × ${fmt(result.householdSizeUsed, 2)} people/household — ${householdCitation}.`,
          }
        : state.method === 2 && result.premises != null
          ? {
              label: "Households served (N_p)",
              value: fmt(result.premises, Number.isInteger(result.premises) ? 0 : 1),
              working: `${fmt(state.populationCount, 0)} people ÷ ${fmt(result.householdSizeUsed, 2)} people/household — ${householdCitation}.`,
            }
          : null;
  // fNRB is VERSION-SCOPED: Legacy edits the filed-V1 value (else held equal to V2, R1); PAA edits the
  // current override (else the MoFuSS vintage lookup). Source is labeled per version below.
  const isLegacyV = state.version === "legacy";
  const fnrbField = isLegacyV ? state.fnrbFiledV1 : state.fnrbOverride;
  const fnrbSet = fnrbField !== undefined && fnrbField !== null;
  // "Adjusted" = moved from the methodology default (discounts) or the seeded value (QPW).
  const changed = {
    eta: state.etaOverride !== undefined,
    mq: state.waterQualityFactor !== 1,
    cb: state.cBaseline !== 0,
    xcb: state.xCleanboil !== 0,
    qpw: seed !== undefined ? state.litresPerPersonPerDay !== seed.litresPerPersonPerDay : false,
    do: state.operationalDays !== 365,
  };

  const etaParam = (
    <Param label="η — baseline stove efficiency" sdwsRef={sdwsRef(basis, "eta")} value={etaPct} changed={changed.eta}
      onChange={(pct) => patch({ etaOverride: pct / 100 })} min={5} max={40} step={1} unit="%"
      baseline={v2 ? "15% (three-stone, V2.0 SDWS 11 p.52)" : "10% (three-stone, V1.0 SDWS 11 p.24)"}
      tip="Weighted stove efficiency — three-stone fire ≈ V1 10% / V2 15%, improved cookstove 30%. From a Water Boiling Test." />
  );
  // THE SLATE MARK GOES WHERE THE RULEBOOK NAMES A MONITORING INSTRUMENT FROM AMY'S THREE (ruling (4),
  // 2026-09-26): water tests (M_q, V2.0 SDWS 22), the usage survey (X_cleanboil SDWS 26, U_p SDWS 34,
  // t_p SDWS 35), sales records (N_p SDWS 33, DN_p SDWS 37). QPW_p (the WCFT) and Q_m (a meter) are
  // also monitored under §14.3.1 but by other instruments, so they are left unmarked pending her word.
  const mon = (key: string, instrument: string) => ({ sdws: sdwsRef(basis, key), instrument });
  const mqParam = <Param monitor={mon("Mq", "water-quality tests")} label="M_q,y — water-quality modifier" sdwsRef={sdwsRef(basis, "Mq")} value={state.waterQualityFactor} changed={changed.mq} onChange={(v) => patch({ waterQualityFactor: v })} min={0} max={1} step={0.01} unit="" baseline="1.0 (all samples pass at point of use)" tip="Fraction of water-quality samples that pass at the point of use. 0 = all failing → no credits." />;
  const cbParam = <Param resting="assumed" label="C_b — already-safe share" sdwsRef={sdwsRef(basis, "Cb")} baselineSdws="V2.0 SDWS 12" value={state.cBaseline} changed={changed.cb} onChange={(v) => patch({ cBaseline: v })} min={0} max={1} step={0.01} unit="" baseline="0% — your baseline survey replaces this" tip="Share of end-users already using a safe supply that didn't require boiling. 1 = everyone → no credits. Assumed 0% until your baseline survey (V2.0 SDWS 12) replaces it." />;
  const xcbParam = <Param monitor={mon("X", "usage survey")} label="X_cleanboil,y — still boiling the safe water" sdwsRef={sdwsRef(basis, "X")} value={state.xCleanboil} changed={changed.xcb} onChange={(v) => patch({ xCleanboil: v })} min={0} max={1} step={0.01} unit="" baseline="0 (not yet surveyed)" tip="Share of end-users who still boil the project's safe water after it arrives — that boiling still burns fuel. 1 = everyone → no credits." />;

  // ── shared quantity inputs (reused by the Method-1 Eq.5 row and the Method-2 Eq.6/7 rows) ──
  const populationRow = (
    <div className="py-1">
      {/* THE LABEL SAYS WHAT THE NUMBER IS — "People served" or "Households served", following the
          record's toggle (Amy's glossary, 2026-09-24). A box labelled "population" holding a
          household count was the first of the two faults that sent this back at the eyeball. */}
      <div className="flex items-baseline gap-2">
        {/* The count box carries the plain name; the "(N_p)" marker belongs to the Eq.7 parameter
            row below, so the two are not two identical labels one above the other. */}
        <span className="t-caption flex-1 text-fg-2">{enteredAsHouseholds ? "Households served" : "People served"}</span>
        <StateBadge state="entered" tip="The figure on the project record. Change it here only to record a surveyed figure for this analysis — an override; the record stays untouched." />
        <EditGlyph title="Enter a surveyed figure to override the record" />
        <InRowNum value={state.populationCount} onChange={(v) => patch({ populationCount: v })} width={92} />
      </div>
      <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
        {canonPopulation === undefined
          ? "Not on the project record — set it on Project Record."
          : popOverride
            ? `Entered here — record: ${canonPopulation.toLocaleString()} · this analysis: ${peopleServed(state).toLocaleString()} (survey).`
            : "From the project record."}
      </div>
      {/* THE DERIVED COUNTERPART, IN WHICHEVER DIRECTION IT RUNS — people when households were
          entered, households when people were. Both are printed with the arithmetic spelled out so
          the three numbers can be checked against each other without doing sums in one's head. */}
      {counterpart ? (
        <div className="pt-1">
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">{counterpart.label}</span>
            <StateBadge state="derived" tip="Worked out from the figure above and the household size below — this is what the equations are computed on." />
            <span className="t-mono text-fg-1" style={{ fontSize: 11 }}>{counterpart.value}</span>
          </div>
          <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>{counterpart.working}</div>
        </div>
      ) : null}
      {/* HOUSEHOLD SIZE — the UN default, editable, teal (Amy's glossary). It is the number that
          ties the two counts together, so it sits with them rather than in a dial somewhere else. */}
      {result.householdSizeUsed != null && state.method === 2 ? (
        <div className="py-1">
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">Household size</span>
            <BaselineChip sdws="V2.0 SDWS 30" />
            <StateBadge state={state.householdSizeOverride != null ? "entered" : "default"} tip="The cited UN 2022 country average until this project's own surveyed figure is entered here." />
            <EditGlyph title="Enter a surveyed household size to override the country average" />
            <InRowNum value={state.householdSizeOverride ?? result.householdSizeUsed} onChange={(v) => patch({ householdSizeOverride: v })} onClear={() => patch({ householdSizeOverride: undefined })} optional step={0.01} width={92} />
          </div>
          <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            {state.householdSizeOverride != null
              ? "Entered — this project's own surveyed household size."
              : (result.provenance.find((p) => p.field === "householdSize")?.label ?? "UN 2022 country average.")}
          </div>
        </div>
      ) : null}
    </div>
  );
  /**
   * THE AGE SPLIT ROW (V2.0 SDWS 30) — [#215] part C1, built on Amy's ruling of 2026-09-23:
   * *"use the existing pencil; every baseline-settable field gets a teal marker, surveyed ages
   * included."* So this row reuses `EditGlyph`, `StateBadge` and `InRowNum` exactly as the rows
   * around it do; nothing new was drawn for it.
   *
   * WHY IT EXISTS. A V2 household run credits water by age (Table 9: under-5 0.9 L, 5-18 3.0 L,
   * adults 4.0 L). The engine has always preferred a project's surveyed split over the country's
   * census shares, and the seat had no field to pass one — so the QPW slider read "4.0 L · default"
   * while the credited volume was the weighted figure, two numbers for one parameter with no line
   * explaining the second. The weighted value is now shown on this row with the shares that produced
   * it.
   *
   * IT ONLY APPEARS ON A TABLE 9 RUN. An entered per-person volume (design value or a Water
   * Consumption Field Test) switches the engine to the flat basis, where no age split is read — so
   * showing the row there would offer a control that changes nothing.
   *
   * THE SHARES MUST SUM TO 1, AND THE ROW REFUSES OTHERWISE — it holds what was typed, says so, and
   * does not write to the engine until the three agree. A split summing to less than one would
   * silently credit the missing share of the population at nothing; a visible refusal is the honest
   * alternative.
   */
  const t9 = result.table9;
  const ageSplitRow = (() => {
    if (!v2 || !t9) return null;
    const entered = state.ageSharesEntered;
    const shown = entered ?? {
      under5: t9.ageShares.under5,
      age5_18: t9.ageShares.age5_18,
      adult19plus: t9.ageShares.adult19plus,
    };
    const pct = (v: number) => Math.round(v * 1000) / 10;
    const sum = shown.under5 + shown.age5_18 + shown.adult19plus;
    const sums = Math.abs(sum - 1) < 0.005;
    /** Write one share; the engine only sees the split once all three sum to 1. */
    const setShare = (key: "under5" | "age5_18" | "adult19plus", percent: number) => {
      const next = { ...shown, [key]: Math.max(0, percent) / 100 };
      patch({ ageSharesEntered: next });
    };
    const field = (key: "under5" | "age5_18" | "adult19plus", label: string) => (
      <span className="flex items-baseline gap-1">
        <span className="t-caption text-fg-4" style={{ fontSize: 10 }}>{label}</span>
        {/* 68px, not 54: a share prints as four characters (two digits, a point, one digit) and the narrower field clipped
            the last glyph on the walk — measured, scrollWidth 55 against a 54px box. */}
        <InRowNum value={pct(shown[key])} onChange={(v) => setShare(key, v)} step={0.1} width={68} />
      </span>
    );
    return (
      <div className="py-1">
        <div className="flex items-baseline gap-2">
          <span className="t-caption flex-1 text-fg-2">age split — share of people, %</span>
          <span className="t-mono shrink-0 rounded-sm px-1" style={{ fontSize: 8, letterSpacing: "0.06em", color: "var(--fg-1)", background: "color-mix(in oklab, var(--tide) 12%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--tide) 40%, transparent)" }}>V2.0 SDWS 30</span>
          <BaselineChip sdws="V2.0 SDWS 30" />
          <StateBadge
            state={entered ? "entered" : "default"}
            tip={entered
              ? "The project's own surveyed age split, entered for this analysis. Clear the fields to fall back to the national shares."
              : "UN WPP 2024 national shares — a census estimate for the whole country, not this project's survey."}
          />
          <EditGlyph title="Enter the baseline survey's age split (V2.0 SDWS 30)" />
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          {field("under5", "under 5")}
          {field("age5_18", "5–18")}
          {field("adult19plus", "19+")}
        </div>
        {/* C3: the UN shares are called a DEFAULT and an ESTIMATE, in so many words. */}
        <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
          {entered
            ? `Override — default: UN WPP 2024 ${fmt(t9.ageShares.under5 * 100, 1)} / ${fmt(t9.ageShares.age5_18 * 100, 1)} / ${fmt(t9.ageShares.adult19plus * 100, 1)} · this analysis: ${fmt(shown.under5 * 100, 1)} / ${fmt(shown.age5_18 * 100, 1)} / ${fmt(shown.adult19plus * 100, 1)} (survey).`
            : t9.ageShares.source === "country"
              ? "UN WPP 2024 national shares — a census estimate for the country, not this project's survey. The held V1.0 baseline questionnaire never asks an age, so this is the honest fallback until a survey that does is uploaded."
              : "Global default age shares — no national row for this country. An estimate, not this project's survey."}
        </div>
        <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
          Weighted volume {fmt(result.qpwEffective, 2)} L/p/d — Table 9 tiers (under-5 0.9 · 5–18 3.0 · adults 4.0) weighted by these shares
          {t9.suppressedDemandApplied ? ", after the 5% suppressed-demand deduction" : ""}.
        </div>
        {!sums ? (
          <p className="t-caption" style={{ fontSize: 10, color: "var(--amber)" }}>
            The three shares must add up to 100% — they currently add up to {fmt(sum * 100, 1)}%. The credited volume still uses the
            last split that did, and this one is not passed to the calculation until it adds up.
          </p>
        ) : null}
      </div>
    );
  })();

  /**
   * THE BASELINE STOVE AND FUEL ROWS ARE TYPED BOXES (Amy's ruling (1), 2026-09-26; [#213]).
   *
   * What is typed is what a baseline survey reports: the share of each stove class (V2.0 SDWS 6)
   * and the share of each fuel (V2.0 SDWS 8). The η beside each class and the emission factors
   * beside each fuel stay the rulebook's and are printed, not offered — they have their own rows
   * and their own sources (SDWS 11; SDWS 9/10).
   *
   * Built from the age-split row's parts — `InRowNum`, `BaselineChip`, `StateBadge`, `EditGlyph` —
   * so the new boxes read like every other box on the page. The boxes open on the preset's own
   * shares, so a reader sees the numbers in force before typing anything.
   *
   * ⚠ THE 100% GUARD IS THE ENGINE'S. A list that does not add up is kept on screen as typed, and
   * the row prints the engine's own reason for holding it (`result.baselineMix.held`) — so the
   * warning and the number in force come from one place and cannot disagree.
   */
  const bothPreset = result.baselineMix.stove === "preset" && result.baselineMix.fuel === "preset";
  const anyEnteredMix = result.baselineMix.stove === "entered" || result.baselineMix.fuel === "entered";
  const halfWords = (src: string, half: string) =>
    src === "entered" ? `${half} shares entered`
      : src === "country-default" ? `${half} shares: country default (cited below)`
        : `${half} shares: screening preset, no source yet — replaced by country data or your baseline survey`;
  const baselineMixRows = (() => {
    const fromPreset = presetShares("traditional-wood-cws");
    // The boxes open on the shares IN FORCE: typed, else the country default, else the preset.
    const inForce = result.baselineMix.shares;
    const stove = state.stoveSharesEntered ?? inForce?.stove ?? fromPreset?.stove;
    const fuelRaw = state.fuelSharesEntered ?? inForce?.fuel ?? fromPreset?.fuel;
    if (!stove || !fuelRaw) return null;
    // A list saved before a fuel was added reads that fuel as zero.
    const fuel = Object.fromEntries(FUEL_SHARE_KEYS.map((k) => [k, fuelRaw[k] ?? 0])) as Record<(typeof FUEL_SHARE_KEYS)[number], number>;
    const countryStove = result.baselineMix.country?.stove;
    const countryFuel = result.baselineMix.country?.fuel;
    const tagFor = (src: string): EditState => (src === "entered" ? "entered" : src === "country-default" ? "default" : "assumed");
    const pct = (v: number) => Math.round(v * 1000) / 10;
    const charcoalChosen = state.charcoalConvention ?? defaultCharcoalConvention(projectFacts(state).countryIso);
    const charcoalPreselected = state.charcoalConvention === undefined && charcoalChosen !== undefined;
    const box = (value: number, onChange: (v: number) => void, label: string, aside?: string) => (
      <span className="flex items-baseline gap-1">
        <span className="t-caption text-fg-4" style={{ fontSize: 10 }}>{label}</span>
        <InRowNum value={pct(value)} onChange={onChange} step={0.1} width={68} />
        {aside ? <span className="t-mono text-fg-4" style={{ fontSize: 9 }}>{aside}</span> : null}
      </span>
    );
    const clearButton = (what: string, onClear: () => void) =>
      readOnlySeat ? null : (
        <button type="button" onClick={onClear} className="t-caption text-fg-3 underline outline-none focus-visible:ring-2 focus-visible:ring-tide" style={{ fontSize: 10 }}>
          back to the preset&rsquo;s {what}
        </button>
      );
    return (
      <>
        <div className="py-1">
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">stove shares — share of premises, %</span>
            <BaselineChip sdws="V2.0 SDWS 6" />
            <StateBadge
              state={tagFor(result.baselineMix.stove)}
              tip={result.baselineMix.stove === "entered"
                ? "Entered for this project — the share of premises using each stove class (V2.0 SDWS 6)."
                : countryStove
                  ? `${countryStove.label}. A cited national figure (V2.0 SDWS 6 accepts official statistics); the project's own baseline survey replaces it.`
                  : "The screening preset's stoves — no source yet; replaced by country data or your baseline survey. Type the survey's shares here (V2.0 SDWS 6)."}
            />
            <EditGlyph title="Type the baseline survey's stove shares (V2.0 SDWS 6)" />
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            {STOVE_SHARE_KEYS.map((k) =>
              <span key={k}>{box(
                stove[k],
                (v) => patch({ stoveSharesEntered: { ...stove, [k]: Math.max(0, v) / 100 } }),
                STOVE_CLASS_LABEL[k],
                k === "fossil" ? undefined : `η ${fmt(DEFAULT_STOVE_ETA[state.version][k] * 100, 0)}%`,
              )}</span>,
            )}
          </div>
          {stove.fossil > 0 ? (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="t-caption flex-1 text-fg-3" style={{ fontSize: 10 }}>
                fossil fuel system η, % — manufacturer specification or a Water Boiling Test; the rulebook gives no default ({sdwsRef(basis, "eta")})
              </span>
              <StateBadge state={state.fossilStoveEta != null ? "entered" : "assumed"} tip="No default exists for this class (SDWS 11), so the stove shares are not used until it is entered." />
              <InRowNum value={state.fossilStoveEta != null ? pct(state.fossilStoveEta) : undefined} onChange={(v) => patch({ fossilStoveEta: Math.max(0, v) / 100 })} onClear={() => patch({ fossilStoveEta: undefined })} optional step={1} width={68} />
            </div>
          ) : null}
          {countryStove && result.baselineMix.stove === "country-default" ? (
            <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
              {countryStove.label}. {countryStove.notes.join(" ")}
            </div>
          ) : null}
          {state.stoveSharesEntered ? clearButton("stoves", () => patch({ stoveSharesEntered: undefined, fossilStoveEta: undefined })) : null}
        </div>
        <div className="py-1">
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">fuel shares — share of boiling fuel, %</span>
            <BaselineChip sdws="V2.0 SDWS 8" />
            <StateBadge
              state={tagFor(result.baselineMix.fuel)}
              tip={result.baselineMix.fuel === "entered"
                ? "Entered for this project — the share of each boiling fuel (V2.0 SDWS 8). Emission factors per fuel are the rulebook's (SDWS 9/10)."
                : countryFuel
                  ? `${countryFuel.label}. A cited national figure (V2.0 SDWS 8 accepts official statistics); the project's own baseline survey replaces it.`
                  : "The screening preset's fuels — no source yet; replaced by country data or your baseline survey. Type the survey's shares here (V2.0 SDWS 8)."}
            />
            <EditGlyph title="Type the baseline survey's fuel shares (V2.0 SDWS 8)" />
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            {FUEL_SHARE_KEYS.map((k) =>
              <span key={k}>{box(fuel[k], (v) => patch({ fuelSharesEntered: { ...fuel, [k]: Math.max(0, v) / 100 } }), FUEL_LABEL[k])}</span>,
            )}
          </div>
          {/* THE FACTOR LABELS (Amy's rulings 3 and 4, 2026-09-26): a fuel whose factor is not a
              rulebook figure says so, beside the share it applies to — printed only where it is in use. */}
          {FUEL_SHARE_KEYS.filter((k) => fuel[k] > 0 && FUEL_FACTOR_NOTE[k]).map((k) => (
            <div key={k} className="t-caption text-fg-4" style={{ fontSize: 10 }}>
              {FUEL_LABEL[k]}: {FUEL_FACTOR_NOTE[k]}.
            </div>
          ))}
          {countryFuel && result.baselineMix.fuel === "country-default" ? (
            <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
              {countryFuel.label}. {countryFuel.notes.join(" ")}
            </div>
          ) : null}
          {fuel.charcoal > 0 ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="t-caption flex-1 text-fg-3" style={{ fontSize: 10 }}>
                charcoal factor set (V2.0 SDWS 9, p.51){charcoalPreselected ? " — pre-selected: this country is in Sub-Saharan Africa" : ""}
              </span>
              <select
                value={charcoalChosen ?? ""}
                disabled={readOnlySeat}
                onChange={(e) => patch({ charcoalConvention: (e.target.value || undefined) as CharcoalConvention | undefined })}
                className="t-mono rounded-sm border border-line bg-card text-fg-1 outline-none focus:border-tide focus:ring-2 focus:ring-tide"
                style={{ fontSize: 11, padding: "1px 4px" }}
              >
                <option value="">choose…</option>
                <option value="6:1">WCCF 6:1 — Sub-Saharan Africa and LDCs</option>
                <option value="4:1">WCCF 4:1 — other regions</option>
                <option value="combustion-only">combustion only</option>
              </select>
            </div>
          ) : null}
          <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            Emission factors in force: {result.fuelMix.map((f) => `${f.fuel} ${f.ef_co2}/${f.ef_nonco2 ?? 0}`).join(" · ")} tCO₂(e)/TJ ({sdwsRef(basis, "EFco2")} / {sdwsRef(basis, "EFnonco2")}).
          </div>
          {state.fuelSharesEntered ? clearButton("fuels", () => patch({ fuelSharesEntered: undefined, charcoalConvention: undefined })) : null}
        </div>
        {result.baselineMix.held.map((h, i) => (
          <p key={i} className="t-caption" style={{ fontSize: 10, color: "var(--amber)" }}>{h}</p>
        ))}
      </>
    );
  })();

  const qpwParam = (
    <>
      <Param label="QPW_p — litres / person / day" sdwsRef={sdwsRef(basis, "QPW")} value={state.litresPerPersonPerDay} changed={changed.qpw || state.qpwEntered}
        onChange={(v) => patch({ litresPerPersonPerDay: v, qpwEntered: true })} min={0} max={20} step={0.1} unit="L"
        // ⚠ ON A TABLE 9 RUN THE SLIDER IS NOT THE CREDITED NUMBER, AND THE CAPTION NOW SAYS SO.
        // The slider sits at the ADULT tier default (4.0) while the engine credits the age-weighted
        // figure — two numbers for one parameter, which is exactly what [#215] was logged for. The
        // age-split row below carries the weighted value and its derivation; this line points at it
        // rather than leaving a reader to reconcile them.
        baseline={v2
          ? (t9
              ? `rulebook 4.0 L/p/d (Table 9, adults) — the CREDITED volume is the age-weighted ${fmt(result.qpwEffective, 2)} L/p/d on the age-split row below; cap 5.5`
              : "rulebook default 4.0 L/p/d (Table 9, adults); cap 5.5")
          : "rulebook default 4 L/p/d (V1.0 SDWS 24); cap 5.5"}
        tip={v2
          ? "Daily drinking water per person. Default 4.0 L/p/d for adults (V2.0 Table 9, V2.0 SDWS 29 Option 1) unless a design value or a Water Consumption Field Test is entered; capped at 5.5."
          : "Daily drinking water per person. Default 4 L/p/d (V1.0 SDWS 24) unless a design value or a Water Consumption Field Test is entered; capped at 5.5."} />
      {state.litresPerPersonPerDay > 5.5 ? (
        <p className="t-caption" style={{ fontSize: 10, color: "var(--amber)" }}>
          Capped to 5.5 L/p/d ({v2 ? "V2.0 Table 9" : "V1.0 SDWS 24"}) in the credited volume — entered {fmt(state.litresPerPersonPerDay, 1)}.
        </p>
      ) : null}
      {ageSplitRow}
    </>
  );
  const doParam = (
    <Param label={`${m2 ? "DP" : "DO"} — operational days / yr`} sdwsRef={sdwsRef(basis, m2 ? "DP" : "DO")} value={state.operationalDays} changed={changed.do}
      onChange={(v) => patch({ operationalDays: v })} min={0} max={365} step={1} unit="d"
      baseline="365 (full year)" tip="Days per year the system serves water." />
  );
  // N_p premises input — Method 2 (HWT/IWT) only. ProjectContext-driven: seeded from the record's
  // units fact, overridable for this analysis. Decomposes people into premises × per-premises.
  const npInput = (
    <div className="py-1">
      <div className="flex items-baseline gap-2">
        <span className="t-caption flex-1 text-fg-2">Households served (N_p)</span>
        <MonitoringChip sdws={sdwsRef(basis, "Np")} instrument="sales or distribution records" />
        <StateBadge state={state.premises != null || npFromRecord ? "entered" : "derived"} tip="The households with a treatment device. It comes from the project record — the household count itself, or the people count divided by the household size. Type a figure to record a different count for this analysis." />
        <EditGlyph title="Enter the households served (N_p)" />
        <InRowNum value={state.premises ?? result.premises} onChange={(v) => patch({ premises: v })} onClear={() => patch({ premises: undefined })} optional width={92} />
      </div>
      {/* HN_p IS PRINTED TO THE SAME PRECISION AS THE HOUSEHOLD SIZE ABOVE, and says outright when
          the two are the same number ([#225] requirement 3). A household size from the project record
          shows to two decimals; printed to one decimal beside it, the same value would look like a
          different number — two numbers that ARE equal, shown so they look like they disagree. */}
      <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
        {result.premises != null && result.individualsPerPremises != null
          ? `HN_p = ${fmt(result.individualsPerPremises, 2)} people/household (people ÷ households).${
              npFromRecord
                ? ` Worked out from the project record — so HN_p is the household size used above (${fmt(result.householdSizeUsed ?? result.individualsPerPremises, 2)}).`
                : state.premises != null && result.householdSizeUsed != null
                  ? " This count was entered for this analysis, so HN_p is people ÷ that figure — not the household size above."
                  : ""
            }`
          : `Enter the households served (${sdwsRef(basis, "Np")}, sales/distribution records) so Eq.6 can run; without them the people-basis aggregate is used.`}
      </div>
    </div>
  );
  // Eq.7's device term — q_i (V2.0 SDWS 13, manufacturer specs), t_p (V2.0 SDWS 35,
  // default 5 h), DN_p (V2.0 SDWS 37, sales records). Without q_i the MIN is not evaluated, and the row says so
  // (reviewer comment 1.2: the v0.1.0 report claimed Eq.7 on a value it never produced).
  const deviceInputs = (
    <div className="py-1">
      <div className="flex items-baseline gap-2">
        <span className="t-caption flex-1 text-fg-2">q_i — device capacity (L/h)</span>
        <StateBadge
          state={state.deviceCapacityLPerHour != null ? "entered" : "assumed"}
          tip={state.deviceCapacityLPerHour != null
            ? `Litres per hour the device treats, from the manufacturer's specification (${sdwsRef(basis, "qi")}). With it, Eq.7 caps the per-premises volume at q_i × hours × devices.`
            : `Nothing entered, so no device limit is assumed — Eq.7's MIN is not evaluated and QPW_hh is HN_p × QPW_p. The figure comes from the manufacturer's specification (${sdwsRef(basis, "qi")}).`}
        />
        <EditGlyph title="Enter the device capacity (q_i)" />
        <InRowNum value={state.deviceCapacityLPerHour} onChange={(v) => patch({ deviceCapacityLPerHour: v })} onClear={() => patch({ deviceCapacityLPerHour: undefined })} optional width={92} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="t-caption flex-1 text-fg-2">t_p — hours used / day</span>
        <MonitoringChip sdws={sdwsRef(basis, "tp")} instrument="usage survey" />
        <StateBadge state={state.usageHoursPerDay != null ? "entered" : "default"} tip={`Hours a day the device is used (${sdwsRef(basis, "tp")}). Default 5 h (Option 1).`} />
        <EditGlyph title="Enter usage hours (t_p)" />
        <InRowNum value={state.usageHoursPerDay ?? 5} onChange={(v) => patch({ usageHoursPerDay: v })} onClear={() => patch({ usageHoursPerDay: undefined })} optional width={92} />
      </div>
      {/* DN_p, DEVICES PER HOUSEHOLD — A PROJECT FACT, SHOWN ONLY WITH A FLOW RATE (Amy, 2026-10-23).
          It changes a number only through Eq.7's device cap, and that cap needs q_i, so without a
          flow rate the row would ask for a fact that changes nothing. It starts at 1, the lowest and
          safest cap; a value the person types must be a whole number, 1 or more, and anything else
          is refused here, in words, before the engine sees it. */}
      {state.deviceCapacityLPerHour != null && state.deviceCapacityLPerHour > 0 ? (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">DN_p — devices per household</span>
            <MonitoringChip sdws={sdwsRef(basis, "DN")} instrument="sales or distribution records" />
            <StateBadge state={state.devicesPerPremises != null ? "entered" : "assumed"} tip={`Average devices per household, from sales or distribution records (${sdwsRef(basis, "DN")}). A whole number, 1 or more.`} />
            <EditGlyph title="Enter devices per household (DN_p)" />
            <InRowNum
              value={state.devicesPerPremises ?? 1}
              onChange={(v) => {
                if (validDevicesPerPremises(v)) {
                  setDnRefused(false);
                  patch({ devicesPerPremises: v });
                } else setDnRefused(true);
              }}
              onClear={() => setDnRefused(true)}
              optional
              min={1}
              width={92}
            />
          </div>
          <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            {dnRefused
              ? `${DEVICES_PER_PREMISES_RULE} The calculator keeps ${state.devicesPerPremises ?? 1} until then.`
              : state.devicesPerPremises != null
                ? "entered"
                : "assumed — lowest, safest; enter your own"}
          </div>
        </div>
      ) : null}
      <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
        {result.deviceLimitEvaluated
          ? `Eq.7: q_i · t_p · DN_p = ${fmt(result.deviceCapacityLPerDay ?? 0, 1)} L/premises/day — ${result.deviceMinApplied ? "the device capacity binds." : "the people term binds."}`
          : `Filter limit not checked (Eq.7) — enter q_i (${sdwsRef(basis, "qi")}). Until then QPW_hh = HN_p × QPW_p.`}
      </div>
    </div>
  );

  const qpwHhStr = result.qpwPerPremises != null ? `${fmt(result.qpwPerPremises, 1)} L/prem·d` : "— (enter N_p)";

  // Method 1: population-basis Eq.5. Method 2: per-premises Eq.7 (QPW_hh) → Eq.6 (Q_pop).
  const method1Quantity = (
    <EqRow eqNum="5" symbol="Q_pop" title="Clean water the community uses / yr" formula="people · min(L/p/d, 5.5) · days" value={ML(result.Q_pop) + "/yr"}
      oneLiner="The clean water the community uses in a year — people times daily need times operating days. Serving more water avoids more boiling."
      open={open.has("q_pop")} onToggle={() => toggle("q_pop")} editable cite={citeShort(basis, "qMethod1")}>
      {populationRow}
      {qpwParam}
      {doParam}
      <LiveRow><span className="text-fg-1">{fmt(result.people, 0)}</span> · <span className="text-fg-1">{fmt(result.qpwEffective, 1)}</span> · <span className="text-fg-1">{fmt(state.operationalDays, 0)}</span> = <span style={{ color: "var(--tide)" }}>{ML(result.Q_pop)}/yr</span></LiveRow>
    </EqRow>
  );
  const method2Quantity = (
    <>
      <EqRow eqNum="7" symbol="QPW_hh" title="Clean water per premises / day" formula="min( q_i·t_p·DN_p , HN_p · QPW_p )" value={qpwHhStr}
        flag={result.deviceLimitEvaluated ? undefined : "filter limit not checked"}
        oneLiner="Safe water each household or institution gets per day — the smaller of what the device can treat (capacity × hours × devices) and what the people need (people per premises × daily need)."
        open={open.has("qpw_hh")} onToggle={() => toggle("qpw_hh")} editable cite={citeShort(basis, "qpwHh")}>
        {populationRow}
        {npInput}
        {qpwParam}
        {deviceInputs}
        <LiveRow>HN_p = <span className="text-fg-1">{result.individualsPerPremises != null ? fmt(result.individualsPerPremises, 1) : "—"}</span> · QPW_p <span className="text-fg-1">{fmt(result.qpwEffective, 1)}</span>{result.deviceLimitEvaluated ? <> vs device <span className="text-fg-1">{fmt(result.deviceCapacityLPerDay ?? 0, 1)}</span></> : null} = <span style={{ color: "var(--tide)" }}>{qpwHhStr}</span></LiveRow>
      </EqRow>
      <EqRow eqNum="6" symbol="Q_pop" title="Clean water all premises use / yr" formula={v2 ? "N_p · QPW_hh · DP_p" : "N_p · U_p · QPW_hh · DP_p"} value={ML(result.Q_pop) + "/yr"}
        oneLiner="The clean water all served premises use in a year — premises times per-premises volume times operating days. Serving more water avoids more boiling."
        open={open.has("q_pop")} onToggle={() => toggle("q_pop")} editable cite={citeShort(basis, "qMethod2")}>
        <VarRow label="N_p — premises (Eq.7)" value={result.premises != null ? fmt(result.premises, 0) : "—"} state="derived" tip="Premises count, entered in the QPW_hh row above." />
        <VarRow label="QPW_hh — per-premises volume (Eq.7)" value={qpwHhStr} state="derived" tip="Per-premises daily volume from Eq.7." />
        {/* U_p SHOWS ONCE, IN ITS ENTRY BOX (Amy's ruling (3), 2026-09-26). Under V2.0 that box is in
            Eq.8, where U_p is applied; here it is only referenced, never printed as a second value. */}
        {v2 ? (
          <p className="t-caption py-1 text-fg-4" style={{ fontSize: 10 }}>
            U_p (usage rate) is not in Eq.6 under V2.0 — it is applied in Eq.8 (Q_adj), where it is entered.
          </p>
        ) : (
          <Param monitor={mon("Up", "usage survey")} label="U_p,y — usage rate" sdwsRef={sdwsRef(basis, "Up")} value={state.usageRate} changed={state.usageRate !== 1} onChange={(v) => patch({ usageRate: v })} min={0} max={1} step={0.01} unit="" baseline="1.0 (full use)" tip="Under V1.0, U_p is folded into Eq.6 (Q_pop). Fraction of the time the device is actually used." />
        )}
        {doParam}
        <LiveRow><span className="text-fg-1">{result.premises != null ? fmt(result.premises, 0) : fmt(result.people, 0)}</span>{v2 ? "" : ` · U_p ${fmt(state.usageRate, 2)}`} · QPW_hh · DP_p <span className="text-fg-1">{fmt(state.operationalDays, 0)}</span> = <span style={{ color: "var(--tide)" }}>{ML(result.Q_pop)}/yr</span></LiveRow>
      </EqRow>
    </>
  );

  return (
    <section className="rounded-lg border border-line bg-card" style={{ padding: "14px 20px 8px" }}>
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <span className="eyebrow">{v2 ? "PAA v2.0" : "Legacy V1.0"} · derivation</span>
        <span className="t-mono text-fg-4" style={{ fontSize: 10 }}>Method {state.method}</span>
      </div>
      <p className="t-caption text-fg-4" style={{ fontSize: 10 }}>Shown in computation order; Eq. numbers cite the methodology. Click a row to expand.</p>
      {/* THE LEGEND HAS TO CHANGE WITH THE GLYPHS ([#97]). `EditGlyph` renders nothing on a
          read-only seat, so the original sentence would have become "Values marked  can be
          adjusted or overridden" — a broken sentence describing an affordance that is not on
          screen. Two sentences, each true of the seat it appears on. */}
      {readOnlySeat ? (
        <p className="t-caption mt-1 text-fg-3" style={{ fontSize: 10 }}>
          This analysis is read-only for you. Every value is shown as saved, with its source
          and equation, and none of them can be changed here.
        </p>
      ) : (
        <p className="t-caption mt-1 flex items-center gap-1 text-fg-3" style={{ fontSize: 10 }}>
          Values marked <EditGlyph title="edit affordance" /> can be typed over — doing so tags them ENTERED. DERIVED values are computed here and cannot be typed over.
        </p>
      )}

      {/* ══ Baseline emissions (BE) ══ */}
      <Section title="Baseline emissions (BE)" />

      <EqRow eqNum="—" symbol="profile" title="Baseline profile (stoves & fuel replaced)" formula="stove strata × fuel mix" value={`η ${fmt(etaPct, 0)}%`}
        // [V1 §3.6.1 p.11 / V2 §7.3.7 p.28] — the old way people made water safe sets EF_b.
        oneLiner="The old way people made water safe — the stoves and fuels the project replaces. These assumptions set the emission factor." open={open.has("profile")} onToggle={() => toggle("profile")} editable cite={citeShort(basis, "profile")}>
        {/* THE ROW NAMES WHAT IT ASSUMED, AND ADMITS THERE IS NO SOURCE (Amy's ruling (4),
            2026-09-24). "Not surveyed" reads as *not confirmed yet*; "screening preset, no source"
            says plainly that nothing stands behind the number. The two are different admissions and
            only the second is true here. A baseline survey (V2.0 SDWS 6 stove shares, V2.0 SDWS 8
            fuel shares) replaces it — which is what the teal marks on the rows below mean. */}
        {bothPreset ? (
          <>
            <VarRow
              label={`preset — ${preset.label}`}
              value={presetMixSummary}
              state="assumed"
              tip="Screening preset, no source yet — replaced by country data or your baseline survey. Nobody surveyed this project's stoves and fuels; this is the mix we assume for a first look. A baseline survey (V2.0 SDWS 6 stove shares, V2.0 SDWS 8 fuel shares) replaces it — type its shares in the boxes below."
            />
            <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
              Screening preset, no source yet — replaced by country data or your baseline survey (V2.0 SDWS 6, V2.0 SDWS 8).
            </div>
          </>
        ) : (
          <>
            <VarRow
              label={anyEnteredMix ? "baseline mix — entered for this project" : "baseline mix — country default"}
              value={presetMixSummary}
              state={anyEnteredMix ? "entered" : "default"}
              tip={anyEnteredMix
                ? "The stove and fuel shares typed below, from this project's baseline survey or another source the rulebook accepts (V2.0 SDWS 6 and SDWS 8)."
                : "Cited national figures for this country (V2.0 SDWS 6 and SDWS 8 accept official statistics) in place of the screening preset. The project's own baseline survey replaces them."}
            />
            <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
              {halfWords(result.baselineMix.stove, "Stove")} · {halfWords(result.baselineMix.fuel, "fuel")}.
            </div>
          </>
        )}
        {baselineMixRows}
      </EqRow>

      <EqRow eqNum="2" symbol="SE" title="Energy to boil one litre" formula="360.83 / η" value={`${fmt(result.SE, 1)} kJ/L`}
        oneLiner="Energy to safely boil one litre on a baseline stove. A more efficient stove burns less fuel, so higher efficiency means fewer credits."
        open={open.has("se")} onToggle={() => toggle("se")} editable cite={citeShort(basis, "se")}>
        {etaParam}
        <LiveRow>η = <span className="text-fg-1">{fmt(etaPct, 0)}%</span> → SE = <span style={{ color: "var(--tide)" }}>{fmt(result.SE, 1)} kJ/L</span></LiveRow>
      </EqRow>

      <EqRow eqNum="1" symbol="EF_b" title="Emissions per litre boiled (baseline)" formula="SE · (EF_CO₂ · fNRB + EF_nonCO₂) / 10⁹" value={`${fmtExp(result.result.EF_b, 3)} tCO₂e/L`}
        oneLiner="Greenhouse gas released per litre boiled with firewood the old way. The larger this factor, the more emissions the project avoids."
        open={open.has("ef_b")} onToggle={() => toggle("ef_b")} editable cite={citeShort(basis, "efb")}>
        <VarRow label="SE (Eq.2)" value={fmt(result.SE, 1)} unit="kJ/L" state="derived" tip="Specific energy, computed in Eq.2 (SE = 360.83/η)." />
        <VarRow label="EF_CO₂ — wood combustion" value="112" unit="tCO₂/TJ" state="default" tip={`Wood CO₂ emission factor — IPCC 2006 default (${sdwsRef(basis, "EFco2")}).`} />
        <VarRow label="EF_nonCO₂ — CH₄ + N₂O (AR5)" value="9.46" unit="tCO₂e/TJ" state="default" tip={`Wood non-CO₂ emission factor — IPCC 2006 / AR5 GWP (${sdwsRef(basis, "EFnonco2")}).`} />
        {/* fNRB — VERSION-SCOPED overridable value: PAA on the current vintage; Legacy on the V1
            convention — THE PROJECT'S OWN FILED VALUE, and nothing else (R1 amended, 2026-09-24).
            Clearing it on the Legacy path does not fall back to anything: the transition stops and
            the seat asks for the value again. Source labeled per version. */}
        <div className="py-1">
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">fNRB — non-renewable biomass · {result.fnrbVintage}</span>
            <StateBadge
              state={fnrbSet ? "entered" : "default"}
              tip={isLegacyV
                ? "V1-faithful fNRB: the value this project filed under V1.0 (V1.0 SDWS 21, p.32, which points to CDM TOOL30) — the figure it was credited on. The transition cannot run without it, and nothing is substituted for it."
                : fnrbRegional
                  ? `No A6.4-AMT-009 Table 3 national value covers this country, so Table 2's official multi-national value for ${fnrbRegional.region} is used (V2.0 SDWS 25). Enter a filed current value to override.`
                  : "A6.4-AMT-009 Table 3 national default (V2.0 SDWS 25; the same value as CDM TOOL33 v03.0, origin MoFuSS 2024); enter a filed current value to override."}
            />
            <EditGlyph title={isLegacyV ? "Enter your filed V1 fNRB" : "Enter a filed fNRB to override the lookup"} />
            <InRowNum
              value={fnrbField ?? result.fNRB}
              onChange={(v) => patch(isLegacyV ? { fnrbFiledV1: v } : { fnrbOverride: v })}
              onClear={() => patch(isLegacyV ? { fnrbFiledV1: null } : { fnrbOverride: null })}
              optional step={0.001} width={80}
            />
          </div>
          {/* THE PROVENANCE STAYS; THE INSTRUCTION GOES ([#97]). Where this value CAME FROM is a
              fact a reader needs — "country lookup", "override, filed" — but *"Overtype to file
              your own value"* is an instruction for someone who can. On a read-only seat the
              sentence keeps the source and drops the verb. */}
          <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>
            {isLegacyV
              ? (fnrbSet
                  ? `Filed value — V1 filing (${fmt(fnrbField ?? 0, 3)}).${readOnlySeat ? "" : " Clearing it stops the transition; nothing is substituted for it."}`
                  : `No filed V1 fNRB on the record — the transition cannot run.${readOnlySeat ? "" : " Enter the value this project filed under V1.0 (V1.0 SDWS 21, p.32)."}`)
              : (fnrbSet
                  ? `Entered — filed current fNRB ${fmt(fnrbField ?? 0, 3)}.${readOnlySeat ? "" : ` Clear to revert to the ${result.fnrbVintage} lookup.`}`
                  : `${fnrbRegional
                        ? `No national default for this country — A6.4-AMT-009 Table 2 multi-national value for ${fnrbRegional.region}.`
                        : `A6.4-AMT-009 Table 3 national default (${result.fnrbVintage}).`}${readOnlySeat ? "" : " Overtype to file your own value; clear to revert."}`)}
          </div>
          {/* THE QUARTILE DIAL IS RETIRED FOR fNRB (calculator v0.10.0, Amy's ruling (3), 2026-09-21).
              A country with no national row now takes A6.4-AMT-009 Table 2's official multi-national
              value for its UN M49 region, and there is nothing for a consultant to pick among. When
              that value is in force the report and this note print footnote 5's condition, because a
              multi-national value carries one. The dial itself stays in use for household size. */}
          {fnrbRegional ? (
            <div
              className="mt-2 overflow-hidden rounded-md p-2"
              style={{
                border: "1px solid var(--amber)",
                background: "color-mix(in oklab, var(--amber) 8%, transparent)",
              }}
            >
              <span className="eyebrow warn" style={{ fontSize: 9 }}>No national value — official regional value</span>
              <div className="t-caption mt-1 text-fg-3" style={{ fontSize: 10 }}>{fnrbRegionalLabel}</div>
              <div className="t-caption mt-1 text-fg-4" style={{ fontSize: 10 }}>{fnrbRegional.condition}</div>
            </div>
          ) : null}
        </div>
        <LiveRow>fNRB = <span className="text-fg-1">{fmt(result.fNRB, 2)}</span>, SE = <span className="text-fg-1">{fmt(result.SE, 0)}</span> → EF_b = <span style={{ color: "var(--tide)" }}>{fmtExp(result.result.EF_b, 3)}</span></LiveRow>
      </EqRow>

      {m2 ? method2Quantity : method1Quantity}

      <EqRow eqNum="4" symbol="Q_y" title="Credited water volume" formula="MIN( Q_pop , Q_m )" value={ML(result.result.Q_y) + "/yr"}
        oneLiner="Credited volume is the smaller of what people need and what the project actually supplies — you can't claim more water than you deliver."
        binding={result.Q_m === null ? "No metered volume entered — population (Q_pop) binds." : result.Q_m < result.Q_pop ? `Metered volume binds — Q_m ${ML(result.Q_m)} < Q_pop.` : `Population binds — Q_pop ≤ Q_m ${ML(result.Q_m)}.`}
        open={open.has("q_y")} onToggle={() => toggle("q_y")} editable cite={citeShort(basis, "qy")}>
        <VarRow label={`Q_pop (Eq.${m2 ? "6" : "5"})`} value={ML(result.Q_pop)} unit="/yr" state="derived" tip={`Quantity of safe water from Eq.${m2 ? "6" : "5"}.`} />
        <div className="py-1">
          <div className="flex items-baseline gap-2">
            <span className="t-caption flex-1 text-fg-2">Q_m — {state.mode === "ex-post" ? "metered volume" : "planned production"} / yr</span>
            <StateBadge
              state={state.meteredVolumeL != null ? "entered" : "assumed"}
              tip={state.meteredVolumeL != null
                ? "Metered or planned supplied volume, entered for this project."
                : "Nothing entered, so no supply cap is assumed — Eq.4's MIN has only the population term to take, and Q_pop binds."}
            />
            <EditGlyph title="Enter a metered / planned volume" />
            <InRowNum value={state.meteredVolumeL} onChange={(v) => patch({ meteredVolumeL: v })} onClear={() => patch({ meteredVolumeL: null })} optional width={108} />
            <span className="t-mono shrink-0 text-fg-4" style={{ fontSize: 10 }}>L/yr</span>
          </div>
          <div className="t-caption text-fg-4" style={{ fontSize: 10 }}>Optional — blank = no metering cap (population binds).</div>
        </div>
      </EqRow>

      {v2 ? paaTail(result, open, toggle, xcbParam, mqParam, cbParam, state, patch) : legacyTail(result, open, toggle, cbParam, xcbParam, mqParam)}
      {/* version-scoped citations flow through citeShort(basis, key); see ./citations */}

      {/* ══ Emission reductions (credits) ══ */}
      <Section title="Emission reductions (credits)" />
      <EqRow eqNum={v2 ? "22" : "11"} symbol="ER_y" title="Emission reductions — the credits" formula={v2 ? "(BE_y − AE_y) − LE_y" : "BE_y − PE_y − LE_y"} value={`${fmt(result.result.ER, 1)} tCO₂e/yr`}
        // [V1 §2 / V2 §7.7] — the sum of the sections above.
        oneLiner="The final credits — the baseline emissions above, minus the project's own emissions and any leakage."
        open={open.has("er")} onToggle={() => toggle("er")} cite={citeShort(basis, "er")}>
        <VarRow label={v2 ? "BE_CB — crediting baseline (Eq.10)" : "BE — baseline emissions (Eq.3)"} value={fmt(v2 ? (result.result as PaaErOutput).BE_CB : (result.result as LegacyErOutput).BE, 1)} unit="tCO₂e" state="derived" tip="Baseline emissions total from the section above." />
        <VarRow label="PE — project emissions" value={fmt(result.result.PE, 1)} unit="tCO₂e" state="derived" tip="Project emissions section." />
        <VarRow label="LE — leakage" value={fmt(result.result.LE, 1)} unit="tCO₂e" state="derived" tip="Leakage section." />
      </EqRow>
    </section>
  );
}

// ── version-specific tails ───────────────────────────────────────────────────

type Toggle = (id: string) => void;

function peLeRows(result: ScenarioResult, open: Set<string>, toggle: Toggle, basis: Basis) {
  const v2 = basis === "paa";
  return (
    <>
      <Section title={v2 ? "Activity emissions (AE)" : "Project emissions (PE)"} />
      <EqRow eqNum={v2 ? "14" : "8"} symbol={v2 ? "AE_y" : "PE_y"} title="Emissions from running the new system" formula="fuel + electricity" value={`${fmt(result.result.PE, 1)} tCO₂e`}
        // [V1 §3.7 p.13 / V2 §7.6] — activity emissions; more PE = fewer net credits.
        oneLiner="Emissions from running the new water system — pumps, transport, or any fuel it uses. Often near zero for gravity or solar supply, so it stays thin ex-ante."
        open={open.has("pe")} onToggle={() => toggle("pe")} cite={citeShort(basis, "pe")}>
        <VarRow label="fuel + electricity emissions" value={fmt(result.result.PE, 1)} unit="tCO₂e" state="derived" tip="Fossil-fuel + electricity emissions of the activity (V2.0 §8.2). Zero by default ex-ante." />
      </EqRow>

      <Section title="Leakage (LE)" />
      <EqRow eqNum={v2 ? "17" : "—"} symbol="LE_y" title="Emissions that shift elsewhere" formula={v2 ? "LE_emb,y + LE_Market,y" : "non-renewable-biomass leakage"} value={`${fmt(result.result.LE, 1)} tCO₂e`}
        // [V1 §3.8 p.13 / V2 leakage MS] — deducted to stay conservative; more LE = fewer credits.
        oneLiner="Emissions that move elsewhere because of the project (for example, displaced fuel use). Deducted to stay conservative; thin ex-ante."
        open={open.has("le")} onToggle={() => toggle("le")} cite={citeShort(basis, "le")}>
        {basis === "paa" ? (
          <VarRow label="LE_emb — embodied emissions of the devices" value={fmt((result.result as PaaErOutput).LE_embodied, 1)} unit="tCO₂e" state="derived"
            tip={(result.result as PaaErOutput).warnings.some((w) => /embodied emissions not entered/.test(w))
              ? "Not entered. V2.0 §9.2 deducts a default per new device (Table 10) once — upfront (Eq. 18) or over five years (Eq. 19). Nothing is deducted until the device class and unit count are entered."
              : "Embodied emissions per new device (V2.0 §9.2, Table 10), once per unit — upfront (Eq. 18) or amortised over five years (Eq. 19)."} />
        ) : null}
        <VarRow label={basis === "paa" ? "LE_Market — market leakage" : "non-renewable biomass leakage"} value={fmt(basis === "paa" ? (result.result as PaaErOutput).LE_market : result.result.LE, 1)} unit="tCO₂e" state="derived" tip={basis === "paa"
          ? "Market leakage, applied: Option 1, the methodology's default — 2% of net emission reductions (V2.0 §9.3.2, Eq. 20; V2.0 SDWS 40). A detailed assessment (Option 2) may replace it."
          : "Leakage deduction. Zero by default ex-ante; a flat 5% can be elected (V1.0 §3.8.3)."} />
      </EqRow>
    </>
  );
}

function paaTail(result: ScenarioResult, open: Set<string>, toggle: Toggle, xcbParam: React.ReactNode, mqParam: React.ReactNode, cbParam: React.ReactNode, state: CalcState, patch: (p: Partial<CalcState>) => void) {
  const p = result.result as PaaErOutput;
  // A host country with no row in the engine's DAF data takes the default; the engine's provenance
  // label carries the note, and this row only prints it (Amy's rulings, 19 and 23 Oct).
  const dafProv = result.provenance.find((x) => x.field === "DAF");
  const dafFallbackNote = dafProv?.source === "global-default" ? dafProv.label : null;
  return (
    <>
      {/* PAA-only adjustment sub-stage — the layout teaches V2's extra stage vs V1. */}
      <SubHeader label="Adjustments → crediting baseline"
        // [V2 §7.4 p.32] — own words, pending the reviewer (OPEN #16).
        note="V2.0 trims the baseline in stages: real-world use, then an ambition adjustment." />

      <EqRow eqNum="8" symbol="Q_y,adj" title="Adjusted quantity (behaviour & quality)" formula="Q_y,unadj · (1 − X_cleanboil,y) · M_q,y · U_p,y" value={ML(p.Q_adj) + "/yr"}
        oneLiner="Trims the volume for people who don't always use the clean water, or whose water sometimes fails a quality test. Less real-world use means fewer credits."
        open={open.has("q_adj")} onToggle={() => toggle("q_adj")} editable cite={citeShort("paa", "qadj")}>
        {xcbParam}
        {mqParam}
        {state.method === 2 ? (
          <Param monitor={{ sdws: sdwsRef("paa", "Up"), instrument: "usage survey" }} label="U_p,y — usage rate" sdwsRef={sdwsRef("paa", "Up")} value={state.usageRate} changed={state.usageRate !== 1} onChange={(v) => patch({ usageRate: v })} min={0} max={1} step={0.01} unit="" baseline="1.0 (full use)" tip="Fraction of the time the technology is actually used (Method 2). 0 = never → no credits." />
        ) : (
          <VarRow label="U_p — usage rate (Method 1)" value="1.0" state="default" tip="Usage rate is fixed at 1.0 for Method 1 (CWS/CWT)." />
        )}
      </EqRow>

      <EqRow eqNum="9" symbol="BE_unc,y" title="Emissions avoided (before ambition adj.)" formula="EF_b · (1 − C_b) · Q_y,adj" value={`${fmt(p.BE_u, 1)} tCO₂e`}
        oneLiner="The emissions avoided after setting aside people who were already using safe water. A larger already-safe share means fewer credits."
        open={open.has("be_u")} onToggle={() => toggle("be_u")} editable cite={citeShort("paa", "beU")}>
        {cbParam}
      </EqRow>

      <EqRow eqNum="10–12" symbol="BE_y" title="Crediting baseline (after ambition adj.)" formula="MIN( BE_unc,y · (1 − DAF) , BAU_y )" value={`${fmt(p.BE_CB, 1)} tCO₂e`}
        oneLiner="Newer rules shave the total a little each period to keep claims ambitious over time (Eq. 10), then take the lower of that and business-as-usual (Eq. 11–12). A bigger adjustment means fewer credits."
        open={open.has("be_cb")} onToggle={() => toggle("be_cb")} cite={citeShort("paa", "beY")}>
        <VarRow label="DAF — downward adjustment (457 tool)" value={fmt(result.DAF, 4)} state="derived" tip="Downward adjustment factor by country × vintage window, from the GS4GG 457 DAF tool (looked-up, locked)." />
        {dafFallbackNote ? <div className="t-caption mt-1 text-fg-3" style={{ fontSize: 10 }}>{dafFallbackNote}</div> : null}
      </EqRow>

      {peLeRows(result, open, toggle, "paa")}
    </>
  );
}

function legacyTail(result: ScenarioResult, open: Set<string>, toggle: Toggle, cbParam: React.ReactNode, xcbParam: React.ReactNode, mqParam: React.ReactNode) {
  const l = result.result as LegacyErOutput;
  return (
    <>
      <EqRow eqNum="3" symbol="BE" title="Emissions avoided" formula="EF_b · (1 − C_b − X_cleanboil) · Q_y · M_q" value={`${fmt(l.BE, 1)} tCO₂e`}
        // [V1 §3.6.3 p.12] — V1 applies the discounts inside the baseline (subtractive).
        oneLiner="Emissions avoided: the clean water delivered, minus the share of people already safe and the share who still boil the safe water. A larger already-safe share means fewer credits."
        open={open.has("be")} onToggle={() => toggle("be")} editable cite={citeShort("legacy", "beLegacy")}>
        {cbParam}
        {xcbParam}
        {mqParam}
      </EqRow>
      {peLeRows(result, open, toggle, "legacy")}
    </>
  );
}

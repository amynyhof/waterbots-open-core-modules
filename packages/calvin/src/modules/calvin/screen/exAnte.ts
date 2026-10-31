import type { ScenarioResult } from "../engine";
import { sdwsRef, type Basis } from "./citations";
import { toScenarioInput, type CalcState } from "./state";

/**
 * THE EX-ANTE SLIDERS (Road to v1, step V3; rulings 2026-10-30).
 *
 * A site can turn on sliders for an ex-ante run: the values a project can only ANTICIPATE before it
 * runs. Ex-post runs, and any site that does not turn them on, keep the typed boxes.
 *
 * This file holds what each slider is: its starting value and where it comes from, its two ends, how a
 * moved or typed value is held inside those ends, the notes a value can trigger, and which number the
 * engine credits. It does no methodology arithmetic. Holding a value at an end is a bound, not a sum,
 * and the credited number is always read from what the engine was given or what it returned.
 *
 * AN END IS ONE OF THREE KINDS (ruling 2026-10-30):
 *   cited    — the methodology states it; shown with its source.
 *   natural  — it comes from what the value is: a share runs 0% to 100%, a year has 365 days.
 *   open     — nothing is cited, so the slider just allows 0, with no note.
 * A STARTING VALUE WITH NO SOURCE says so ("assumed: no source yet"), and `startsWithoutSource`
 * lists it, so finding a source stays on the plan.
 */
export type SliderKey = "litres" | "days" | "testsPass" | "usage";

export interface End {
  value: number;
  kind: "cited" | "natural" | "open";
  /** The citation for a cited end, or what makes a natural end natural. Absent for an open end. */
  source?: string;
}

export interface SliderSpec {
  key: SliderKey;
  label: string;
  /** Unit shown after the number. Shares are shown and typed as percentages. */
  unit: string;
  /** Display value = stored value × scale (100 for shares, 1 otherwise). */
  scale: number;
  /** Step, in display units. */
  step: number;
  /** Decimal places when the value is shown. Display only. */
  dp: number;
  /** The starting value, labelled "assumed" until moved. `source: null` = no source yet. */
  start: { value: number; source: string | null };
  floor: End;
  ceiling: End;
  /** One plain line: which way the credits move. No number. */
  direction: string;
}

const YEAR = "natural limit: the days in a year";
/** Days of operation above which a community system needs an operation sensor, and where that is stated. */
export const SENSOR_DAYS = 347;
const SENSOR_SOURCE = "V2.0 SDWS 32; V1.0 SDWS 27";
const SHARE = "natural limit: a share";

/** The sliders for this run, in screen order. Usage is household treatment only. */
export function sliderSpecs(state: Pick<CalcState, "version" | "method">): SliderSpec[] {
  const basis: Basis = state.version;
  const hwt = state.method === 2;
  const specs: SliderSpec[] = [
    {
      key: "litres",
      label: "Drinking water per person per day",
      unit: "L",
      scale: 1,
      step: 0.1,
      dp: 2,
      start: {
        value: 4,
        source: basis === "paa" ? "V2.0 Table 9, adults (p.31); V2.0 SDWS 29" : "V1.0 SDWS 24 (p.34)",
      },
      floor: { value: 0, kind: "open" },
      ceiling: {
        value: 5.5,
        kind: "cited",
        source: basis === "paa" ? "V2.0 Table 9, adult cap (§7.3.11, p.31)" : "V1.0 §3.6.6 (p.12)",
      },
      direction: "More water per person means more credits, up to the cap.",
    },
    {
      key: "days",
      label: hwt ? "Days a year the device is in the home" : "Days of operation a year",
      unit: "d",
      scale: 1,
      step: 1,
      dp: 0,
      // Household treatment starts at 365 and only moves down (ruling 2026-10-30), the year's natural
      // limit. Community systems start at 347, the most days without an operation sensor (ruling 2026-10-31).
      start: hwt ? { value: 365, source: YEAR } : { value: SENSOR_DAYS, source: SENSOR_SOURCE },
      floor: { value: 0, kind: "open" },
      ceiling: { value: 365, kind: "natural", source: YEAR },
      direction: hwt
        ? "Fewer days with the device in the home means fewer credits."
        : "Fewer days of operation means fewer credits.",
    },
    {
      key: "testsPass",
      label: "Share of water tests that pass",
      unit: "%",
      scale: 100,
      step: 1,
      dp: 0,
      start: { value: 1, source: `${sdwsRef(basis, "Mq")}: ex-ante default` },
      floor: { value: 0, kind: "natural", source: SHARE },
      ceiling: { value: 1, kind: "natural", source: SHARE },
      direction: "A lower share of passing tests means fewer credits, in step with it.",
    },
  ];
  // V2.0 fixes usage at 100% for community systems, so they get no usage slider.
  if (hwt) {
    specs.push({
      key: "usage",
      label: "Share of homes that really use the device",
      unit: "%",
      scale: 100,
      step: 1,
      dp: 0,
      start: { value: 1, source: null },
      // A share, but never 0 (ruling 2026-10-30): the track stops one step above none.
      floor: { value: 0.01, kind: "natural", source: `${SHARE}, never 0` },
      ceiling: { value: 1, kind: "natural", source: SHARE },
      direction: "Fewer homes using the device means fewer credits, in step with it.",
    });
  }
  return specs;
}

/**
 * EVERY STARTING VALUE WITH NO SOURCE YET, for the plan's "find a cited source" item. A test pins this
 * list, so a source added or removed shows up as a change someone has to look at.
 */
export function startsWithoutSource(): { key: SliderKey; version: Basis; method: 1 | 2 }[] {
  const out: ReturnType<typeof startsWithoutSource> = [];
  for (const version of ["paa", "legacy"] as const) {
    for (const method of [1, 2] as const) {
      for (const s of sliderSpecs({ version, method })) {
        if (s.start.source === null) out.push({ key: s.key, version, method });
      }
    }
  }
  return out;
}

/** Where each slider keeps its value in `CalcState`. */
const FIELD = {
  litres: "litresPerPersonPerDay",
  days: "operationalDays",
  testsPass: "waterQualityFactor",
  usage: "usageRate",
} as const satisfies Record<SliderKey, keyof CalcState>;

export function storedValue(state: CalcState, key: SliderKey): number {
  return state[FIELD[key]];
}

/** "assumed" until somebody moves or types the slider, then "entered". */
export function sliderLabel(state: CalcState, key: SliderKey): "assumed" | "entered" {
  if (key === "litres") return state.qpwEntered ? "entered" : "assumed";
  return state.slidersEntered?.[key] ? "entered" : "assumed";
}

export type SliderChange =
  | { ok: true; patch: Partial<CalcState> }
  | { ok: false; reason: string };

/**
 * A slider moved or a value typed with the pencil, in DISPLAY units. The value the engine gets is held
 * inside the ends. A typed value past the ceiling is kept beside it, so the row can say the credit is
 * capped; a value back inside the ends clears that note.
 */
export function applySlider(state: CalcState, spec: SliderSpec, display: number): SliderChange {
  if (!Number.isFinite(display)) return { ok: false, reason: "Type a number." };
  const typed = display / spec.scale;
  if (spec.key === "usage" && typed <= 0) {
    return { ok: false, reason: "The share of homes using the device can't be 0." };
  }
  if (typed < spec.floor.value) {
    return { ok: false, reason: `This value can't be below ${shownValue(spec, spec.floor.value)}.` };
  }
  const held = Math.min(spec.ceiling.value, typed);
  const slidersTyped = { ...state.slidersTyped };
  if (held !== typed) slidersTyped[spec.key] = typed;
  else delete slidersTyped[spec.key];
  const patch: Partial<CalcState> = { [FIELD[spec.key]]: held, slidersTyped };
  if (spec.key === "litres") patch.qpwEntered = true;
  else patch.slidersEntered = { ...state.slidersEntered, [spec.key]: true };
  return { ok: true, patch };
}

/**
 * THE NUMBER THE ENGINE CREDITS, in stored units — never a second copy worked out here. Litres is
 * what the engine returned (`qpwEffective`: capped, or the Table 9 age-weighted volume). The others
 * are used by the engine exactly as it was given them, so they are read from that input.
 */
export function creditedValue(state: CalcState, result: ScenarioResult, key: SliderKey): number | null {
  if (key === "litres") return result.qpwEffective;
  const input = toScenarioInput(state);
  if (key === "days") return input.operationalDays;
  if (key === "testsPass") return input.M_qy ?? null;
  return input.usageRate ?? null;
}

/** A stored value as the row shows it, with its unit. Display only. */
export function shownValue(spec: SliderSpec, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const n = (v * spec.scale).toLocaleString(undefined, { minimumFractionDigits: spec.dp, maximumFractionDigits: spec.dp });
  return spec.unit === "%" ? `${n}%` : `${n} ${spec.unit}`;
}

/** The credited value, shown only when it differs from the value set (for example, age-weighted litres). */
export function creditedIfDifferent(state: CalcState, result: ScenarioResult, spec: SliderSpec): string | null {
  const credited = shownValue(spec, creditedValue(state, result, spec.key));
  return credited === shownValue(spec, storedValue(state, spec.key)) ? null : credited;
}

/** How an end is labelled under the track. */
export function endLabel(spec: SliderSpec, end: End): string {
  const v = shownValue(spec, end.value);
  return end.kind === "open" ? v : `${v} · ${end.source}`;
}

/** The note shown when a typed value went past the ceiling. Null when nothing was capped. */
export function capNote(state: CalcState, spec: SliderSpec): string | null {
  const typed = state.slidersTyped?.[spec.key];
  if (typed === undefined || typed <= spec.ceiling.value) return null;
  return `You typed ${shownValue(spec, typed)}. The credit is capped at ${shownValue(spec, spec.ceiling.value)} (${spec.ceiling.source}).`;
}

/**
 * THE NOTES A VALUE CAN TRIGGER (rulings 2026-10-30). Each one names its source. They say what the
 * rules require; they never change the number credited.
 */
export function sliderNotes(state: CalcState, spec: SliderSpec): string[] {
  const notes: string[] = [];
  const v = storedValue(state, spec.key);
  if (spec.key === "days" && state.method === 1 && v > SENSOR_DAYS) {
    notes.push(`Over ${SENSOR_DAYS} days requires an operation sensor (${SENSOR_SOURCE}).`);
  }
  // V2.0 §7.4.3: the corrective-action line is 80% in year 1, 85% in year 2, 90% from year 3. The run
  // does not know the project's year, so the note says which years this share falls short in.
  if (spec.key === "testsPass" && state.version === "paa" && v < 0.9) {
    const when = v < 0.8 ? "in every year" : v < 0.85 ? "from year 2" : "from year 3";
    notes.push(
      `Below the corrective-action line ${when} (V2.0 §7.4.3: 80% in year 1, 85% in year 2, 90% in year 3 and after). ` +
        "A corrective action plan is required. If the next tests don't improve, crediting is suspended.",
    );
  }
  return notes;
}

/**
 * THE SEAT'S STARTING STATE WHEN SLIDERS ARE ON. The seed starts days at 365 for every project, and the
 * typed boxes keep that. With sliders on, an unsaved days value starts at its slider's starting value
 * instead (347 for a community system), so the slider, its label and the engine all begin at the same
 * number. A saved value always wins.
 */
export function withSliderStarts(seed: CalcState, saved: { operationalDays?: number } | undefined, setting: boolean | undefined): CalcState {
  if (!showSliders(setting, seed) || seed.method == null || saved?.operationalDays !== undefined) return seed;
  const days = sliderSpecs(seed).find((s) => s.key === "days")!;
  return { ...seed, operationalDays: days.start.value };
}

/** Whether this seat shows sliders: the site turned them on, and the run is ex-ante. */
export function showSliders(setting: boolean | undefined, state: Pick<CalcState, "mode">): boolean {
  return Boolean(setting) && state.mode === "ex-ante";
}

import type { ScenarioResult } from "../engine";
import { sdwsRef, type Basis } from "./citations";
import { toScenarioInput, type CalcState } from "./state";

/**
 * THE EX-ANTE SLIDERS (Road to v1, step V3; ruling 2026-10-30).
 *
 * A site can turn on sliders for an ex-ante run: the four values a project can only ANTICIPATE before
 * it runs. Ex-post runs, and any site that does not turn them on, keep the typed boxes.
 *
 * This file holds what each slider is: its cited starting value, its cited floor and ceiling, how a
 * moved or typed value is held inside those ends, and which number the engine credits. It does no
 * methodology arithmetic. Holding a value at a cited end is a bound, not a sum, and the credited
 * number is always read from what the engine was given or what it returned.
 *
 * A FLOOR OR CEILING THE METHODOLOGY DOES NOT CITE IS NOT INVENTED. It is `null` here, listed in
 * `UNCITED_ENDS` for a ruling, and the slider's track simply stops at the plain limit of the
 * quantity (no water, no days, one step above none for use), labelled "no cited floor".
 */
export type SliderKey = "litres" | "days" | "testsPass" | "usage";

/** A value with where it comes from. `source` is a citation, never prose about a number. */
export interface Cited {
  value: number;
  source: string;
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
  /** The cited starting value, labelled "assumed" until moved. Null source = no rulebook citation. */
  start: { value: number; source: string | null };
  floor: Cited | null;
  ceiling: Cited | null;
  /** Where the track stops when an end is not cited — the plain limit of the quantity, not a methodology value. */
  plainFloor: number;
  /** One plain line: which way the credits move. No number. */
  direction: string;
}

/** The four sliders for this run, in screen order. Usage is household treatment only. */
export function sliderSpecs(state: Pick<CalcState, "version" | "method">): SliderSpec[] {
  const basis: Basis = state.version;
  const hwt = state.method === 2;
  const days = sdwsRef(basis, hwt ? "DP" : "DO");
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
      floor: null,
      ceiling: {
        value: 5.5,
        source: basis === "paa" ? "V2.0 Table 9, adult cap (§7.3.11, p.31)" : "V1.0 §3.6.6 (p.12)",
      },
      plainFloor: 0,
      direction: "More water per person means more credits, up to the cap.",
    },
    {
      key: "days",
      label: hwt ? "Days a year the device is in the home" : "Days a year the water is available",
      unit: "d",
      scale: 1,
      step: 1,
      dp: 0,
      start: { value: 365, source: `${days}: days in the year` },
      floor: null,
      ceiling: { value: 365, source: `${days}: days in the year` },
      plainFloor: 0,
      direction: hwt
        ? "Fewer days with the device in the home means fewer credits."
        : "Fewer days with water available means fewer credits.",
    },
    {
      key: "testsPass",
      label: "Share of water tests that pass",
      unit: "%",
      scale: 100,
      step: 1,
      dp: 0,
      start: { value: 1, source: `${sdwsRef(basis, "Mq")}: ex-ante default` },
      floor: { value: 0, source: `${sdwsRef(basis, "Mq")}: a share of samples` },
      ceiling: { value: 1, source: `${sdwsRef(basis, "Mq")}: a share of samples` },
      plainFloor: 0,
      direction: "A lower share of passing tests means fewer credits, in step with it.",
    },
  ];
  if (hwt) {
    specs.push({
      key: "usage",
      label: "Share of homes that really use the device",
      unit: "%",
      scale: 100,
      step: 1,
      dp: 0,
      start: { value: 1, source: null },
      floor: null,
      ceiling: { value: 1, source: `${sdwsRef(basis, "Up")}: a share of homes` },
      // Never 0 (ruling 2026-10-30). The track stops one step above none; that is not a cited floor.
      plainFloor: 0.01,
      direction: "Fewer homes using the device means fewer credits, in step with it.",
    });
  }
  return specs;
}

/**
 * EVERY END AND START WITH NO METHODOLOGY CITATION, for a ruling. A test pins this list, so a
 * citation added or removed shows up as a change someone has to look at.
 */
export function uncitedEnds(): { key: SliderKey; what: "floor" | "ceiling" | "start"; version: Basis; method: 1 | 2 }[] {
  const out: ReturnType<typeof uncitedEnds> = [];
  for (const version of ["paa", "legacy"] as const) {
    for (const method of [1, 2] as const) {
      for (const s of sliderSpecs({ version, method })) {
        if (!s.floor) out.push({ key: s.key, what: "floor", version, method });
        if (!s.ceiling) out.push({ key: s.key, what: "ceiling", version, method });
        if (s.start.source === null) out.push({ key: s.key, what: "start", version, method });
      }
    }
  }
  return out;
}

/** The ends of the slider track, in stored units. */
export function trackEnds(spec: SliderSpec): { min: number; max: number } {
  return { min: spec.floor?.value ?? spec.plainFloor, max: spec.ceiling!.value };
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
 * inside the cited ends. A typed value beyond a cited end is kept beside it, so the row can say the
 * credit is capped; a value back inside the ends clears that note.
 */
export function applySlider(state: CalcState, spec: SliderSpec, display: number): SliderChange {
  if (!Number.isFinite(display)) return { ok: false, reason: "Type a number." };
  const typed = display / spec.scale;
  const { min, max } = trackEnds(spec);
  if (spec.key === "usage" && typed <= 0) {
    return { ok: false, reason: "The share of homes using the device can't be 0." };
  }
  if (typed < 0) return { ok: false, reason: "This value can't be below 0." };
  // Only a CITED end caps. Below an uncited floor there is nothing to cap to, so the typed value
  // stands (it is still at or above the plain limit checked just above).
  const held = Math.min(max, spec.floor ? Math.max(min, typed) : typed);
  const outside = held !== typed;
  const slidersTyped = { ...state.slidersTyped };
  if (outside) slidersTyped[spec.key] = typed;
  else delete slidersTyped[spec.key];
  const patch: Partial<CalcState> = { [FIELD[spec.key]]: held, slidersTyped };
  if (spec.key === "litres") patch.qpwEntered = true;
  else patch.slidersEntered = { ...state.slidersEntered, [spec.key]: true };
  return { ok: true, patch };
}

/**
 * THE NUMBER THE ENGINE CREDITS, in stored units — never a second copy worked out here. Litres is
 * what the engine returned (`qpwEffective`: capped, or the Table 9 age-weighted volume). The other
 * three are used by the engine exactly as it was given them, so they are read from that input.
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

/** The note shown when a typed value went past a cited end. Null when nothing was capped. */
export function capNote(state: CalcState, spec: SliderSpec): string | null {
  const typed = state.slidersTyped?.[spec.key];
  if (typed === undefined) return null;
  const end = typed > trackEnds(spec).max ? spec.ceiling : spec.floor;
  if (!end) return null;
  return `You typed ${shownValue(spec, typed)}. The credit is capped at ${shownValue(spec, end.value)} (${end.source}).`;
}

/** Whether this seat shows sliders: the site turned them on, and the run is ex-ante. */
export function showSliders(setting: boolean | undefined, state: Pick<CalcState, "mode">): boolean {
  return Boolean(setting) && state.mode === "ex-ante";
}

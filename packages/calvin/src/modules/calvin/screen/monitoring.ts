import { sdwsRef, type Basis } from "./citations";
import type { SavedAnalysis } from "./analysis";
import type { CalcState } from "./state";

/**
 * MONITORING VALUES ARE LABELLED BY THE ANALYSIS BASIS (ruling 2026-11-21).
 *
 * A monitoring value is one that monitoring data sets during the crediting period. Four are covered here:
 * the operating days (DO, or DP for a household device), the share of water tests that pass (M_q), the usage
 * rate (U_p, household devices only) and the share still boiling the safe water (X_cleanboil).
 *
 * - EX-ANTE (before the project runs): each starts from its starting value and is labelled "assumed". A
 *   value the person changes is their planned figure, and is still assumed.
 * - EX-POST (after it runs): each comes from the operation log or monitoring, and is labelled so. Until it
 *   is entered, its box is blank. There is no starting value and no fallback. The seat shows no figures,
 *   because every figure depends on it.
 *
 * Whether a value was entered is a flag of its own, saved with the analysis, so a save never turns an
 * entered value back into an assumed one, or the reverse.
 *
 * This file chooses words and decides what is missing. It does no arithmetic.
 */
export type MonitoringKey = "days" | "testsPass" | "usage" | "cleanBoil";

/** Days of operation above which a community system needs an operation sensor, and where that is stated. */
export const SENSOR_DAYS = 347;
export const SENSOR_SOURCE = "V2.0 SDWS 32; V1.0 SDWS 27";
/** The typed boxes' starting value for the operating days: a starting point, not a cited value. */
export const FULL_YEAR_DAYS = 365;

/** Where each value, and its "entered" flag, are kept in `CalcState`. */
export const MONITORING_FIELD = {
  days: { value: "operationalDays", entered: "operationalDaysEntered" },
  testsPass: { value: "waterQualityFactor", entered: "waterQualityEntered" },
  usage: { value: "usageRate", entered: "usageRateEntered" },
  cleanBoil: { value: "xCleanboil", entered: "xCleanboilEntered" },
} as const satisfies Record<MonitoringKey, { value: keyof CalcState; entered: keyof CalcState }>;

export type MonitoringFlags = Pick<CalcState, (typeof MONITORING_FIELD)[MonitoringKey]["entered"]>;

export interface MonitoringValue {
  key: MonitoringKey;
  /** The row's label, with its symbol. */
  label: string;
  /** The methodology parameter, for example "V2.0 SDWS 32". */
  sdws: string;
  /** Where the figure comes from after the project runs, in words that fit "From …". */
  record: string;
  /** What the person enters, in words that fit "your project's own …". */
  own: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/** The monitoring values this run uses, in screen order. U_p is household treatment (Method 2) only. */
export function monitoringValues(state: Pick<CalcState, "version" | "method">): MonitoringValue[] {
  const basis: Basis = state.version;
  const hwt = state.method === 2;
  const out: MonitoringValue[] = [
    hwt
      ? { key: "days", label: "DP — days a year the device is in the home", sdws: sdwsRef(basis, "DP"), record: "sales or distribution records", own: "days", min: 0, max: 365, step: 1, unit: "d" }
      : { key: "days", label: "DO — days of operation a year", sdws: sdwsRef(basis, "DO"), record: "the operation log or sensor", own: "days", min: 0, max: 365, step: 1, unit: "d" },
    { key: "testsPass", label: "M_q,y — share of water tests that pass", sdws: sdwsRef(basis, "Mq"), record: "water-quality tests at the point of use", own: "test results", min: 0, max: 1, step: 0.01, unit: "" },
  ];
  if (hwt) {
    out.push({ key: "usage", label: "U_p,y — usage rate", sdws: sdwsRef(basis, "Up"), record: "the usage survey", own: "usage rate", min: 0, max: 1, step: 0.01, unit: "" });
  }
  out.push({ key: "cleanBoil", label: "X_cleanboil,y — share still boiling the safe water", sdws: sdwsRef(basis, "X"), record: "the usage survey", own: "survey result", min: 0, max: 1, step: 0.01, unit: "" });
  return out;
}

export function isEntered(state: MonitoringFlags, key: MonitoringKey): boolean {
  return state[MONITORING_FIELD[key].entered];
}

/** The change that enters a value: the value itself, and its flag. */
export function enterMonitoring(key: MonitoringKey, v: number): Partial<CalcState> {
  return { [MONITORING_FIELD[key].value]: v, [MONITORING_FIELD[key].entered]: true };
}

/**
 * THE MONITORING VALUES AN EX-POST RUN IS MISSING. Empty on an ex-ante run, and on an ex-post run with every
 * value entered. While it is not empty the seat computes nothing and asks for each one.
 */
export function missingMonitoring(state: CalcState): MonitoringValue[] {
  if (state.mode !== "ex-post" || state.method == null) return [];
  return monitoringValues(state).filter((m) => !isEntered(state, m.key));
}

/** The starting values a seat has used for each value, for reading a save made before the flags existed. */
const STARTS: Record<MonitoringKey, number[]> = {
  days: [FULL_YEAR_DAYS, SENSOR_DAYS],
  testsPass: [1],
  usage: [1],
  cleanBoil: [0],
};

/**
 * THE FLAGS, READ FROM A SAVE. A saved flag wins. A save made before the flags existed reads as entered when
 * its ex-ante slider was moved, or when it holds a figure other than a starting value. A starting value with
 * no flag reads as assumed: on an ex-post run its box is then blank and the seat asks for it, which errs
 * towards asking rather than towards a label that is not true.
 */
export function readMonitoringFlags(g: SavedAnalysis): MonitoringFlags {
  const read = (key: MonitoringKey, saved: boolean | undefined, value: number | undefined): boolean => {
    if (saved !== undefined) return saved;
    if (key !== "cleanBoil" && g.slidersEntered?.[key]) return true;
    return value !== undefined && !STARTS[key].includes(value);
  };
  return {
    operationalDaysEntered: read("days", g.operationalDaysEntered, g.operationalDays),
    waterQualityEntered: read("testsPass", g.mQualityEntered, g.mQuality),
    usageRateEntered: read("usage", g.usageRateEntered, g.usageRate),
    xCleanboilEntered: read("cleanBoil", g.xCleanboilEntered, g.xCleanboil),
  };
}

const NONE_ENTERED: MonitoringFlags = {
  operationalDaysEntered: false,
  waterQualityEntered: false,
  usageRateEntered: false,
  xCleanboilEntered: false,
};

/**
 * A CHANGE INTO EX-POST CLEARS THE FLAGS. A figure entered ex-ante is a planned figure, not a monitored one.
 * Carried into ex-post it would read "from the operation log" when no log gave it. So moving to ex-post asks
 * for each value again. Moving back to ex-ante keeps the flags: a monitored figure is a fair plan.
 */
export function withModeChange(s: Pick<CalcState, "mode">, p: Partial<CalcState>): Partial<CalcState> {
  if (p.mode === "ex-post" && s.mode !== "ex-post") return { ...NONE_ENTERED, ...p };
  return p;
}

/** What the person is asked to enter, in words that fit after a starting value. */
function startWords(state: CalcState, key: MonitoringKey): string {
  if (key === "days") {
    if (state.operationalDays === SENSOR_DAYS) {
      return state.method === 2
        ? `starting point: ${SENSOR_DAYS} days, a cautious estimate`
        : `starting point: ${SENSOR_DAYS} days, the most without an operation sensor (${SENSOR_SOURCE})`;
    }
    return state.operationalDays === FULL_YEAR_DAYS ? "starting point: a full year" : "starting point";
  }
  if (key === "testsPass") return `starting point: 1.00, the ex-ante default (${sdwsRef(state.version, "Mq")})`;
  if (key === "usage") return "starting point: 1.00, full use, no source yet";
  return "starting point: 0, not yet surveyed";
}

/**
 * WHERE A MONITORING VALUE COMES FROM, as the report and the rows say it. Ex-ante it is always "assumed".
 * Ex-post it is from the log or monitoring once entered. Until then it is blank, with no label (0.5.1): the box is
 * blank too, and a blank never counts as zero.
 */
export function monitoringSource(state: CalcState, key: MonitoringKey): string {
  const m = monitoringValues(state).find((v) => v.key === key);
  if (!m) return "Not applicable";
  const entered = isEntered(state, key);
  if (state.mode === "ex-post") {
    return entered
      ? `From ${m.record} (${m.sdws})`
      : "";
  }
  return entered
    ? `Assumed — your planned figure. After the project runs, it comes from ${m.record} (${m.sdws})`
    : `Assumed — ${startWords(state, key)}, until you enter your project's own ${m.own} (${m.sdws})`;
}

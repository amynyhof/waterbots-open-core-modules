/**
 * THE RANGES OF CALVIN'S VALUES (ruled 2026-11-23). Added by this repo, not part of the seed.
 *
 * The ranges, the check and the message are core's (`@waterbots/core/ranges`). This file says which of them each value
 * in Calvin's state takes, so one list covers his screen, his tool and what he sees of the screen.
 *
 * A number typed on the screen is refused where it is typed and never reaches the state. A number can still arrive
 * another way: from the record, from an older save, or from a site. `outOfRange` finds those. The seat then shows the
 * number with its message and no figures, until it is put right.
 *
 * Nothing here does a sum.
 */
import { checkRange, rangeRefusal, type RangeKey, type RangeWords } from "@waterbots/core/ranges";
import { MONITORING_FIELD, enterMonitoring, type MonitoringKey } from "./monitoring";
import type { CalcState } from "./state";

/** One value in the state: its range, and how to read and write it, in stored units. */
export interface StateValue {
  id: string;
  key: RangeKey;
  words?: RangeWords;
  /** Box units = stored units × scale (100 for a percent). */
  scale: number;
  get: (s: CalcState) => number | null | undefined;
  set: (s: CalcState, v: number) => Partial<CalcState>;
  /** Clears an optional value. Left out: the value must be put right, not cleared. */
  clear?: (s: CalcState) => Partial<CalcState>;
}

/** What each number box in Calvin's screens checks, in the box's own units. */
export function refuseIn(key: RangeKey, scale = 1, words: RangeWords = {}): (display: number) => string | null {
  return (display) => rangeRefusal(key, display / scale, words);
}

export const DEVICE_DAYS: RangeWords = { name: "Days the device is in the home" };
export const HOUSEHOLDS: RangeWords = { name: "Households served" };
export const METERED: RangeWords = { name: "Metered volume" };

/** What the days are called in this run. */
export function daysWords(s: Pick<CalcState, "method">): RangeWords {
  return s.method === 2 ? DEVICE_DAYS : {};
}

/** What the count is called: people, or households. */
export function countWords(s: Pick<CalcState, "populationMode">): RangeWords {
  return s.populationMode === "households" ? HOUSEHOLDS : {};
}

const MONITORED: Record<MonitoringKey, RangeKey> = { days: "daysOfOperation", testsPass: "testsPass", usage: "usageRate", cleanBoil: "stillBoiling" };

/** A monitoring value's range and words. */
export function monitoringRange(s: Pick<CalcState, "method">, key: MonitoringKey): { key: RangeKey; words: RangeWords } {
  return { key: MONITORED[key], words: key === "days" ? daysWords(s) : {} };
}

/** A slider value an earlier version held at an end: the number the person typed is the one that counts now. */
function typedOnSlider(s: CalcState, key: "days" | "testsPass" | "usage"): number | undefined {
  return s.slidersTyped?.[key];
}

function withoutTyped(s: CalcState, key: "days" | "testsPass" | "usage"): Partial<CalcState> {
  if (s.slidersTyped?.[key] === undefined) return {};
  const slidersTyped = { ...s.slidersTyped };
  delete slidersTyped[key];
  return { slidersTyped };
}

function shareValues<K extends string>(
  id: string,
  keys: readonly K[],
  get: (s: CalcState) => Partial<Record<K, number>> | undefined,
  put: (v: Partial<Record<K, number>>) => Partial<CalcState>,
  clear: Partial<CalcState>,
): StateValue[] {
  return keys.map((k) => ({
    id: `${id}.${k}`,
    key: "eachShare" as const,
    scale: 100,
    get: (s: CalcState) => get(s)?.[k],
    set: (s: CalcState, v: number) => put({ ...get(s), [k]: v }),
    clear: () => clear,
  }));
}

/** Every value of this run that has a range, in the order the screen shows them. */
export function stateValues(s: CalcState): StateValue[] {
  const m2 = s.method === 2;
  const monitored = (key: "days" | "testsPass" | "usage" | "cleanBoil"): StateValue => {
    const range = monitoringRange(s, key);
    return {
      id: MONITORING_FIELD[key].value,
      ...range,
      scale: 1,
      get: (x) => (key === "cleanBoil" ? undefined : typedOnSlider(x, key)) ?? x[MONITORING_FIELD[key].value],
      set: (x, v) => ({ ...enterMonitoring(key, v), ...(key === "cleanBoil" ? {} : withoutTyped(x, key)) }),
    };
  };
  const optional = (id: "premises" | "deviceCapacityLPerHour" | "usageHoursPerDay" | "devicesPerPremises" | "etaOverride" | "fossilStoveEta" | "householdSizeOverride", key: RangeKey, scale = 1): StateValue => ({
    id,
    key,
    scale,
    get: (x) => x[id],
    set: (_x, v) => ({ [id]: v }),
    clear: () => ({ [id]: undefined }),
  });
  const orNull = (id: "meteredVolumeL" | "activityEmissions" | "fnrbOverride" | "fnrbFiledV1", key: RangeKey, words: RangeWords = {}): StateValue => ({
    id,
    key,
    words,
    scale: 1,
    get: (x) => x[id],
    set: (_x, v) => ({ [id]: v }),
    clear: () => ({ [id]: null }),
  });
  return [
    { id: "populationCount", key: "population.served", words: countWords(s), scale: 1, get: (x) => x.populationCount, set: (_x, v) => ({ populationCount: v }) },
    optional("householdSizeOverride", "population.householdSize"),
    { id: "litresPerPersonPerDay", key: "lpcd", scale: 1, get: (x) => x.litresPerPersonPerDay, set: (_x, v) => ({ litresPerPersonPerDay: v, qpwEntered: true }) },
    monitored("days"),
    monitored("testsPass"),
    ...(m2 ? [monitored("usage")] : []),
    monitored("cleanBoil"),
    { id: "cBaseline", key: "alreadySafe", scale: 1, get: (x) => x.cBaseline, set: (_x, v) => ({ cBaseline: v }) },
    orNull("meteredVolumeL", "waterProduced", s.mode === "ex-post" ? METERED : {}),
    orNull("activityEmissions", "pumpEmissions"),
    ...(m2
      ? [
          optional("premises", "householdsServed"),
          optional("deviceCapacityLPerHour", "deviceFlow"),
          optional("usageHoursPerDay", "hoursUsed"),
          optional("devicesPerPremises", "devicesPerHousehold"),
        ]
      : []),
    optional("etaOverride", "stoveEfficiency", 100),
    optional("fossilStoveEta", "fossilStoveEfficiency", 100),
    orNull("fnrbOverride", "fnrb"),
    orNull("fnrbFiledV1", "fnrb"),
    ...shareValues("ageSharesEntered", ["under5", "age5_18", "adult19plus"] as const, (x) => x.ageSharesEntered, (v) => ({ ageSharesEntered: v as CalcState["ageSharesEntered"] }), { ageSharesEntered: undefined }),
    ...shareValues("stoveSharesEntered", ["threeStone", "otherConventional", "ics", "fossil"] as const, (x) => x.stoveSharesEntered, (v) => ({ stoveSharesEntered: v as CalcState["stoveSharesEntered"] }), { stoveSharesEntered: undefined }),
    ...shareValues("fuelSharesEntered", ["wood", "charcoal", "lpg", "kerosene", "coal", "electricity"] as const, (x) => x.fuelSharesEntered, (v) => ({ fuelSharesEntered: v }), { fuelSharesEntered: undefined }),
  ];
}

export interface OutOfRange {
  value: StateValue;
  /** The number held, in the box's units. */
  shown: number;
  message: string;
}

/** The numbers this seat holds that are outside their range. Empty on every ordinary run. Blanks are not checked. */
export function outOfRange(s: CalcState): OutOfRange[] {
  return stateValues(s).flatMap((value) => {
    const v = value.get(s);
    if (v === null || v === undefined) return [];
    const c = checkRange(value.key, v, value.words ?? {});
    return c.ok ? [] : [{ value, shown: v * value.scale, message: c.message }];
  });
}

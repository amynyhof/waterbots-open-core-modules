// The value ranges (ruled 2026-11-23): one list, one check, one message. Every number here is made up.
import { describe, expect, test } from "vitest";
import { RANGES, checkRange, rangeMessage, requireInRange, type Range, type RangeKey } from "./ranges";
import { addGivenFacts, checkEntry, emptyRecord, entryMessage, type CheckedFact } from "./record";

/** Every message a visitor can read, as the maintainer read them. */
const MESSAGES: Record<RangeKey, string> = {
  "population.served": "People served must be a whole number, 1 or more.",
  "population.householdSize": "People per household must be more than 0.",
  lpcd: "Litres per person a day must be 0 or more.",
  withoutProjectM3PerYear: "Water before the project must be 0 or more.",
  daysOfAccess: "Days of access must be between 0 and 365.",
  operatingHours: "Operating hours must be between 0 and 8,760.",
  meteredWater: "Metered water must be 0 or more.",
  systemFlow: "Flow of the system must be 0 or more.",
  daysOfOperation: "Days of operation must be between 0 and 365.",
  testsPass: "Share of water tests that pass must be between 0 and 1.",
  usageRate: "Usage rate must be between 0 and 1.",
  homesThatUse: "Share of homes that use the device must be between 1% and 100%.",
  stillBoiling: "Share still boiling the safe water must be between 0 and 1.",
  alreadySafe: "Already-safe share must be between 0 and 1.",
  waterProduced: "Water produced in a year must be 0 or more.",
  pumpEmissions: "Pump and fuel emissions must be 0 or more.",
  householdsServed: "Households served must be a whole number, 1 or more.",
  deviceFlow: "Device flow rate must be more than 0.",
  hoursUsed: "Hours the device is used must be between 0 and 24.",
  devicesPerHousehold: "Devices per household must be a whole number, 1 or more.",
  stoveEfficiency: "Stove efficiency must be more than 0% and no more than 100%.",
  fossilStoveEfficiency: "Fossil stove efficiency must be more than 0% and no more than 100%.",
  fnrb: "fNRB must be between 0 and 1.",
  eachShare: "Each share must be between 0% and 100%.",
  daf: "DAF must be between 0 and 1.",
};
const KEYS = Object.keys(RANGES) as RangeKey[];
/** A step small enough to sit just outside an end, and a whole one for a count. */
const near = (r: Range): number => (r.whole ? 1 : 0.001);

describe("every value has a range, a source and one message", () => {
  test.each(KEYS)("%s", (key) => {
    expect(rangeMessage(key)).toBe(MESSAGES[key]);
    expect(RANGES[key].source.length).toBeGreaterThan(0);
  });
  test("the message follows how a screen names and shows the value", () => {
    expect(rangeMessage("population.served", { name: "Households served" })).toBe("Households served must be a whole number, 1 or more.");
    expect(rangeMessage("testsPass", { shownAs: "percent" })).toBe("Share of water tests that pass must be between 0% and 100%.");
  });
});

describe("a number outside its range is refused, and one at an end or inside is allowed", () => {
  test.each(KEYS)("%s", (key) => {
    const r: Range = RANGES[key];
    const low = r.moreThanMin ? r.min + near(r) : r.min;
    for (const inside of [low, r.max ?? low + 1000]) expect(checkRange(key, inside), String(inside)).toEqual({ ok: true });
    const outside = [r.moreThanMin ? r.min : r.min - near(r), -1, ...(r.max !== undefined ? [r.max + near(r)] : []), ...(r.whole ? [r.min + 0.5] : [])];
    for (const v of outside) expect(checkRange(key, v), String(v)).toMatchObject({ ok: false, key, message: MESSAGES[key] });
  });
  test("something that is not a number is refused", () => {
    for (const v of ["12", Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) expect(checkRange("daysOfAccess", v)).toMatchObject({ ok: false, problem: "not a number" });
  });
  test("no limit is invented: litres, people and the volumes have no top", () => {
    for (const key of ["population.served", "lpcd", "withoutProjectM3PerYear", "meteredWater", "systemFlow", "waterProduced", "pumpEmissions"] as const) {
      expect(checkRange(key, 1_000_000_000), key).toEqual({ ok: true });
    }
  });
  test("a tool throws the same message", () => {
    expect(() => requireInRange("daysOfAccess", 400)).toThrow("Days of access must be between 0 and 365.");
    expect(() => requireInRange("daysOfAccess", 365)).not.toThrow();
  });
});

describe("the shared record's fact check uses the same ranges", () => {
  const FACTS: CheckedFact[] = ["population.served", "population.householdSize", "lpcd", "withoutProjectM3PerYear"];
  test.each(FACTS)("%s", (fact) => {
    for (const v of [-1, 0, 0.5, 1, 4.6, 1e9]) expect(checkEntry(fact, v).ok, String(v)).toBe(checkRange(fact, v).ok);
    expect(entryMessage(fact)).toBe(MESSAGES[fact]);
  });
  test("a count of households says so", () => {
    expect(entryMessage("population.served", "households")).toBe("Households served must be a whole number, 1 or more.");
  });
  test("a refused number is never added", () => {
    const { record, refused } = addGivenFacts(emptyRecord(), "violet", { withoutProjectM3PerYear: -1 });
    expect(record.facts.withoutProjectM3PerYear).toBeUndefined();
    expect(refused).toEqual([{ ok: false, fact: "withoutProjectM3PerYear", problem: "below zero" }]);
  });
});

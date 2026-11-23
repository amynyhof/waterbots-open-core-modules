// The shared project record and its fact check. Every value here is made up.
import { describe, expect, test } from "vitest";
import { RECORD_VERSION, checkEntry, checkRecord, emptyRecord } from "./record";

const by = { by: "person", note: "made up for a test" } as const;

describe("a count below zero is refused where it is entered (W1)", () => {
  test("people served: a whole number, at least 1", () => {
    expect(checkEntry("population.served", -5)).toEqual({ ok: false, fact: "population.served", problem: "below zero" });
    expect(checkEntry("population.served", 0)).toEqual({ ok: false, fact: "population.served", problem: "zero" });
    expect(checkEntry("population.served", 12.5)).toEqual({ ok: false, fact: "population.served", problem: "not a whole number" });
    expect(checkEntry("population.served", 1200)).toEqual({ ok: true });
  });
  test("people per household: above zero, and an average is fine", () => {
    expect(checkEntry("population.householdSize", -1).ok).toBe(false);
    expect(checkEntry("population.householdSize", 0).ok).toBe(false);
    expect(checkEntry("population.householdSize", 4.6)).toEqual({ ok: true });
  });
  test("a volume can't be below zero; 0 is fine for a brand-new supply", () => {
    expect(checkEntry("withoutProjectM3PerYear", -0.1)).toEqual({ ok: false, fact: "withoutProjectM3PerYear", problem: "below zero" });
    expect(checkEntry("withoutProjectM3PerYear", 0)).toEqual({ ok: true });
    expect(checkEntry("lpcd", -3).ok).toBe(false);
  });
  test("something that is not a number is refused", () => {
    for (const v of ["12", Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
      expect(checkEntry("population.served", v)).toEqual({ ok: false, fact: "population.served", problem: "not a number" });
    }
  });
});

describe("an agent handed a record finds what is wrong, rather than calling it missing", () => {
  test("a count below zero on the record is named", () => {
    const r = emptyRecord();
    r.facts.population = { value: { mode: "people", served: -40 }, source: by };
    expect(checkRecord(r)).toEqual([{ ok: false, fact: "population.served", problem: "below zero" }]);
  });
  test("blanks are not checked: a blank is missing, not wrong", () => {
    const r = emptyRecord();
    r.facts.population = { value: {}, source: by };
    expect(checkRecord(r)).toEqual([]);
  });
});

describe("the record", () => {
  test("starts empty: every fact blank, no reading, no agent part", () => {
    expect(emptyRecord()).toEqual({ recordVersion: RECORD_VERSION, facts: {}, pathways: {}, place: {}, agents: {} });
  });
  test("people served keeps the way it was entered; no unit is filled in on its own (J6)", () => {
    const r = emptyRecord();
    r.facts.population = { value: { served: 300 }, source: by };
    expect(r.facts.population.value.mode).toBeUndefined();
  });
});

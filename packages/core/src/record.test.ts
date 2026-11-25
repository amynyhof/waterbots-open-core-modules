// The shared project record and its fact check. Every value here is made up.
import { describe, expect, test } from "vitest";
import { RECORD_VERSION, addGivenFacts, blankFacts, checkEntry, checkRecord, emptyRecord, setAgentResults } from "./record";

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

describe("an agent adds the facts it asked for (agent rule 10)", () => {
  test("only blank facts are added, and each one counts as a question", () => {
    const r = emptyRecord();
    r.place.country = { value: "LSO", source: { by: "site intake", note: "made up" } };
    const { record, added, refused } = addGivenFacts(r, "calvin", { country: "KEN", population: { served: 300, mode: "households" } });
    expect(added).toEqual(["population.served", "population.mode"]);
    expect(refused).toEqual([]);
    // The fact on the record stays: it is edited where the host keeps it.
    expect(record.place.country?.value).toBe("LSO");
    expect(record.facts.population?.value).toEqual({ served: 300, mode: "households" });
    expect(record.agents.calvin?.questionsAsked).toBe(2);
    // The record handed in is not changed.
    expect(r.facts.population).toBeUndefined();
  });

  test("a count with no unit stays that way: 'people' is never filled in on its own (J6)", () => {
    const { record } = addGivenFacts(emptyRecord(), "violet", { population: { served: 40 } });
    expect(record.facts.population?.value).toEqual({ served: 40 });
    expect(blankFacts(record, ["population.served", "population.mode"])).toEqual(["population.mode"]);
  });

  test("a part added to people served keeps who gave the rest", () => {
    const r = emptyRecord();
    r.facts.population = { value: { served: 40 }, source: { by: "site intake", note: "screening" } };
    const { record } = addGivenFacts(r, "violet", { population: { mode: "people" } });
    expect(record.facts.population).toEqual({ value: { served: 40, mode: "people" }, source: { by: "site intake", note: "screening; population.mode given to violet" } });
  });

  test("a count below zero is refused, not added, and not counted (W1)", () => {
    const { record, added, refused } = addGivenFacts(emptyRecord(), "calvin", { population: { served: -5, mode: "people" } });
    expect(added).toEqual(["population.mode"]);
    expect(refused).toEqual([{ ok: false, fact: "population.served", problem: "below zero" }]);
    expect(record.facts.population?.value.served).toBeUndefined();
    expect(record.agents.calvin?.questionsAsked).toBe(1);
  });

  test("nothing given, nothing asked: no question is counted", () => {
    const { record, added } = addGivenFacts(emptyRecord(), "violet", {});
    expect(added).toEqual([]);
    expect(record.agents.violet).toBeUndefined();
  });
});

describe("an agent writes its results to its own part", () => {
  const estimate = { figure: 12, unit: "m³ a year", method: "vwba-d3", engineVersion: "0.0.0" };
  test("results go in; the question count stays", () => {
    const asked = addGivenFacts(emptyRecord(), "violet", { accessLevel: "full" }).record;
    const r = setAgentResults(asked, "violet", { inputs: { view: "ex-ante" }, estimate, done: true });
    expect(r.agents.violet).toEqual({ questionsAsked: 1, inputs: { view: "ex-ante" }, estimate, done: true });
  });
  test("an estimate that no longer holds is cleared", () => {
    const r = setAgentResults(setAgentResults(emptyRecord(), "violet", { estimate }), "violet", { estimate: null });
    expect(r.agents.violet?.estimate).toBeUndefined();
  });
});

describe("Bridget's basin", () => {
  test("she adds it to a record that lacks one, and it counts as one question", () => {
    const basin = { id: 4040, level: 6 as const, areaKm2: 1200, stressLabel: "High (40-80%)" };
    const { record, added } = addGivenFacts(emptyRecord(), "bridget", { basin });
    expect(added).toEqual(["basin"]);
    expect(record.place.basin).toEqual({ value: basin, source: { by: "person", note: "given to bridget" } });
    expect(blankFacts(record, ["basin", "country"])).toEqual(["country"]);
    expect(addGivenFacts(record, "bridget", { basin: { ...basin, id: 5050 } }).added).toEqual([]);
  });
});

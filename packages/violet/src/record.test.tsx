// Violet and the shared project record (J3). Every project here is made up.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyRecord, type ProjectRecord } from "@waterbots/core/record";
import { computeD3 } from "./d3/compute.js";
import { D3_STATUS } from "./d3/types.js";
import D3Screen from "./screen/D3Screen.js";
import { addVioletFacts, addVioletResults, d3InputFromRecord, violetGivenFacts, violetNeeds, violetRecordProblems } from "./record.js";

const intake = { by: "site intake", note: "made up for a test" } as const;

/** A made-up project with people served entered as households, and Calvin's part already written. */
function gathered(): ProjectRecord {
  const r = emptyRecord();
  r.facts.technology = { label: "Community water supply", code: "CWS", source: intake };
  r.place.country = { value: "LSO", source: intake };
  r.facts.population = { value: { mode: "households", served: 250, householdSize: 4.6 }, source: intake };
  r.agents.calvin = { questionsAsked: 1, estimate: { figure: 99, unit: "tCO2e a year", method: "carbon-v2.0", engineVersion: "0" }, done: true };
  return r;
}

describe("Violet reads the record first", () => {
  it("takes people served as entered, and asks only for what the record does not hold", () => {
    expect(d3InputFromRecord(gathered(), "ex-ante")).toEqual({
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "households", served: 250, householdSize: 4.6 },
    });
    expect(violetNeeds(gathered())).toEqual(["accessLevel", "withoutProjectM3PerYear"]);
  });

  it("a count with no unit stays that way, and she asks for it (J6)", () => {
    const r = emptyRecord();
    r.facts.population = { value: { served: 40 }, source: intake };
    expect(d3InputFromRecord(r, "ex-ante").population).toEqual({ served: 40 });
    expect(violetNeeds(r)).toEqual(["population.mode", "accessLevel", "withoutProjectM3PerYear"]);
  });

  it("asks for people per household only when the count is of households", () => {
    const r = gathered();
    delete r.facts.population!.value.householdSize;
    expect(violetNeeds(r)).toContain("population.householdSize");
    expect(violetNeeds(emptyRecord())).not.toContain("population.householdSize");
  });

  it("working from the system's capacity, needs only the water before the project from the record", () => {
    expect(violetNeeds(emptyRecord(), "capacity")).toEqual(["withoutProjectM3PerYear"]);
  });

  it("names a count below zero as wrong, and does not use it (W1)", () => {
    const r = emptyRecord();
    r.facts.population = { value: { mode: "people", served: -40 }, source: intake };
    expect(violetRecordProblems(r)).toEqual([{ ok: false, fact: "population.served", problem: "below zero" }]);
    expect(d3InputFromRecord(r, "ex-ante").population).toEqual({ mode: "people" });
  });
});

describe("Violet adds what she asked for, and her results (agent rule 10)", () => {
  it("takes a made-up project through her part: saved and read back unchanged, with each agent's question count", () => {
    // On her screen the person sets the access level and the water before the project: two questions.
    const input = { ...d3InputFromRecord(gathered(), "ex-ante"), accessLevel: "full" as const, withoutProjectM3PerYear: 0 };
    const asked = addVioletFacts(gathered(), violetGivenFacts(input));
    expect(asked.added).toEqual(["accessLevel", "withoutProjectM3PerYear"]);

    const result = computeD3(input);
    const record = addVioletResults(asked.record, { input, result, done: true });
    const part = record.agents.violet!;
    expect(part.questionsAsked).toBe(2);
    expect(part.estimate).toEqual({ figure: result.vwbM3PerYear, unit: "m³ a year", method: "vwba-d3", engineVersion: expect.any(String), standing: D3_STATUS });

    // Calvin's part is left as it was.
    expect(record.agents.calvin).toEqual(gathered().agents.calvin);
    const back = JSON.parse(JSON.stringify(record)) as ProjectRecord;
    expect(back).toEqual(record);
    expect({ calvin: back.agents.calvin?.questionsAsked, violet: back.agents.violet?.questionsAsked }).toEqual({ calvin: 1, violet: 2 });
    // Read back, she opens on the facts she added, and asks nothing more.
    expect(violetNeeds(back)).toEqual([]);
  });

  it("with nothing to show, writes no figure", () => {
    const input = d3InputFromRecord(emptyRecord(), "ex-ante");
    const record = addVioletResults(emptyRecord(), { input, result: computeD3(input) });
    expect(record.agents.violet?.estimate).toBeUndefined();
  });
});

describe("her screen opens on the record", () => {
  it("shows people served and the access level from the record", () => {
    const r = gathered();
    r.facts.accessLevel = { value: "limited", source: intake };
    const html = renderToStaticMarkup(<D3Screen record={r} lockView="ex-ante" />);
    expect(html).toContain("People served: 250 households of 4.6 people, from the project record.");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Limited access/);
  });
});

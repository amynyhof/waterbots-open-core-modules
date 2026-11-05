// The DAF fallback label names the section it rests on, read from the data file (ruling 2026-11-02). Made-up project.
import { describe, expect, it } from "vitest";
import daf from "../data/daf/countries.json" with { type: "json" };
import { computeScenario } from "./scenario";
import { seedCalcState, toScenarioInput, type CalvinProject } from "../../modules/calvin/screen/state";

describe("the DAF fallback label", () => {
  const project: CalvinProject = {
    name: "Invented test project",
    standards: [],
    technology: "CWS",
    country: "BEN",
    population: { mode: "people", served: 1200 },
    analysis: { fnrbFiledV1: 0.3 },
  };
  const input = { ...toScenarioInput(seedCalcState(project)), version: "paa" as const };
  const prov = computeScenario(input).provenance.find((p) => p.field === "DAF");

  it("is used for a country with no row in the data file", () => {
    expect((daf.countries as Record<string, unknown>).BEN).toBeUndefined();
    expect(prov?.source).toBe("global-default");
  });
  it("states the value and ends with the data file's own citation", () => {
    expect(prov?.label).toBe(`Default value: ${daf.absolute_floor.value} (Gold Standard DAF tool's fallback; ${daf.absolute_floor.cite}).`);
    expect(daf.absolute_floor.cite).toMatch(/§/);
  });
});

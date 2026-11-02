// The report's sentence on how the calculator is checked (ruling 2026-10-31). Made-up projects only.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeScenario, computeTransitionWaterfall } from "../engine";
import ReportView from "./ReportView";
import { OFFICIAL_CALCULATOR_COUNT, TEST_CASE_COUNT, buildCheckSentence } from "./buildCheck";
import { seedCalcState, toScenarioInput, type CalvinProject } from "./state";

const file = JSON.parse(readFileSync(new URL("../../../expected-outputs.json", import.meta.url), "utf8"));
const allCases: { id: string; workedOut: string }[] = [...file.cases, ...file.fnrbCases];
const tally = (tag: string) => allCases.filter((c) => c.workedOut === tag).length;

describe("how each test case was worked out", () => {
  it("tags every case with one of the explained tags", () => {
    const tags = Object.keys(file.workedOutTags);
    for (const c of allCases) expect(tags, c.id).toContain(c.workedOut);
  });
  it("holds these totals (note of 2026-10-31)", () => {
    expect(allCases).toHaveLength(47);
    expect(tally("v1-official-calculator")).toBe(5);
    expect(tally("v1-official-calculator-recalculated")).toBe(21);
    expect(tally("v1-by-hand")).toBe(3);
    expect(tally("v2-by-hand")).toBe(16);
    expect(tally("fnrb-lookup")).toBe(2);
  });
});

describe("the build-check sentence", () => {
  it("reads both counts from the committed test-case file and its tags", () => {
    expect(TEST_CASE_COUNT).toBe(allCases.length);
    expect(OFFICIAL_CALCULATOR_COUNT).toBe(tally("v1-official-calculator"));
  });
  it("states 47 cases, 5 of them the official calculator's", () => {
    expect(TEST_CASE_COUNT).toBe(47);
    expect(OFFICIAL_CALCULATOR_COUNT).toBe(5);
  });
  it("has this wording, with both counts read in", () => {
    expect(buildCheckSentence()).toBe(
      "Every build checks it against 47 made-up test cases. 5 of them match Gold Standard’s official V1.0 calculator on made-up inputs.",
    );
    expect(buildCheckSentence(7, 2)).toBe(
      "Every build checks it against 7 made-up test cases. 2 of them match Gold Standard’s official V1.0 calculator on made-up inputs.",
    );
  });
});

describe("the report", () => {
  const project: CalvinProject = {
    name: "Invented test project",
    standards: [],
    technology: "CWS",
    country: "LSO",
    population: { mode: "people", served: 1200 },
    analysis: { fnrbFiledV1: 0.3 },
  };
  const state = seedCalcState(project);
  const input = toScenarioInput(state);
  const html = renderToStaticMarkup(
    <ReportView
      project={project}
      state={state}
      result={computeScenario(input)}
      legacyER={computeScenario({ ...input, version: "legacy" }).result.ER}
      paaER={computeScenario({ ...input, version: "paa" }).result.ER}
      waterfall={computeTransitionWaterfall(input)}
      warning={null}
      generatedAt="—"
      appVersion="0.0.0"
    />,
  );
  it("carries the sentence", () => {
    expect(html).toContain(buildCheckSentence());
  });
  it("carries no typed case count, accuracy figure or claim about filings", () => {
    expect(html).not.toMatch(/reference cases/);
    expect(html).not.toMatch(/issued filings/);
    expect(html).not.toMatch(/0\.05%/);
    expect(html).not.toMatch(/\b44\b/);
  });
});

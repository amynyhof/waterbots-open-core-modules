// The report's sentence on how the calculator is checked (ruling 2026-10-31). Made-up projects only.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeScenario, computeTransitionWaterfall } from "../engine";
import ReportView from "./ReportView";
import { TEST_CASE_COUNT, buildCheckSentence } from "./buildCheck";
import { seedCalcState, toScenarioInput, type CalvinProject } from "./state";

const file = JSON.parse(readFileSync(new URL("../../../expected-outputs.json", import.meta.url), "utf8"));

describe("the build-check sentence", () => {
  it("counts the cases in the committed test-case file", () => {
    expect(TEST_CASE_COUNT).toBe(file.cases.length + file.fnrbCases.length);
  });
  it("has this wording, with the count read in", () => {
    expect(buildCheckSentence()).toBe(
      `Every build checks it against ${file.cases.length + file.fnrbCases.length} made-up test cases, including results from Gold Standard’s official V1.0 tools on made-up inputs.`,
    );
    expect(buildCheckSentence(7)).toBe(
      "Every build checks it against 7 made-up test cases, including results from Gold Standard’s official V1.0 tools on made-up inputs.",
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

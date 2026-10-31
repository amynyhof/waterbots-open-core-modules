// Copied from the seed's README ("Prove the numbers"), step 7. Re-runs every case in expected-outputs.json through this
// copy of the engine and expects the same values, exactly. It shows nothing broke. It does not show a match to real filings.
// The case-running steps now live in `test-cases.ts`, shared with the engine-entry checks. The checks are the same.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { computeLegacyEr } from "./calculators/gs4gg-carbon/emissions-legacy";
import { computePaaEr } from "./calculators/gs4gg-carbon/emissions-paa-v2";
import { computeQuantity } from "./calculators/gs4gg-carbon/quantity";
import { computeScenario, FnrbUnavailableError } from "./calculators/gs4gg-carbon/scenario";
import { resolveBaselineEdit } from "./calculators/gs4gg-carbon/presets";
import { GS4GG_CALCULATOR_VERSION } from "./calculators/gs4gg-carbon/version";
import { runTestCases, type TestCaseDoc } from "./test-cases";
import type * as Engine from "./engine";

const doc: TestCaseDoc = JSON.parse(readFileSync(new URL("./expected-outputs.json", import.meta.url), "utf8"));
const engine = {
  computeLegacyEr, computePaaEr, computeQuantity, computeScenario, FnrbUnavailableError, resolveBaselineEdit, GS4GG_CALCULATOR_VERSION,
} as unknown as typeof Engine;
// One case per run, so a case that throws fails only its own check.
const run = (cases: TestCaseDoc["cases"], fnrbCases: TestCaseDoc["fnrbCases"]) => runTestCases(engine, { ...doc, cases, fnrbCases });

describe("expected-outputs.json", () => {
  it("was made by this engine version", () => {
    expect(GS4GG_CALCULATOR_VERSION).toBe(doc.engineVersion);
  });

  for (const c of doc.cases) {
    it(`${c.id}: the same outputs`, () => {
      const got = run([c], []).cases[c.id]!;
      expect(got.held).toEqual([]);
      expect(got.outputs).toEqual(c.outputs);
    });
  }

  for (const c of doc.fnrbCases) {
    it(`${c.id}: the same fNRB result`, () => {
      expect(run([], [c]).fnrbCases[c.id]).toEqual(c.outputs);
    });
  }
});

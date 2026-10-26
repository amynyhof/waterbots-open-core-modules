// Copied from the seed's README ("Prove the numbers"), step 7. Re-runs every case in expected-outputs.json through this
// copy of the engine and expects the same values, exactly. It shows nothing broke. It does not show a match to real filings.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { computeLegacyEr } from "./calculators/gs4gg-carbon/emissions-legacy";
import { computePaaEr } from "./calculators/gs4gg-carbon/emissions-paa-v2";
import { computeQuantity } from "./calculators/gs4gg-carbon/quantity";
import { computeScenario, FnrbUnavailableError } from "./calculators/gs4gg-carbon/scenario";
import { resolveBaselineEdit } from "./calculators/gs4gg-carbon/presets";
import { GS4GG_CALCULATOR_VERSION } from "./calculators/gs4gg-carbon/version";

const doc = JSON.parse(readFileSync(new URL("./expected-outputs.json", import.meta.url), "utf8"));
const numbersOnly = (o: Record<string, unknown>): Record<string, number> =>
  Object.fromEntries(Object.entries(o).filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1])));

describe("expected-outputs.json", () => {
  it("was made by this engine version", () => {
    expect(GS4GG_CALCULATOR_VERSION).toBe(doc.engineVersion);
  });

  for (const c of doc.cases) {
    it(`${c.id}: the same outputs`, () => {
      let inputs = c.inputs;
      let quantity: Record<string, number> = {};
      if (c.baselineEdit) {
        const r = resolveBaselineEdit(c.baselineEdit, c.calc);
        expect(r.held).toEqual([]);
        inputs = { ...inputs, stoveStrata: r.stoveStrata, fuelMix: r.fuelMix };
      }
      if (c.quantityInputs) {
        const q = computeQuantity(c.quantityInputs);
        inputs = { ...inputs, Q_pop: q.Q_pop, Q_m: q.Q_m };
        quantity = numbersOnly({ qpwPerPremises: q.qpwPerPremises, Q_pop: q.Q_pop, deviceMinApplied: q.deviceMinApplied ? 1 : 0 });
      }
      const out = c.calc === "paa" ? computePaaEr(inputs) : computeLegacyEr(inputs);
      expect({ ...quantity, ...numbersOnly(out as unknown as Record<string, unknown>) }).toEqual(c.outputs);
    });
  }

  for (const c of doc.fnrbCases) {
    it(`${c.id}: the same fNRB result`, () => {
      let got: Record<string, unknown>;
      try {
        const out = computeScenario(c.scenarioInput);
        got = { fNRB: out.fNRB, region: out.fnrbMultiNational?.region ?? null };
      } catch (err) {
        expect(err).toBeInstanceOf(FnrbUnavailableError);
        got = { refused: true, message: (err as InstanceType<typeof FnrbUnavailableError>).refusal.message };
      }
      expect(got).toEqual(c.outputs);
    });
  }
});

// Runs every case in `expected-outputs.json` through an engine passed in, and returns what the engine gave. The caller
// compares it with the recorded outputs. Added by this repo, not part of the seed. This is the one copy of the
// case-running steps, used by `prove-expected-outputs.test.ts`, `test/engine-entry.test.mjs` and
// `scripts/check-engine-entry.mjs`. It has no runtime imports and only types Node can strip, so that check can run it
// in plain Node, in a folder where only the built engine entry is installed. Not part of the build.
// These are made-up test cases, not real filings.
import type * as Engine from "./engine";

type Outputs = Record<string, number>;
type TestCase = { id: string; calc: string; inputs: any; baselineEdit?: any; quantityInputs?: any; outputs: Outputs };
type FnrbCase = { id: string; scenarioInput: any; outputs: Record<string, unknown> };
export type TestCaseDoc = { engineVersion: string; cases: TestCase[]; fnrbCases: FnrbCase[] };
export type TestCaseRun = {
  engineVersion: string;
  cases: Record<string, { held: unknown[]; outputs: Outputs }>;
  fnrbCases: Record<string, Record<string, unknown>>;
};

const numbersOnly = (o: Record<string, unknown>): Outputs =>
  Object.fromEntries(Object.entries(o).filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1])));

export function runTestCases(engine: typeof Engine, doc: TestCaseDoc): TestCaseRun {
  const cases: TestCaseRun["cases"] = {};
  for (const c of doc.cases) {
    let inputs = c.inputs;
    let quantity: Outputs = {};
    let held: unknown[] = [];
    if (c.baselineEdit) {
      const r = engine.resolveBaselineEdit(c.baselineEdit, c.calc as any);
      held = r.held;
      inputs = { ...inputs, stoveStrata: r.stoveStrata, fuelMix: r.fuelMix };
    }
    if (c.quantityInputs) {
      const q = engine.computeQuantity(c.quantityInputs);
      inputs = { ...inputs, Q_pop: q.Q_pop, Q_m: q.Q_m };
      quantity = numbersOnly({ qpwPerPremises: q.qpwPerPremises, Q_pop: q.Q_pop, deviceMinApplied: q.deviceMinApplied ? 1 : 0 });
    }
    const out = c.calc === "paa" ? engine.computePaaEr(inputs) : engine.computeLegacyEr(inputs);
    cases[c.id] = { held, outputs: { ...quantity, ...numbersOnly(out as unknown as Record<string, unknown>) } };
  }

  const fnrbCases: TestCaseRun["fnrbCases"] = {};
  for (const c of doc.fnrbCases) {
    try {
      const out = engine.computeScenario(c.scenarioInput);
      fnrbCases[c.id] = { fNRB: out.fNRB, region: out.fnrbMultiNational?.region ?? null };
    } catch (err) {
      if (!(err instanceof engine.FnrbUnavailableError)) throw err;
      fnrbCases[c.id] = { refused: true, message: err.refusal.message };
    }
  }

  return { engineVersion: engine.GS4GG_CALCULATOR_VERSION, cases, fnrbCases };
}

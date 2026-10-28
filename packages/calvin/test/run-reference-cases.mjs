// Runs every case in `expected-outputs.json` through an engine passed in, the same way
// `src/prove-expected-outputs.test.ts` does (see `howEachCaseRuns` in that file). Plain JavaScript that imports
// nothing, so a test can run it in a folder where only the built engine entry is installed.
// Returns what the engine gave. The caller compares it with the recorded outputs.

const numbersOnly = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "number" && Number.isFinite(v)));

export function runReferenceCases(engine, doc) {
  const cases = {};
  for (const c of doc.cases) {
    let inputs = c.inputs;
    let quantity = {};
    let held = [];
    if (c.baselineEdit) {
      const r = engine.resolveBaselineEdit(c.baselineEdit, c.calc);
      held = r.held;
      inputs = { ...inputs, stoveStrata: r.stoveStrata, fuelMix: r.fuelMix };
    }
    if (c.quantityInputs) {
      const q = engine.computeQuantity(c.quantityInputs);
      inputs = { ...inputs, Q_pop: q.Q_pop, Q_m: q.Q_m };
      quantity = numbersOnly({ qpwPerPremises: q.qpwPerPremises, Q_pop: q.Q_pop, deviceMinApplied: q.deviceMinApplied ? 1 : 0 });
    }
    const out = c.calc === "paa" ? engine.computePaaEr(inputs) : engine.computeLegacyEr(inputs);
    cases[c.id] = { held, outputs: { ...quantity, ...numbersOnly(out) } };
  }

  const fnrbCases = {};
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

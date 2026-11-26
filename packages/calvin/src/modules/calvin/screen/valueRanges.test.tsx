// Calvin's values and their ranges (ruled 2026-11-23). Every project here is invented.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RANGES } from "@waterbots/core/ranges";
import { computeScenarioTool, transitionWaterfallTool } from "../agent/tools";
import { calvinProjectFromRecord } from "../agent/record";
import { emptyRecord } from "@waterbots/core/record";
import CalculatorWork from "./CalculatorWork";
import { changesBack } from "./EquationStack";
import { applySlider, capNote, sliderSpecs } from "./exAnte";
import { seedCalcState, toSavedAnalysis, toScenarioInput, type CalcState, type CalvinProject } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";
import { outOfRange, stateValues } from "./valueRanges";
import { computeScenario } from "../engine";

const invented = (technology: "CWS" | "HWT", analysis: CalvinProject["analysis"] = {}): CalvinProject => ({
  name: "Invented test project", standards: ["carbon"], technology, country: "KEN", population: { mode: "people", served: 1200 }, analysis,
});
const cws = () => seedCalcState(invented("CWS"));
const hwt = () => seedCalcState(invented("HWT"));
const spec = (s: CalcState, key: string) => sliderSpecs(s).find((x) => x.key === key)!;
function mount(project: CalvinProject, options: CalculatorOptions = {}): { calc: CalculatorState; html: string } {
  let calc!: CalculatorState;
  function Seat() {
    calc = useCalculatorState(project, options);
    return <CalculatorWork calc={calc} project={project} appVersion="test" tab="calculator" />;
  }
  return { html: renderToStaticMarkup(<Seat />), calc };
}

describe("the sliders refuse a number outside the range", () => {
  it.each([
    ["days", 400, "Days of operation must be between 0 and 365."],
    ["days", -1, "Days of operation must be between 0 and 365."],
    ["testsPass", 120, "Share of water tests that pass must be between 0% and 100%."],
    ["litres", -0.1, "Litres per person a day must be 0 or more."],
  ])("%s typed as %s", (key, typed, reason) => {
    const s = cws();
    expect(applySlider(s, spec(s, key), typed)).toEqual({ ok: false, reason });
  });
  it.each([
    ["usage", 0, "Share of homes that use the device must be between 1% and 100%."],
    ["usage", 101, "Share of homes that use the device must be between 1% and 100%."],
    ["days", 366, "Days the device is in the home must be between 0 and 365."],
  ])("household treatment: %s typed as %s", (key, typed, reason) => {
    const s = hwt();
    expect(applySlider(s, spec(s, key), typed)).toEqual({ ok: false, reason });
  });
  it("a number at an end is allowed", () => {
    const s = hwt();
    for (const [key, v] of [["days", 0], ["days", 365], ["testsPass", 0], ["testsPass", 100], ["usage", 1], ["usage", 100], ["litres", 0]] as const) {
      expect(applySlider(s, spec(s, key), v).ok, `${key} ${v}`).toBe(true);
    }
  });
  it("a method cap is not a range: 7 litres is kept, and the credit is capped at 5.5", () => {
    const s = cws();
    const c = applySlider(s, spec(s, "litres"), 7);
    const next = c.ok ? { ...s, ...c.patch } : s;
    expect(capNote(next, spec(next, "litres"))).toMatch(/^You typed 7\.00 L\. The credit is capped at 5\.50 L/);
    expect(computeScenario(toScenarioInput(next)).qpwEffective).toBe(5.5);
  });
});

describe("a refused number puts the seat back as it was", () => {
  it("the value and its entered mark both go back", () => {
    const was = cws();
    const now = { ...was, operationalDays: 40, operationalDaysEntered: true };
    expect({ ...now, ...changesBack(now, was) }).toEqual(was);
  });
});

describe("a number that arrives another way is shown with its message, and no figures", () => {
  const CASES: [string, CalvinProject, string][] = [
    ["saved days", invented("CWS", { operationalDays: 400 }), "Days of operation must be between 0 and 365."],
    ["saved shares", invented("CWS", { ageSharesEntered: { under5: -0.1, age5_18: 0.6, adult19plus: 0.5 } }), "Each share must be between 0% and 100%."],
    ["stove efficiency", invented("CWS", { etaOverride: 1.2 }), "Stove efficiency must be more than 0% and no more than 100%."],
    ["fNRB", invented("CWS", { fnrbOverride: 1.5 }), "fNRB must be between 0 and 1."],
    ["hours used", invented("HWT", { usageHoursPerDay: 25 }), "Hours the device is used must be between 0 and 24."],
    ["part of a person", { ...invented("CWS"), population: { mode: "people", served: 12.5 } }, "People served must be a whole number, 1 or more."],
    ["part of a household", { ...invented("HWT"), population: { mode: "households", served: 12.5 } }, "Households served must be a whole number, 1 or more."],
    ["a size from the record", { ...invented("CWS"), population: { mode: "people", served: 100, householdSize: -4 } }, "People per household must be more than 0."],
    ["days an earlier version held at 365", invented("CWS", { operationalDays: 365, operationalDaysEntered: true, slidersTyped: { days: 400 } }), "Days of operation must be between 0 and 365."],
  ];
  it.each(CASES)("%s", (_name, project, message) => {
    const { calc, html } = mount(project, { exAnteSliders: true });
    expect(calc.outOfRange.map((r) => r.message)).toContain(message);
    expect([calc.result, calc.paaResult, calc.legacyResult, calc.waterfall]).toEqual([null, null, null, null]);
    expect(html).toContain("data-out-of-range-ask");
    expect(html).toContain(message);
    expect(html).not.toContain("data-headline");
    expect(calc.pageContext()).toContain(message);
    expect(calc.pageContext()).toContain("NO figures");
  });
  it("putting it right clears it", () => {
    for (const [, project] of CASES) {
      const s = { ...seedCalcState(project) };
      const [r] = outOfRange(s);
      const inside = RANGES[r!.value.key].min + ("moreThanMin" in RANGES[r!.value.key] ? 0.5 : 0);
      expect(outOfRange({ ...s, ...r!.value.set(s, inside) })).toEqual([]);
    }
  });
  it("below zero on the record: the count is wrong, not missing, and the message says its range", () => {
    const { html } = mount({ ...invented("CWS"), population: { mode: "people", served: -40 } });
    expect(html).toContain("People served must be a whole number, 1 or more.");
  });
  it("an ordinary seat has none", () => {
    for (const s of [cws(), hwt()]) expect(outOfRange(s)).toEqual([]);
    expect(outOfRange(seedCalcState(invented("HWT", toSavedAnalysis(hwt()))))).toEqual([]);
  });
  it("blanks are not checked", () => {
    expect(outOfRange({ ...cws(), populationCount: null, meteredVolumeL: null })).toEqual([]);
  });
  it("every value the seat checks names a range", () => {
    for (const v of stateValues(hwt())) expect(RANGES[v.key], v.id).toBeDefined();
  });
});

describe("his tools refuse the same numbers, in the same words", () => {
  const input = { version: "paa", waterSource: "new", treatment: "none", sourceSafe: true, countryIso: "KEN", populationMode: "people", populationCount: 1200, litresPerPersonPerDay: 4, operationalDays: 347 };
  it.each([
    [{ populationCount: 0 }, "People served must be a whole number, 1 or more."],
    [{ populationCount: 1.5, populationMode: "households" }, "Households served must be a whole number, 1 or more."],
    [{ litresPerPersonPerDay: -1 }, "Litres per person a day must be 0 or more."],
    [{ operationalDays: 366 }, "Days of operation must be between 0 and 365."],
    [{ meteredVolumeL: -1 }, "Water produced in a year must be 0 or more."],
    [{ waterSource: "existing", treatment: "homes", deviceCapacityLPerHour: 0 }, "Device flow rate must be more than 0."],
    [{ fnrbOverride: 1.1 }, "fNRB must be between 0 and 1."],
    [{ fnrbFiledV1: -0.1 }, "fNRB must be between 0 and 1."],
    [{ etaOverride: 0 }, "Stove efficiency must be more than 0% and no more than 100%."],
    [{ C_b: 2 }, "Already-safe share must be between 0 and 1."],
    [{ DAF: 1.5 }, "DAF must be between 0 and 1."],
  ])("%j", (bad, message) => {
    for (const tool of [computeScenarioTool, transitionWaterfallTool]) expect(() => tool.execute({ ...input, ...bad })).toThrow(message);
  });
  it("a number at an end runs", async () => {
    for (const ok of [{ operationalDays: 365 }, { operationalDays: 0 }, { C_b: 1 }, { DAF: 1 }, { etaOverride: 1 }, { litresPerPersonPerDay: 0 }]) {
      const run = await computeScenarioTool.execute({ ...input, ...ok });
      expect(typeof (run.output as { result: { ER: number } }).result.ER).toBe("number");
    }
  });
});

// The two tool tests and the screen's test below hold the words and the input of 2026-11-24. `kinds.test.tsx` holds what replaced
// them: community level treatment is counted for carbon again, and the project's facts decide, not a technology label.
describe("community level and institutional treatment are not counted yet (ruled 2026-11-23 and 24)", () => {
  const input = { version: "paa", countryIso: "KEN", populationMode: "people", populationCount: 1200, litresPerPersonPerDay: 4, operationalDays: 347 };
  // SWITCHED OFF 2026-11-25, never deleted: the tools take the project's facts, and community level treatment is counted again.
  it.skip.each([
    ["CWT", "“Community level water treatment technologies” is not covered yet."],
    ["IWT", "“Institutional water treatment technologies” is not covered yet."],
  ])("his tools refuse %s", (technology, message) => {
    for (const tool of [computeScenarioTool, transitionWaterfallTool]) {
      expect(() => tool.execute({ ...input, technology })).toThrow(message);
      for (const method of [1, 2]) expect(() => tool.execute({ ...input, technology, method })).toThrow(message);
    }
  });
  // SWITCHED OFF 2026-11-25, never deleted: the tools take the project's facts, not a technology.
  it.skip("a method alone does not get round it: the technology is needed, and the method follows it", () => {
    for (const method of [1, 2]) expect(() => computeScenarioTool.execute({ ...input, method })).toThrow(/technology is a project fact/);
    expect(() => computeScenarioTool.execute({ ...input, technology: "CWS", method: 2 })).toThrow(/method follows the technology/);
    expect(() => computeScenarioTool.execute({ ...input, technology: "HWT", preset: "institutional-wood-iwt" })).toThrow(/is not covered yet/);
  });
  // SWITCHED OFF 2026-11-25, never deleted: the tools take the project's facts, not a technology.
  it.skip("the same technology and method give the engine's own answer", async () => {
    for (const [technology, method] of [["CWS", 1], ["HWT", 2]] as const) {
      const run = await computeScenarioTool.execute({ ...input, technology });
      expect((run.output as { result: unknown }).result).toEqual(computeScenario({ ...input, method } as never).result);
    }
  });
  // SWITCHED OFF 2026-11-25, never deleted: community level treatment with its saved code gives a figure again.
  it.skip("his screen says the label is not covered yet, and asks for no technology", () => {
    const record = emptyRecord();
    const by = { by: "site intake", note: "invented" } as const;
    record.facts.technology = { label: "Community level water treatment technologies", code: "CWS", source: by };
    record.facts.population = { value: { mode: "people", served: 1200 }, source: by };
    record.place.country = { value: "KEN", source: by };
    const { html, calc } = mount(calvinProjectFromRecord(record));
    expect(html).toContain("can&#x27;t run for this project yet. “Community level water treatment technologies” is not covered yet.");
    expect(html).not.toContain("is missing technology");
    expect(calc.result).toBeNull();
    expect(calc.pageContext()).toContain("not covered yet");
  });
});

// Monitoring values labelled by the analysis basis (ruling 2026-11-21; Calvin 0.4.1). No sum changes: each test checks
// a label, a flag or what the seat shows. Every project and figure here is INVENTED.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculatorPageContext } from "../agent/pageContext";
import CalculatorWork from "./CalculatorWork";
import { tagForSource } from "./ReportView";
import { applySlider, sliderLabel, sliderSpecs } from "./exAnte";
import { enterMonitoring, missingMonitoring, monitoringSource, readMonitoringFlags, withModeChange } from "./monitoring";
import { seedCalcState, toSavedAnalysis, type CalcState, type CalvinProject } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";
import type { SavedAnalysis } from "./analysis";

const project = (technology: "CWS" | "HWT", analysis: SavedAnalysis = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology,
  country: "KEN",
  population: { mode: "people", served: 1200 },
  analysis,
});

function mount(p: CalvinProject, options: CalculatorOptions = {}, tab = "calculator"): { calc: CalculatorState; html: string } {
  let calc: CalculatorState | undefined;
  function Seat() {
    calc = useCalculatorState(p, options);
    return <CalculatorWork calc={calc} project={p} appVersion="0.0.0" tab={tab} />;
  }
  const html = renderToStaticMarkup(<Seat />);
  return { calc: calc!, html };
}

/** Every monitoring value a community-system run uses, entered with invented figures. */
const CWS_MONITORED: SavedAnalysis = {
  mode: "ex-post",
  operationalDays: 300, operationalDaysEntered: true,
  mQuality: 0.95, mQualityEntered: true,
  xCleanboil: 0.1, xCleanboilEntered: true,
};

describe("ex-ante: each monitoring value starts assumed", () => {
  it("the operating days are labelled assumed, a full year, on the row and in the report", () => {
    const s = seedCalcState(project("CWS"));
    expect(s.operationalDays).toBe(365);
    expect(s.operationalDaysEntered).toBe(false);
    const src = monitoringSource(s, "days");
    expect(src).toMatch(/^Assumed — starting point: a full year, until you enter your project's own days \(V2\.0 SDWS 32\)$/);
    expect(tagForSource(src)).toBe("assumed");
    const { html } = mount(project("CWS"), {}, "report");
    expect(html).toContain(src.replace(/'/g, "&#x27;"));
    expect(html).not.toContain("Project record — operation log or sensor");
  });
  it("on the sliders, the days start at 347 and say where that comes from", () => {
    const { calc } = mount(project("CWS"), { exAnteSliders: true });
    expect(calc.state.operationalDays).toBe(347);
    expect(monitoringSource(calc.state, "days")).toContain("the most without an operation sensor (V2.0 SDWS 32; V1.0 SDWS 27)");
  });
  it("every other monitoring value is assumed too", () => {
    const s = seedCalcState(project("HWT"));
    for (const key of ["testsPass", "usage", "cleanBoil"] as const) expect(tagForSource(monitoringSource(s, key)), key).toBe("assumed");
  });
  it("a value the person changes is their planned figure, still assumed", () => {
    const s: CalcState = { ...seedCalcState(project("CWS")), ...enterMonitoring("days", 300) };
    const src = monitoringSource(s, "days");
    expect(src).toBe("Assumed — your planned figure. After the project runs, it comes from the operation log or sensor (V2.0 SDWS 32)");
    expect(tagForSource(src)).toBe("assumed");
  });
  it("an ex-ante run never asks for a monitoring value", () => {
    expect(missingMonitoring(seedCalcState(project("HWT")))).toEqual([]);
    expect(mount(project("CWS")).calc.result).not.toBeNull();
  });
});

describe("ex-post: a value not entered is blank, and no figures are shown", () => {
  it("asks for each value with a blank box, a highlight and a red dot, and computes nothing", () => {
    const { calc, html } = mount(project("CWS", { mode: "ex-post" }));
    expect(calc.missingMonitoring.map((m) => m.key)).toEqual(["days", "testsPass", "cleanBoil"]);
    expect(calc.result).toBeNull();
    expect(calc.paaResult).toBeNull();
    expect(html).toContain("Monitoring values needed");
    expect(html).toContain("No figures are shown until every one is entered.");
    expect(html.match(/data-needed-dot=""/g)).toHaveLength(3);
    // No starting value in the box: the days box is empty, not 365.
    const daysRow = html.slice(html.indexOf('data-monitoring="days"'), html.indexOf('data-monitoring="testsPass"'));
    expect(daysRow).toContain('value=""');
    expect(daysRow).not.toContain('value="365"');
    // A blank box with no label under it (0.5.1).
    expect(daysRow).not.toMatch(/Not entered|needed from|awaiting/i);
    expect(monitoringSource(calc.state, "days")).toBe("");
    // No figure tiles and no equations.
    expect(html).not.toContain("data-figure-block");
  });
  it("a household device also asks for its usage rate, and its days come from sales or distribution records", () => {
    const { calc, html } = mount(project("HWT", { mode: "ex-post" }));
    expect(calc.missingMonitoring.map((m) => m.key)).toEqual(["days", "testsPass", "usage", "cleanBoil"]);
    expect(calc.missingMonitoring.find((m) => m.key === "days")?.record).toBe("sales or distribution records");
    expect(html).not.toContain("Not entered");
  });
  it("one value left out still holds back every figure, and only that box carries the dot", () => {
    const { calc, html } = mount(project("CWS", { ...CWS_MONITORED, xCleanboilEntered: false }));
    expect(calc.missingMonitoring.map((m) => m.key)).toEqual(["cleanBoil"]);
    expect(calc.result).toBeNull();
    expect(html.match(/data-needed-dot=""/g)).toHaveLength(1);
    const daysRow = html.slice(html.indexOf('data-monitoring="days"'), html.indexOf('data-monitoring="testsPass"'));
    expect(daysRow).toContain('value="300"');
    expect(daysRow).toContain("From the operation log or sensor (V2.0 SDWS 32)");
  });
  it("Calvin is told there are no figures and not to fill the gap", () => {
    const { calc } = mount(project("CWS", { mode: "ex-post" }));
    const text = calculatorPageContext({ projectName: "Invented test project", state: calc.state, missingMonitoring: calc.missingMonitoring, fnrbRefusal: null, result: null, legacyResult: null, paaResult: null, waterfall: null });
    expect(text).toContain("There are NO figures on this screen.");
    expect(text).toContain("do not offer a starting value or a default in its place");
  });
});

describe("ex-post: an entered value is labelled from the log or monitoring", () => {
  it("shows the figures, and the report says where each value came from", () => {
    const { calc } = mount(project("CWS", CWS_MONITORED));
    expect(calc.missingMonitoring).toEqual([]);
    expect(calc.result).not.toBeNull();
    const { html } = mount(project("CWS", CWS_MONITORED), {}, "report");
    expect(html).toContain("From the operation log or sensor (V2.0 SDWS 32)");
    expect(html).toContain("From water-quality tests at the point of use (V2.0 SDWS 22)");
    expect(html).toContain("From the usage survey (V2.0 SDWS 26)");
    expect(html).not.toContain("Project record — operation log or sensor");
    expect(tagForSource("From the operation log or sensor (V2.0 SDWS 32)")).toBe("entered");
  });
  it("entering a value sets the value and its flag together", () => {
    expect(enterMonitoring("days", 280)).toEqual({ operationalDays: 280, operationalDaysEntered: true });
    expect(enterMonitoring("testsPass", 0.9)).toEqual({ waterQualityFactor: 0.9, waterQualityEntered: true });
  });
  it("a change into ex-post asks again: a planned figure is not a monitored one", () => {
    const exAnte: CalcState = { ...seedCalcState(project("CWS")), ...enterMonitoring("days", 300) };
    const next = { ...exAnte, ...withModeChange(exAnte, { mode: "ex-post" }) };
    expect(next.operationalDaysEntered).toBe(false);
    expect(next.operationalDays).toBe(300);
    expect(missingMonitoring(next).map((m) => m.key)).toContain("days");
    // Back to ex-ante keeps the flags.
    const exPost: CalcState = { ...seedCalcState(project("CWS", CWS_MONITORED)) };
    expect(withModeChange(exPost, { mode: "ex-ante" })).toEqual({ mode: "ex-ante" });
  });
});

describe("a save keeps the entered flag", () => {
  it("an entered value saves and reopens entered, even at a starting value", () => {
    const s: CalcState = { ...seedCalcState(project("CWS", { mode: "ex-post" })), ...enterMonitoring("days", 365) };
    const saved = toSavedAnalysis(s);
    expect(saved.operationalDaysEntered).toBe(true);
    const again = seedCalcState(project("CWS", saved));
    expect(again.operationalDaysEntered).toBe(true);
    expect(again.operationalDays).toBe(365);
  });
  it("an assumed value saves and reopens assumed, even away from a starting value", () => {
    const s: CalcState = { ...seedCalcState(project("CWS")), operationalDays: 300, operationalDaysEntered: false };
    const saved = toSavedAnalysis(s);
    expect(saved.operationalDaysEntered).toBe(false);
    expect(seedCalcState(project("CWS", saved)).operationalDaysEntered).toBe(false);
  });
  it("every flag goes into the save under its own name", () => {
    const s = seedCalcState(project("HWT", { mode: "ex-post", usageRate: 0.8, usageRateEntered: true }));
    const saved = toSavedAnalysis(s);
    expect(saved).toMatchObject({ operationalDaysEntered: false, mQualityEntered: false, usageRateEntered: true, xCleanboilEntered: false });
    expect(saved).not.toHaveProperty("slidersEntered");
  });
  it("a moved slider sets the same flag the report reads", () => {
    const s = seedCalcState(project("CWS"));
    const spec = sliderSpecs(s).find((x) => x.key === "days")!;
    const change = applySlider(s, spec, 320);
    if (!change.ok) throw new Error(change.reason);
    const moved = { ...s, ...change.patch };
    expect(moved.operationalDaysEntered).toBe(true);
    expect(sliderLabel(moved, "days")).toBe("entered");
    expect(toSavedAnalysis(moved).operationalDaysEntered).toBe(true);
  });
});

describe("a save made before the flags existed", () => {
  it("a saved flag from a site's own copy is read as it stands", () => {
    expect(readMonitoringFlags({ operationalDays: 365, operationalDaysEntered: true }).operationalDaysEntered).toBe(true);
  });
  it("a figure other than a starting value reads as entered", () => {
    expect(readMonitoringFlags({ operationalDays: 300 }).operationalDaysEntered).toBe(true);
    expect(readMonitoringFlags({ mQuality: 0.9 }).waterQualityEntered).toBe(true);
  });
  it("a starting value with no flag reads as assumed", () => {
    expect(readMonitoringFlags({ operationalDays: 365 }).operationalDaysEntered).toBe(false);
    expect(readMonitoringFlags({ operationalDays: 347 }).operationalDaysEntered).toBe(false);
    expect(readMonitoringFlags({}).xCleanboilEntered).toBe(false);
  });
  it("a moved slider from an older save reads as entered", () => {
    expect(readMonitoringFlags({ operationalDays: 347, slidersEntered: { days: true } }).operationalDaysEntered).toBe(true);
  });
});

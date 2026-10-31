// The ex-ante slider rows on screen (Road to v1, V3), rendered to markup. Made-up projects only.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeScenario } from "../engine";
import EquationStack from "./EquationStack";
import ExAntePanel from "./ExAntePanel";
import SliderRow from "./SliderRow";
import { applySlider, shownValue, sliderSpecs, type SliderKey } from "./exAnte";
import { fmt } from "./format";
import { seedCalcState, toScenarioInput, type CalcState, type CalvinProject } from "./state";

const invented = (technology: "CWS" | "HWT"): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology,
  country: "LSO",
  population: { mode: "people", served: 1200 },
});
const noop = () => {};
const spec = (s: CalcState, key: SliderKey) => sliderSpecs(s).find((x) => x.key === key)!;
const row = (s: CalcState, key: SliderKey) =>
  renderToStaticMarkup(<SliderRow spec={spec(s, key)} state={s} result={computeScenario(toScenarioInput(s))} patch={noop} />);
const move = (s: CalcState, key: SliderKey, display: number): CalcState => {
  const c = applySlider(s, spec(s, key), display);
  if (!c.ok) throw new Error(c.reason);
  return { ...s, ...c.patch };
};
const ranges = (html: string) => (html.match(/type="range"/g) ?? []).length;
const panel = (s: CalcState) => renderToStaticMarkup(<ExAntePanel state={s} result={computeScenario(toScenarioInput(s))} patch={noop} />);

describe("a slider row", () => {
  it("says assumed at first, entered once moved", () => {
    const s = seedCalcState(invented("CWS"));
    expect(row(s, "days")).toContain(">assumed<");
    expect(row(move(s, "days", 300), "days")).toContain(">entered<");
  });
  it("shows the credited value when it differs from the value set", () => {
    const s = seedCalcState(invented("HWT"));
    const credited = shownValue(spec(s, "litres"), computeScenario(toScenarioInput(s)).qpwEffective);
    expect(row(s, "litres")).toMatch(new RegExp(`data-credited=""[^>]*>${credited.replace(".", "\\.")}<`));
    expect(row(move(s, "litres", 3.2), "litres")).not.toContain("data-credited");
  });
  it("labels a start with no source", () => {
    expect(row(seedCalcState(invented("HWT")), "usage")).toContain("starts at 100%, assumed: no source yet");
    expect(row(seedCalcState(invented("HWT")), "litres")).toContain("starts at 4.00 L, assumed (V2.0 Table 9");
  });
  it("labels natural limits, and leaves an uncited floor as a plain 0", () => {
    const html = row(seedCalcState(invented("CWS")), "testsPass");
    expect(html).toContain("0% · natural limit: a share");
    expect(row(seedCalcState(invented("CWS")), "litres")).toContain(`data-end="floor">0.00 L<`);
  });
  it("shows the cap note, the sensor note and the corrective-action note", () => {
    const s = move(move(seedCalcState(invented("CWS")), "days", 400), "testsPass", 70);
    expect(row(s, "days")).toContain("The credit is capped at 365 d");
    expect(row(s, "days")).toContain("Over 347 days requires an operation sensor (V2.0 SDWS 32; V1.0 SDWS 27).");
    expect(row(s, "testsPass")).toContain("V2.0 §7.4.3");
  });
  it("carries one plain line on which way the credits move", () => {
    expect(row(seedCalcState(invented("HWT")), "usage")).toContain("Fewer homes using the device means fewer credits");
  });
});

describe("the anticipated-performance panel", () => {
  it("holds four sliders for household treatment and three for community systems", () => {
    expect(ranges(panel(seedCalcState(invented("HWT"))))).toBe(4);
    expect(ranges(panel(seedCalcState(invented("CWS"))))).toBe(3);
  });
  it("has no slider for still boiling: that stays a typed value", () => {
    expect(panel(seedCalcState(invented("HWT")))).not.toMatch(/boil/i);
  });
  it("its headline is the engine's yearly credit, and moves as a slider moves", () => {
    const before = seedCalcState(invented("CWS"));
    const after = move(before, "days", 200);
    const er = (s: CalcState) => fmt(computeScenario(toScenarioInput(s)).result.ER, 0);
    expect(er(before)).not.toBe(er(after));
    for (const s of [before, after]) expect(panel(s)).toMatch(new RegExp(`data-headline=""[^>]*>${er(s)}<`));
  });
});

describe("the equation stack", () => {
  const stack = (s: CalcState, sliders: boolean) =>
    renderToStaticMarkup(<EquationStack result={computeScenario(toScenarioInput(s))} state={s} patch={noop} sliders={sliders} />);
  it("with sliders on, the rows point to the panel instead of a second box", () => {
    const html = stack(seedCalcState(invented("HWT")), true);
    expect(ranges(html)).toBe(0);
    expect(html).toContain("Drinking water per person per day, set on the sliders above");
    expect(html).toContain("Days a year the device is in the home, set on the sliders above");
  });
  it("with sliders off, the typed boxes stay", () => {
    const html = stack(seedCalcState(invented("HWT")), false);
    expect(html).not.toContain("set on the sliders above");
    expect(html).toContain("QPW_p — litres / person / day");
  });
});

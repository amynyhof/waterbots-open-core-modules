// The ex-ante slider rows on screen (Road to v1, V3), rendered to markup. Made-up projects only.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeScenario } from "../engine";
import EquationStack from "./EquationStack";
import ExAntePanel from "./ExAntePanel";
import SliderRow from "./SliderRow";
import { applySlider, shownValue, sliderSpecs, type SliderKey } from "./exAnte";
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

describe("a slider row", () => {
  it("says assumed at first, entered once moved", () => {
    const s = seedCalcState(invented("CWS"));
    expect(row(s, "days")).toContain(">assumed<");
    expect(row(move(s, "days", 300), "days")).toContain(">entered<");
  });
  it("shows the number the engine credits", () => {
    const s = seedCalcState(invented("HWT"));
    const credited = computeScenario(toScenarioInput(s)).qpwEffective;
    const shown = shownValue(spec(s, "litres"), credited);
    expect(row(s, "litres")).toMatch(new RegExp(`data-credited=""[^>]*>${shown.replace(".", "\\.")}<`));
  });
  it("shows the cited ceiling with its source, and says when no floor is cited", () => {
    const html = row(seedCalcState(invented("CWS")), "litres");
    expect(html).toContain("5.50 L · V2.0 Table 9, adult cap (§7.3.11, p.31)");
    expect(html).toContain("No cited floor");
  });
  it("shows the cap note when a typed value went past a cited end", () => {
    const html = row(move(seedCalcState(invented("CWS")), "days", 400), "days");
    expect(html).toContain("The credit is capped at 365 d");
  });
  it("carries one plain line on which way the credits move", () => {
    expect(row(seedCalcState(invented("HWT")), "usage")).toContain("Fewer homes using the device means fewer credits");
  });
});

describe("the anticipated-performance panel and the equation stack", () => {
  const panel = (s: CalcState) => renderToStaticMarkup(<ExAntePanel state={s} result={computeScenario(toScenarioInput(s))} patch={noop} />);
  const stack = (s: CalcState, sliders: boolean) =>
    renderToStaticMarkup(<EquationStack result={computeScenario(toScenarioInput(s))} state={s} patch={noop} sliders={sliders} />);
  it("the panel holds four sliders for household treatment and three for community supply", () => {
    expect(ranges(panel(seedCalcState(invented("HWT"))))).toBe(4);
    expect(ranges(panel(seedCalcState(invented("CWS"))))).toBe(3);
  });
  it("with sliders on, the equation rows point to the panel instead of a second box", () => {
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

// Calvin 0.5.1: a missing value is a blank box with no label. No sum changes. Every project here is INVENTED.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CalculatorWork from "./CalculatorWork";
import { shownValue, sliderSpecs } from "./exAnte";
import { monitoringSource } from "./monitoring";
import type { CalvinProject } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";

const project = (extra: Partial<CalvinProject> = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology: "CWS",
  country: "KEN",
  population: { mode: "people", served: 1200 },
  ...extra,
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

// Calvin's own label for a missing value was "Not entered". A sentence that says what the sum did without a value
// ("device capacity … not entered; … used") is not a label on a box, and stays.
const LABELS = /awaiting user project input|[Nn]ot given yet|Not entered\b/;
const household = project({ technology: "HWT", population: { mode: "households", served: 300 } });

describe("a missing value: a blank box, with no label", () => {
  it("in the ex-post ask, each box is blank with nothing under it, and nothing is worked out", () => {
    const { calc, html } = mount(project({ analysis: { mode: "ex-post" } }));
    expect(calc.missingMonitoring.length).toBeGreaterThan(0);
    expect(html).not.toMatch(LABELS);
    for (const m of calc.missingMonitoring) expect(monitoringSource(calc.state, m.key)).toBe("");
    // A blank never counts as zero: with a value missing, there are no figures at all.
    expect(calc.result).toBeNull();
  });
  it("in the report's tables, a household device's missing capacity has a blank value and a blank source", () => {
    const { calc, html } = mount(household, { exAnteOnly: true, exAnteSliders: true }, "report");
    expect(calc.state.deviceCapacityLPerHour == null).toBe(true);
    expect(html).not.toMatch(LABELS);
    const at = html.indexOf("Device capacity — litres treated per hour");
    const row = html.slice(html.lastIndexOf("<tr", at), at);
    expect(row).toMatch(/white-space:nowrap"><\/td><td class="text-fg-2" style="padding:2px 6px" data-vtag="none"><\/td>/);
  });
  it("on the equations, too", () => {
    expect(mount(household, { exAnteOnly: true, exAnteSliders: true }).html).not.toMatch(LABELS);
  });
  it("a slider value that is not there shows blank", () => {
    const { calc } = mount(project(), { exAnteSliders: true });
    expect(shownValue(sliderSpecs(calc.state)[0]!, null)).toBe("");
  });
});

// The V2.0-only view for a new project (ruling 2026-09-21), and the transition view it sits beside.
// A project the site says was credited under V1.0 (`creditedUnderV1: true`) gets the transition. Any other
// project, on paper or newly built, gets V2.0 only: no V1.0 figure, no transition and no ask for a V1.0 filing.
// Every project here is INVENTED.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculatorPageContext } from "../agent/pageContext";
import { useCalculatorState, type CalculatorState } from "./useCalculatorState";
import CalculatorWork from "./CalculatorWork";
import { seedCalcState, showsTransition, transitionPatch, type CalvinProject } from "./state";

const project = (extra: Partial<CalvinProject> = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology: "CWS",
  country: "LSO",
  population: { mode: "people", served: 1200 },
  ...extra,
});

/** Mounts the seat once and hands back what the hook gave the screen, and the screen's markup. */
function mount(p: CalvinProject, tab = "calculator"): { calc: CalculatorState; html: string } {
  let calc: CalculatorState | undefined;
  function Seat() {
    calc = useCalculatorState(p);
    return <CalculatorWork calc={calc} project={p} appVersion="0.0.0" tab={tab} />;
  }
  const html = renderToStaticMarkup(<Seat />);
  return { calc: calc!, html };
}

describe("which view a project gets", () => {
  it("gives the transition only to a project credited under V1.0", () => {
    expect(showsTransition({ creditedUnderV1: true })).toBe(true);
    expect(showsTransition({ creditedUnderV1: false })).toBe(false);
    expect(showsTransition({})).toBe(false);
  });

  it("keeps a new project on V2.0, even if its saved analysis says V1.0", () => {
    expect(seedCalcState(project({ analysis: { version: "legacy" } })).version).toBe("paa");
    expect(seedCalcState(project({ creditedUnderV1: true, analysis: { version: "legacy" } })).version).toBe("legacy");
  });

  it("drops a change of version on a new project, and keeps the rest of the change", () => {
    expect(transitionPatch({ version: "legacy", operationalDays: 300 }, false)).toEqual({ operationalDays: 300 });
    expect(transitionPatch({ version: "legacy", operationalDays: 300 }, true)).toEqual({ version: "legacy", operationalDays: 300 });
  });
});

describe("a new project", () => {
  it("works out V2.0 alone and asks for no V1.0 filing", () => {
    const { calc } = mount(project());
    expect(calc.transition).toBe(false);
    expect(calc.paaResult).not.toBeNull();
    expect(calc.result).toBe(calc.paaResult);
    expect(calc.legacyResult).toBeNull();
    expect(calc.waterfall).toBeNull();
    expect(calc.filedFnrbRefusal).toBeNull();
  });

  it("stays V2.0 only with a filed V1.0 fNRB left in its saved analysis", () => {
    const { calc, html } = mount(project({ analysis: { fnrbFiledV1: 0.3 } }));
    expect(calc.legacyResult).toBeNull();
    expect(html).toContain('data-view="v2-only"');
  });

  it("shows one V2.0 header with its own total, and no V1.0 tab or transition line", () => {
    const { calc, html } = mount(project());
    expect(html).toContain('data-view="v2-only"');
    expect(html).toContain("A new project: its credits are worked out under V2.0");
    expect(html).not.toContain("Legacy V1.0");
    expect(html).not.toContain("Transition delta");
    expect(html).not.toContain("Filed V1.0 fNRB needed");
    expect(calc.paaResult!.result.ER).toBeGreaterThan(0);
  });

  it("gets a V2.0 report: no V1.0 row, no difference, no transition table", () => {
    const { html } = mount(project(), "report");
    expect(html).toContain("PAA V2.0 Report — preview");
    expect(html).toContain("PAA V2.0 Emission Reductions");
    expect(html).toContain("This is a new project, not credited under V1.0");
    expect(html).toContain('data-field="paaER"');
    for (const gone of ["Legacy V1.0 ER", "Total difference", "What changed — methodology transition", "PAA Transition", "accompanying Transition Analysis", 'data-integrity="fail"']) {
      expect(html).not.toContain(gone);
    }
  });

  it("tells Calvin there is no V1.0 figure and no transition to offer", () => {
    const { calc } = mount(project());
    const text = calc.pageContext();
    expect(text).toContain("PAA v2.0 only");
    expect(text).toContain("not credited under V1.0");
    expect(text).not.toContain("legacy ER");
  });
});

describe("a project credited under V1.0", () => {
  const filed = project({ creditedUnderV1: true, analysis: { fnrbFiledV1: 0.3 } });

  it("keeps both versions and the transition", () => {
    const { calc, html } = mount(filed);
    expect(calc.transition).toBe(true);
    expect(calc.legacyResult).not.toBeNull();
    expect(calc.waterfall).not.toBeNull();
    expect(html).toContain("Transition delta (PAA − Legacy)");
    expect(html).not.toContain('data-view="v2-only"');
  });

  it("keeps the transition report", () => {
    const { html } = mount(filed, "report");
    expect(html).toContain("PAA Transition Analysis");
    expect(html).toContain("Legacy V1.0 ER");
    expect(html).not.toContain('data-integrity="fail"');
  });

  it("asks for its filed V1.0 fNRB when the record has none", () => {
    const { calc, html } = mount(project({ creditedUnderV1: true }));
    expect(calc.filedFnrbRefusal).not.toBeNull();
    expect(html).toContain("Filed V1.0 fNRB needed");
  });

  it("gives Calvin the ask, not a crash, while the filed value is missing", () => {
    const { calc } = mount(project({ creditedUnderV1: true }));
    const text = calc.pageContext();
    expect(text).toContain("asking for its filed V1.0 fNRB");
    expect(text).toContain("There are NO figures on this screen");
  });

  it("still tells Calvin both figures once the value is filed", () => {
    const { calc } = mount(filed);
    expect(calc.pageContext()).toContain("legacy ER");
  });
});

describe("the page context on its own", () => {
  it("reads as the transition when a caller does not say which view", () => {
    const { calc } = mount(project({ creditedUnderV1: true, analysis: { fnrbFiledV1: 0.3 } }));
    const { state, fnrbRefusal, result, legacyResult, paaResult, waterfall } = calc;
    expect(calculatorPageContext({ projectName: "Invented", state, fnrbRefusal, result, legacyResult, paaResult, waterfall })).toContain("legacy ER");
  });
});

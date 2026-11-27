// The maintainer's walk of the open site (2026-11-16): sixteen fixes to Calvin's screens. No sum changes; each test
// checks words, layout or a setting. Every project here is INVENTED.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeScenario } from "../engine";
import CalculatorLens from "./CalculatorLens";
import CalculatorWork from "./CalculatorWork";
import EquationStack, { proveLaterLine, TagKey, WithEqNums } from "./EquationStack";
import ExAntePanel from "./ExAntePanel";
import { dafSteps, fnrbSourceLine } from "./citations";
import { activityEmissionsAsk, followNewSeed, seedCalcState, toScenarioInput, type CalcState, type CalvinProject } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";
import { withSliderStarts } from "./exAnte";

const project = (extra: Partial<CalvinProject> = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology: "CWS",
  country: "KEN",
  population: { mode: "people", served: 1200 },
  ...extra,
});

function mount(p: CalvinProject, options: CalculatorOptions = {}, tab = "calculator"): { calc: CalculatorState; html: string; lens: string } {
  let calc: CalculatorState | undefined;
  function Seat() {
    calc = useCalculatorState(p, options);
    return <CalculatorWork calc={calc} project={p} appVersion="0.0.0" tab={tab} />;
  }
  const html = renderToStaticMarkup(<Seat />);
  const lens = renderToStaticMarkup(<CalculatorLens calc={calc!} />);
  return { calc: calc!, html, lens };
}

const noop = () => {};
const stack = (s: CalcState, extra: Partial<Parameters<typeof EquationStack>[0]> = {}) =>
  renderToStaticMarkup(<EquationStack result={computeScenario(toScenarioInput(s))} state={s} patch={noop} {...extra} />);
const ALL_ROWS = ["profile", "se", "ef_b", "qpw_hh", "q_pop", "q_y", "q_adj", "be_u", "be_cb", "daf", "be", "pe", "le", "er"];

describe("1. the fNRB source by name", () => {
  it("names the table and says its values come from MoFuSS, never the data key", () => {
    const { html, calc } = mount(project());
    expect(fnrbSourceLine(calc.result!, calc.state)).toBe("A6.4-AMT-009 Table 3 (national default). Its values come from MoFuSS.");
    expect(html).toContain("A6.4-AMT-009 Table 3 (national default). Its values come from MoFuSS.");
    expect(html).not.toContain("mofuss-adm0-csv");
  });
  it("names Table 2 for a country with no national value", () => {
    const { calc } = mount(project({ country: "LSO" }));
    expect(fnrbSourceLine(calc.result!, calc.state)).toMatch(/^A6\.4-AMT-009 Table 2 \(multi-national value for .+\)\. Its values come from MoFuSS\.$/);
  });
});

describe("2 and 7. a site can unpin the figures and hide the export buttons", () => {
  // SWITCHED OFF 2026-11-26, never deleted: it expects the report tab's button to read "Export (PDF)". Both buttons have
  // one name now (family 4, rule 13). `family4.test.tsx` holds the new test.
  it.skip("pins the figures and shows the buttons by default", () => {
    const { html, lens } = mount(project());
    expect(html).toContain('data-figure-block="pinned"');
    expect(html).toMatch(/class="calvin-pin"[^>]*data-figure-block="pinned"/);
    expect(lens).toContain("Export report (PDF)");
    expect(mount(project(), {}, "report").html).toContain("Export (PDF)");
  });
  it("unpins the figures, still showing them, and hides the buttons when the site asks", () => {
    const { html, lens } = mount(project(), { unpinFigureBlock: true, hideExportButton: true });
    expect(html).toContain('data-figure-block="scrolls"');
    expect(html).toContain("data-figure-tiles");
    expect(html).toContain("data-pinned-header"); // the main credit tiles stay pinned (0.5.0)
    expect(lens).not.toContain("Export report (PDF)");
    const report = mount(project(), { hideExportButton: true }, "report").html;
    expect(report).not.toContain("Export (PDF)");
    expect(report).toContain("PAA V2.0 Report");
  });
});

describe("3. starting values follow details that arrive late", () => {
  const seed = (p: CalvinProject) => withSliderStarts(seedCalcState(p), p.analysis, true);
  it("moves the starts that hang on the technology and the people served", () => {
    const before = project({ technology: undefined, population: { mode: "people" } });
    const after = project();
    const s = followNewSeed(seed(before), seed(before), seed(after), after);
    expect(s.method).toBe(1);
    expect(s.operationalDays).toBe(347);
    expect(s.populationCount).toBe(1200);
  });
  it("keeps a value the person changed", () => {
    const before = project({ technology: undefined, population: { mode: "people" } });
    const typed = { ...seed(before), operationalDays: 300, populationCount: 900 };
    const s = followNewSeed(typed, seed(before), seed(project()), project());
    expect(s.operationalDays).toBe(300);
    expect(s.populationCount).toBe(900);
  });
});

describe("4 and 5. the lens note and the slider intro", () => {
  it("has no note of its own in the lens (0.5.0)", () => {
    const { lens } = mount(project());
    expect(lens).not.toContain("formula row");
    expect(lens).not.toContain("→");
  });
  it("words the slider intro as asked", () => {
    const s = seedCalcState(project());
    const html = renderToStaticMarkup(<ExAntePanel state={s} result={computeScenario(toScenarioInput(s))} patch={noop} />);
    expect(html.replace(/\s+/g, " ")).toContain(
      "For a planned project, move the sliders to match its expected performance. To type an exact number, tap the pencil.",
    );
  });
});

describe("9. the tag key", () => {
  it("holds the four tags in the maintainer's words, and the two marks", () => {
    const key = renderToStaticMarkup(<TagKey />);
    for (const line of [
      "<b>Entered</b>: typed in for this project, with its source named.",
      "<b>Default</b>: the value from the methodology or a cited reference, with its source and version.",
      "<b>Calculated</b>: worked out from other values.",
      "<b>Assumed</b>: a cautious estimate of how the project will perform. Change it to match your project.",
    ]) expect(key).toContain(line);
    expect(key).toContain(">baseline<");
    expect(key).toContain(">monitoring<");
  });
  it("sits behind a button on the work surface", () => {
    const { html } = mount(project());
    expect(html).toContain("What the tags mean");
    expect(html).not.toContain("<b>Calculated</b>");
  });
  it("never shows a visitor 'derived' or 'rulebook'", () => {
    for (const p of [project(), project({ technology: "HWT", population: { mode: "households", served: 300 } }), project({ country: "LSO" })]) {
      for (const tab of ["calculator", "report"]) {
        const s = seedCalcState(p);
        const html = mount(p, {}, tab).html + stack(s, { initialOpen: ALL_ROWS });
        expect(html).not.toMatch(/rulebook/i);
        expect(html).not.toMatch(/>derived</i);
        expect(html).not.toMatch(/— derived\b/);
      }
    }
  });
});

describe("10. entered now, proven later", () => {
  it("words both lines", () => {
    expect(proveLaterLine({ kind: "monitoring", sdws: "V2.0 SDWS 34", instrument: "usage survey" })).toBe(
      "You entered this. Monitoring must prove it later, for example with a usage survey.",
    );
    expect(proveLaterLine({ kind: "baseline", sdws: "V2.0 SDWS 30" })).toBe("You entered this. A baseline survey must prove it later.");
  });
  it("shows people served as ENTERED · MONITORING, with the line", () => {
    const html = stack(seedCalcState(project()), { initialOpen: ALL_ROWS });
    expect(html).toContain('data-prove-later="monitoring"');
    expect(html).toContain("You entered this. Monitoring must prove it later, for example with a usage survey.");
  });
  it("shows a typed household size as ENTERED · BASELINE, with the line", () => {
    const s = { ...seedCalcState(project({ technology: "HWT" })), householdSizeOverride: 4.2 };
    const html = stack(s, { initialOpen: ALL_ROWS });
    expect(html).toContain('data-prove-later="baseline"');
    expect(html).toContain("You entered this. A baseline survey must prove it later.");
  });
});

describe("11. planned production", () => {
  it("asks in plain words, starts blank and drops the jargon", () => {
    const s = seedCalcState(project());
    expect(s.meteredVolumeL).toBeNull();
    const html = stack(s);
    expect(html).toContain("How much water will the system produce in a year?");
    expect(html.replace(/\s+/g, " ")).toContain("Leave blank if you don’t know yet. If it produces less than people need, credits follow what it produces.");
    expect(html).toContain("No production entered, so credits follow the water people need.");
    expect(html).not.toMatch(/binds/);
  });
});

describe("12. equation numbers", () => {
  it("prints (Eq.N) in a label in the one small style", () => {
    const html = renderToStaticMarkup(<WithEqNums text="Q_pop (Eq.5)" />);
    expect(html).toContain("data-eq");
    expect(html).toContain("Eq.5");
    expect(html).not.toContain("(Eq.5)");
  });
  it("leaves no full-size (Eq.N) in the stack, and Q_pop keeps its value", () => {
    const s = seedCalcState(project());
    const result = computeScenario(toScenarioInput(s));
    const html = stack(s, { initialOpen: ALL_ROWS });
    expect(html).not.toMatch(/\(Eq\.\d/);
    expect(html).toContain(`${(result.Q_pop / 1e6).toFixed(2)} ML`);
  });
});

describe("13. C_b on the screening view", () => {
  it("is shown, not typed, and says why", () => {
    const html = stack(seedCalcState(project()), { screening: true, initialOpen: ALL_ROWS });
    expect(html).toContain("data-cb-screening");
    expect(html).toContain("V2.0 sets no default for this share (V2.0 SDWS 12, p.53).");
    expect(html).toContain("0% is the most generous value, not a cautious one");
    expect(html).toContain("Your baseline survey will set this later.");
  });
  it("stays a typed value off the screening view", () => {
    expect(stack(seedCalcState(project()), { initialOpen: ALL_ROWS })).not.toContain("data-cb-screening");
  });
});

describe("14. the DAF's working and BAU_y", () => {
  it("names the tool, the inputs, the table and the row", () => {
    const s = seedCalcState(project());
    const steps = dafSteps(computeScenario(toScenarioInput(s)), "KEN", "0.0345");
    expect(steps[0]).toContain("GS4GG PAA MT400-05 v1.0");
    expect(steps[1]).toContain("Kenya");
    expect(steps[1]).toContain("2026–2030");
    expect(steps[2]).toContain("Table 03");
    expect(steps[3]).toContain(`Kenya's row reads 0.0345 in the "Default DAF" column (basis: Country DAF)`);
  });
  it("says when the tool's fallback is used", () => {
    const s = seedCalcState(project({ country: "LSO" }));
    expect(dafSteps(computeScenario(toScenarioInput(s)), "LSO", "0.0125").join(" ")).toContain("absolute floor, 0.0125");
  });
  it("opens on screen, and lists BAU_y with its value", () => {
    const s = seedCalcState(project());
    const result = computeScenario(toScenarioInput(s));
    const html = stack(s, { initialOpen: ALL_ROWS });
    expect(html).toContain("data-daf-steps");
    expect(html).toContain("BAU_y — business-as-usual baseline");
    expect(html).toContain((result.result as { BE_BAU: number }).BE_BAU.toFixed(1));
  });
});

describe("15. explanation first, and the pump's emissions", () => {
  it("puts the plain line before the citation", () => {
    const html = stack(seedCalcState(project()));
    const plain = html.indexOf("Greenhouse gas released per litre");
    expect(plain).toBeGreaterThan(-1);
    expect(plain).toBeLessThan(html.indexOf("data-cite", plain));
  });
  it("drops the jargon", () => {
    expect(stack(seedCalcState(project()), { initialOpen: ALL_ROWS })).not.toMatch(/thin ex-ante|stays thin/);
  });
  it("asks for the emissions of a diesel or grid pump and shows no figures", () => {
    const { calc, html } = mount(project({ pumpPower: "diesel" }));
    expect(calc.activityAsk).toEqual({ power: "diesel" });
    expect(calc.result).toBeNull();
    expect(html).toContain("data-activity-ask");
    expect(html).not.toContain("data-figure-tiles");
    expect(calc.pageContext()).toContain("asking for the pump's activity emissions");
  });
  it("uses the entered figure, through the engine's own input", () => {
    const s = { ...seedCalcState(project({ pumpPower: "grid" })), activityEmissions: 2 };
    expect(activityEmissionsAsk(s)).toBeNull();
    expect(computeScenario(toScenarioInput(s)).result.PE).toBe(2);
  });
  it("keeps zero for a hand pump, gravity or solar supply, and the report says why", () => {
    const { calc } = mount(project({ pumpPower: "solar" }));
    expect(calc.activityAsk).toBeNull();
    expect(calc.result!.result.PE).toBe(0);
    expect(mount(project({ pumpPower: "solar" }), {}, "report").html).toContain("runs on solar power, which burns nothing");
  });
});

describe("16. Beta", () => {
  it("is gone from the screens (0.5.0)", () => {
    expect(mount(project()).html).not.toMatch(/data-beta|>Beta</);
  });
});

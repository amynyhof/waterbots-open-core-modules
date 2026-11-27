// Family 4, Console and surfaces: Calvin's report on core's one frame, his export through core's print part, his colour
// (M5.4) and his tap size (M5.3). Every project here is INVENTED.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EXPORT_WORDS } from "@waterbots/core/consoleWords";
import { REPORT_SECTIONS } from "@waterbots/core/report";
import CalculatorLens from "./CalculatorLens";
import CalculatorWork from "./CalculatorWork";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";
import type { CalvinProject } from "./state";

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
const here = new URL(".", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, here), "utf8");
const screenFiles = () => readdirSync(here).filter((f) => f.endsWith(".tsx") && !f.includes(".test."));

describe("his report is on core's one frame (rule 14)", () => {
  it("has the frame's header and its sections in core's order", () => {
    const { html } = mount(project());
    const report = html.slice(html.indexOf('class="wb-report print-report"'));
    const order = [...report.matchAll(/data-report-section="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["header", ...REPORT_SECTIONS.filter((s) => s !== "conditions" && s !== "site")]);
    expect(report).toContain("WaterBots.AI · PAA V2.0 Report");
    expect(report).toContain('data-report-stage="">Ex-ante estimate');
  });
  it("keeps his own words for each section, and his footer line", () => {
    const { html } = mount(project());
    for (const words of ["Emission reductions — result", "Derivation — PAA V2.0 (computation order)", "Parameters &amp; defaults (appendix)", "How these figures were produced", "On the use of these figures"]) expect(html).toContain(`<h2>${words}</h2>`);
    expect(html).toMatch(/data-report-footer="">Generated — · calculator v[\d.]+ · WaterBots\.AI v0\.0\.0 · GS4GG Emissions Calculator \(Calvin\)\.<\/footer>/);
  });
  it("the report carries the id his Export hands to core's print part", () => {
    const { html, calc } = mount(project());
    expect(calc.reportId).toMatch(/^calvin-report-/);
    expect(html).toContain(`id="${calc.reportId}" class="wb-report print-report" data-wb-report="calvin"`);
    expect(calc.exportOutcome).toBeNull();
  });
  it("prints his notes in core's one table", () => {
    const { html } = mount(project(), { place: "free-site" });
    expect(html).toMatch(/class="wb-notes" data-report-section="notes"><section data-notes-on-values="">/);
  });
});

describe("one Export, the same words on both buttons (rule 13)", () => {
  it("both buttons have the one name, with the line that says Save as PDF", () => {
    const { lens } = mount(project());
    const report = mount(project(), {}, "report").html;
    for (const html of [lens, report]) {
      expect(html).toContain(`>${EXPORT_WORDS.button}</button>`);
      expect(html).toContain("Choose &quot;Save as PDF&quot; there.");
    }
    expect(report).not.toContain("Export (PDF)<");
  });
  it("a site that hides them hides both", () => {
    expect(mount(project(), { hideExportButton: true }).lens).not.toContain(EXPORT_WORDS.button);
    expect(mount(project(), { hideExportButton: true }, "report").html).not.toContain(EXPORT_WORDS.button);
  });
  it("prints through core's print part, never with the page's own print", () => {
    const hook = read("./useCalculatorState.ts");
    expect(hook).toContain("printReport(report)");
    expect(hook).not.toContain("window.print()");
  });
});

describe("one colour, Reef, from one token (M5.4)", () => {
  it("every root of his screens sets --agent from core's colour list", () => {
    const { html, lens } = mount(project());
    expect(html.startsWith('<div class="calvin-screen" data-agent="calvin" style="display:contents;--agent:#0E8A94">')).toBe(true);
    expect(lens.startsWith('<div class="calvin-screen" data-agent="calvin" style="display:contents;--agent:#0E8A94">')).toBe(true);
    expect(mount(project({ country: undefined })).html.startsWith('<div class="calvin-screen"')).toBe(true);
  });
  it("his screens and his stylesheet name no other colour for him", () => {
    for (const f of screenFiles()) expect(read(f), f).not.toMatch(/--tide|[a-z:-]+-tide\b/);
    const css = read("../styles.css");
    expect(css).not.toContain("--tide");
    expect(css).toMatch(/\.calvin-pin \{[^}]*border-top: 3px solid var\(--agent\);/);
    expect(css).not.toMatch(/\.calvin-pin \{[^}]*--agent:/);
  });
});

describe("big enough to tap on a phone (M5.3)", () => {
  it("on a phone, his rows, buttons, boxes, tabs and folds are at least 44 pixels", () => {
    const css = read("../styles.css");
    const phone = css.slice(css.indexOf("@media (max-width: 639px), (pointer: coarse) {"));
    for (const sel of [".calvin-screen button", ".calvin-screen select", ".calvin-screen summary", '.calvin-screen [role="tab"]', ".calvin-screen input:not("]) expect(phone).toContain(sel);
    expect(phone).toMatch(/\{ min-height: var\(--wb-tap, 44px\); \}/);
    expect(phone).toMatch(/\.calvin-screen \.calvin-row \{ min-height: var\(--wb-tap, 44px\); align-items: center; \}/);
  });
  it("his value rows carry the row class the rule reads", () => {
    expect(mount(project()).html).toContain('class="calvin-row');
  });
});

describe("the built stylesheet carries core's frame first", () => {
  const built = new URL("../../../../dist/styles.css", here);
  it.runIf(existsSync(built))("dist/styles.css starts with core's report.css, then Calvin's own", () => {
    const css = readFileSync(built, "utf8").replace(/\r\n/g, "\n");
    const core = readFileSync(new URL("../../../../../core/src/report.css", here), "utf8").replace(/\r\n/g, "\n");
    expect(css.startsWith(core)).toBe(true);
    expect(css).toContain("/* Calvin's stylesheet");
  });
});

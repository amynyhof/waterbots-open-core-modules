// Calvin 0.5.0: the screens. No sum changes; each test checks words, layout or a setting. Every project here is INVENTED.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CalculatorLens from "./CalculatorLens";
import CalculatorWork from "./CalculatorWork";
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

function mount(p: CalvinProject, options: CalculatorOptions = {}, tab = "calculator", header?: string): { calc: CalculatorState; html: string; lens: string } {
  let calc: CalculatorState | undefined;
  function Seat() {
    calc = useCalculatorState(p, options);
    return <CalculatorWork calc={calc} project={p} appVersion="0.0.0" tab={tab} referenceCaseCount={44} />;
  }
  const html = renderToStaticMarkup(<Seat />);
  const lens = renderToStaticMarkup(<CalculatorLens calc={calc!} header={header ? <p>{header}</p> : undefined} />);
  return { calc: calc!, html, lens };
}

/** The markup inside the pinned header, and what follows it. */
function split(html: string): { pin: string; after: string } {
  const start = html.indexOf('class="calvin-pin"');
  const end = html.indexOf("data-tabs-note");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return { pin: html.slice(start, end), after: html.slice(end) };
}

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const transitionProject = project({ creditedUnderV1: true, analysis: { fnrbFiledV1: 0.3 } });

describe("1. the intro note", () => {
  it("is gone from the controls panel", () => {
    const { lens } = mount(project());
    expect(lens).not.toContain("All values");
    expect(lens).not.toContain("formula row");
  });
  it("still shows the host's own top of the panel", () => {
    expect(mount(project(), {}, "calculator", "The host's own words").lens).toContain("The host&#x27;s own words");
  });
});

describe("2. the pinned header", () => {
  it("holds the main credit tile and, by default, the smaller figures right under it", () => {
    const { pin, after } = split(mount(project()).html);
    expect(pin).toContain("data-pinned-main");
    expect(pin).toMatch(/PAA v2\.0/);
    expect(pin).toContain("tCO₂e/yr");
    expect(pin).toContain("data-figure-numbers");
    expect(after).not.toContain("data-figure-numbers");
  });
  it("keeps the main tile pinned when a site sets unpinFigureBlock, and lets the smaller figures scroll", () => {
    const { html } = mount(project(), { unpinFigureBlock: true });
    const { pin, after } = split(html);
    expect(html).toContain('data-figure-block="scrolls"');
    expect(pin).toContain("tCO₂e/yr");
    expect(pin).not.toContain("data-figure-numbers");
    expect(after).toContain("data-figure-numbers");
  });
  it("pins both tiles and the transition delta for a project credited under V1.0", () => {
    const { pin, after } = split(mount(transitionProject).html);
    expect(pin).toContain("Legacy V1.0");
    expect(pin).toContain("PAA v2.0");
    expect(pin).toContain("Transition delta (PAA − Legacy)");
    expect(after).toContain("Difference attributable to the methodology transition");
  });
  it("puts the sentence under the tiles below the header, where it scrolls", () => {
    const { pin, after } = split(mount(project()).html);
    expect(pin).not.toContain("A new project: its credits");
    expect(after).toContain("A new project: its credits are worked out under V2.0");
  });
  it("is pinned by Calvin's own stylesheet, with a setting for a site's own top bar", () => {
    expect(styles).toMatch(/\.calvin-pin \{[^}]*position: sticky;[^}]*top: var\(--calvin-pin-top, 0px\);/);
    expect(styles).toMatch(/@media \(max-width: 639px\) \{\s*\.calvin-pin \{ display: contents; \}\s*\.calvin-pin-main \{[^}]*position: sticky;/);
  });
  it("lets the sliders and the equations collapse, both open at the start", () => {
    const { html } = mount(project(), { exAnteSliders: true });
    expect(html).toMatch(/<details open="" class="calvin-fold[^"]*"[^>]*data-fold="sliders"/);
    expect(html).toMatch(/<details open="" class="calvin-fold"[^>]*data-fold="equations"/);
    expect(html).toContain("The calculation, step by step");
  });
});

describe("3. the Beta footer", () => {
  it("is gone from every view, including the ones that ask for a value", () => {
    const views = [
      mount(project()).html,
      mount(project({ population: undefined })).html,
      mount(project({ analysis: { mode: "ex-post" } })).html,
      mount(transitionProject).html,
      mount(project(), {}, "report").html,
    ];
    for (const html of views) expect(html).not.toMatch(/data-beta|>Beta</);
  });
});

describe("4. the phone pass", () => {
  it("lets a value row's tags and box move under its label rather than squeeze it", () => {
    expect(mount(project()).html).toContain('class="calvin-row flex items-baseline gap-2"');
    expect(styles).toMatch(/\.calvin-row \{ flex-wrap: wrap; justify-content: flex-end; \}/);
    expect(styles).toMatch(/\.calvin-row > :first-child \{ flex: 1 1 9rem; min-width: 0; \}/);
  });
  it("lets the line about the pencil wrap as text", () => {
    const html = mount(project()).html;
    const at = html.indexOf("Values marked");
    const open = html.lastIndexOf("<p", at);
    expect(html.slice(open, at)).not.toContain("flex");
  });
});

describe("5. the report", () => {
  it("no longer says the V2.0 calculation has had an external expert review", () => {
    const html = mount(project(), {}, "report").html;
    expect(html).not.toMatch(/external expert review/);
    expect(html).toContain("Read every V2.0 figure here as a screening estimate.");
  });
});

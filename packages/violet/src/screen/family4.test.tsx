// Family 4, Console and surfaces: Violet's report on core's one frame, her export through core's print part, one time
// stamp, her colour from core's list and her tap size. Every project here is made up.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EXPORT_WORDS } from "@waterbots/core/consoleWords";
import { REPORT_SECTIONS } from "@waterbots/core/report";
import { emptyRecord, type ProjectRecord } from "@waterbots/core/record";
import D3Screen, { SCREEN_WORDS, type D3ScreenProps } from "./D3Screen.js";
import { REPORT_WORDS } from "./D3Report.js";

const by = { by: "site intake", note: "made up" } as const;
function made(): ProjectRecord {
  const r = emptyRecord();
  r.facts.name = "Made-up test project";
  r.facts.population = { value: { mode: "people", served: 1200 }, source: by };
  return r;
}
const render = (props: D3ScreenProps) => renderToStaticMarkup(<D3Screen {...props} />);
const report = (html: string) => html.slice(html.lastIndexOf("<div", html.indexOf('data-wb-report="violet"')));
const here = new URL(".", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, here), "utf8").replace(/\r\n/g, "\n");

describe("her report is on core's one frame (rule 14)", () => {
  it("has the frame's header and its sections in core's order", () => {
    const r = report(render({ record: made(), place: "paid-site", view: "ex-ante" }));
    const order = [...r.matchAll(/data-report-section="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["header", ...REPORT_SECTIONS.filter((s) => s !== "site")]);
    expect(r).toContain(`WaterBots.AI · ${REPORT_WORDS.title}`);
    expect(r).toContain("<h1>VWBA 2.0 D-3 Volume Provided</h1>");
    expect(r).toContain('data-report-stage="">Draft — pending expert review');
  });
  it("keeps her words for each section, and her footer line", () => {
    const r = report(render({ record: made(), place: "free-site", lockView: "ex-ante" }));
    for (const words of [REPORT_WORDS.result, REPORT_WORDS.steps, REPORT_WORDS.values, REPORT_WORDS.conditions]) expect(r).toContain(`<h2>${words}</h2>`);
    expect(r).toContain(REPORT_WORDS.made);
    expect(r).toContain(REPORT_WORDS.estimate);
    expect(r).toMatch(/data-report-footer="">Generated — · D-3 engine v\d+\.\d+\.\d+ · Violet \(VWBA 2\.0\)<\/footer>/);
  });
  it("is hidden on the page, carries an id for her Export, and her colour on its own root", () => {
    const r = report(render({ record: made() }));
    expect(r).toMatch(/^<div data-violet-report="" data-view="ex-ante" id="violet-report-[^"]+" class="wb-report violet-report" data-wb-report="violet" data-wb-report-hidden="" style="--agent:#A457D4">/);
  });
  it("prints her notes in core's one table, and every note the person wrote", () => {
    const record = made();
    record.agents.violet = {
      notes: {
        peopleServed: { text: "Counted at a site visit.", changed: "2026-11-26T00:00:00Z", label: "People with access" },
        gone: { text: "A note on a value the report no longer shows.", changed: "2026-11-26T00:00:00Z", label: "An older value" },
      },
    } as NonNullable<ProjectRecord["agents"]["violet"]>;
    const r = report(render({ record, place: "paid-site" }));
    expect(r).toMatch(/class="wb-notes" data-report-section="notes"><section data-notes-on-values="">/);
    expect(r).toContain("Counted at a site visit.");
    expect(r).toContain("A note on a value the report no longer shows.");
    expect(r).toContain("An older value");
  });
});

describe("one Export (rule 13)", () => {
  it("her button has the one name, with the line that says Save as PDF", () => {
    const html = render({ record: made() });
    expect(SCREEN_WORDS.export).toBe(EXPORT_WORDS.button);
    expect(html).toContain(`>${EXPORT_WORDS.button}</button>`);
    expect(html).toContain("Choose &quot;Save as PDF&quot; there.");
    expect(render({ record: made(), hideExportButton: true })).not.toContain(EXPORT_WORDS.button);
  });
  it("prints through core's print part, stamps the time in core's one way, also before a site's own export", () => {
    const screen = read("./D3Screen.tsx");
    expect(screen).toContain("setExportOutcome(report ? printReport(report) : \"failed\")");
    expect(screen).not.toContain("window.print()");
    expect(screen).toMatch(/function exportReport\(\) \{\n    setPrintAt\(reportStamp\(\)\);/);
    expect(screen).not.toContain("toISOString());\n  }");
  });
});

describe("her colour and her tap size", () => {
  it("Orchid from core's list on her screen's root; her stylesheet reads only --agent", () => {
    expect(render({ record: made() })).toMatch(/^<section class="violet-d3"[^>]*style="--agent:#A457D4">/);
    const css = read("../styles.css");
    expect(css).not.toMatch(/--orchid/);
    expect(css).toMatch(/\.violet-d3 \[data-pinned-header\] \{[^}]*border-top: 3px solid var\(--agent\);/);
  });
  it("on a phone, everything she shows to tap is at least 44 pixels", () => {
    const css = read("../styles.css");
    const phone = css.slice(css.indexOf("@media (max-width: 639px), (pointer: coarse) {"));
    for (const sel of [".violet-d3 button", ".violet-d3 select", ".violet-d3 summary", ".violet-d3 input:not("]) expect(phone).toContain(sel);
    expect(phone).toMatch(/\{ min-height: var\(--wb-tap, 44px\); \}/);
  });
  it("her own print rules are gone: core's print part prints her report", () => {
    const css = read("../styles.css");
    expect(css).not.toContain("@media print");
    expect(css).not.toContain("visibility: hidden");
  });
});

describe("the built stylesheet carries core's frame first", () => {
  const built = new URL("../../dist/styles.css", here);
  it.runIf(existsSync(built))("dist/styles.css starts with core's report.css, then her own", () => {
    const css = readFileSync(built, "utf8").replace(/\r\n/g, "\n");
    const core = readFileSync(new URL("../../../core/src/report.css", here), "utf8").replace(/\r\n/g, "\n");
    expect(css.startsWith(core)).toBe(true);
    expect(css).toContain("/* Violet's screen styles");
  });
});

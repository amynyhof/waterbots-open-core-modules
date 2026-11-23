// Violet 0.5.1: "calculated", a blank for a missing value, "more to learn", and her stylesheet. Invented projects only.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeD3 } from "../d3/compute.js";
import { carbonShowsBeside, type CarbonReading } from "../doors.js";
import D3Screen from "./D3Screen.js";

const project = (served?: number) => ({
  name: "Invented test project",
  standards: [],
  ...(served !== undefined ? { population: { mode: "people" as const, served } } : {}),
});

describe("1. one set of value words: entered, default, calculated, assumed", () => {
  it("a value worked out from others is 'calculated'", () => {
    const r = computeD3({ view: "ex-ante", option: "beneficiaries", population: { mode: "households", served: 300, householdSize: 4 }, accessLevel: "full", withoutProjectM3PerYear: 0 });
    const origins = new Set(r.values.map((v) => v.origin));
    expect(origins.has("calculated")).toBe(true);
    for (const o of origins) expect([null, "entered", "default", "calculated", "assumed"]).toContain(o);
    expect(JSON.stringify(r)).not.toMatch(/"derived"/);
  });
});

describe("2. a missing value is a blank box, with no label", () => {
  const views = [
    renderToStaticMarkup(<D3Screen project={project(1200)} />),
    renderToStaticMarkup(<D3Screen project={project(1200)} view="ex-post" />),
    renderToStaticMarkup(<D3Screen project={project()} lockView="ex-ante" />),
  ];
  it("shows no 'awaiting' or 'not given' words, in the tables or the tag cells", () => {
    for (const html of views) expect(html).not.toMatch(/awaiting|not given/i);
  });
  it("leaves the value, its tag and its note blank", () => {
    const row = views[0]!.slice(views[0]!.indexOf('data-value="withoutProjectM3PerYear"'));
    expect(row).toMatch(/^data-value="withoutProjectM3PerYear"><th scope="row">[^<]*<\/th><td> <\/td><td data-origin="true"><\/td><td data-source="true">[^<]*<\/td><\/tr>/);
    // J5: the engine's own note sits under the source, and a blank value has none.
  });
  it("never counts a blank as zero: no benefit until the water before the project is given", () => {
    const r = computeD3({ view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 }, accessLevel: "full", daysOfAccessPerYear: 365 });
    expect(r.withProjectM3PerYear).not.toBeNull();
    expect(r.vwbM3PerYear).toBeNull();
  });
});

describe("3. one set of reading words: likely, more to learn, unlikely", () => {
  it("'more to learn' shows carbon beside water, as 'not enough known' did", () => {
    const words: CarbonReading[] = ["likely", "more to learn", "unlikely"];
    expect(words.map(carbonShowsBeside)).toEqual([true, true, false]);
  });
});

describe("4. her stylesheet", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const base = readFileSync(new URL("../../../core/src/base.css", import.meta.url), "utf8");
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  it("ships with the package and is copied into the build", () => {
    expect(pkg.exports["./styles.css"]).toBe("./dist/styles.css");
    expect(pkg.scripts.build).toContain("build:css");
    expect(pkg.scripts["build:css"]).toContain("'src/styles.css', 'dist/styles.css'");
  });
  it("uses only core's tokens and her own Orchid", () => {
    const defined = new Set([...`${base}\n${css}`.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const t of used) expect(defined, t).toContain(t);
    expect(css).toMatch(/:where\(:root\) \{\s*--orchid: #a457d4;\s*\}/);
  });
  it("styles only Violet's screen", () => {
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{/g, "").match(/[^{}]+(?=\{)/g)!.map((s) => s.trim()).filter(Boolean);
    for (const sel of selectors) for (const part of sel.split(",")) expect(part.trim(), part).toMatch(/^(\.violet-d3\b|:where\(:root\))/);
  });
  it("styles the class the screen carries", () => {
    expect(renderToStaticMarkup(<D3Screen project={project(1200)} />)).toContain('class="violet-d3"');
  });
});

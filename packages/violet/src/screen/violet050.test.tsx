// Violet 0.5.0: people served from the project record, as Calvin takes them, and the draft label. Invented projects only.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeD3 } from "../d3/compute.js";
import { D3_STATUS } from "../d3/types.js";
import D3Screen, { followRecord, missingPopulationFacts, recordPopulation, seedD3Input } from "./D3Screen.js";

const project = (population?: { mode?: "people" | "households"; served?: number; householdSize?: number }) => ({
  name: "Invented test project",
  standards: [],
  ...(population !== undefined ? { population } : {}),
});

describe("people served, from the project record", () => {
  it("takes a count above zero, with what it counts", () => {
    expect(recordPopulation(project({ mode: "people", served: 1200 }))).toEqual({ mode: "people", served: 1200 });
    expect(recordPopulation(project({ mode: "households", served: 300, householdSize: 4.5 }))).toEqual({ mode: "households", served: 300, householdSize: 4.5 });
  });
  it("reads a count of zero as an empty field, as Calvin does, and guesses nothing", () => {
    expect(recordPopulation(project({ mode: "people", served: 0 }))).toEqual({ mode: "people" });
    expect(recordPopulation(project({ served: 0, householdSize: 0 }))).toBeUndefined();
    expect(recordPopulation(project())).toBeUndefined();
    expect(seedD3Input(project({ mode: "people", served: 0 }), "ex-ante")).toEqual({ view: "ex-ante", option: "beneficiaries", population: { mode: "people" } });
  });
  it("follows the record when its count arrives or changes after the screen opens, and keeps every other value", () => {
    const opened = { ...seedD3Input(project(), "ex-ante"), accessLevel: "full" as const, daysOfAccessPerYear: 300 };
    const arrived = followRecord(opened, project({ mode: "people", served: 1200 }));
    expect(arrived).toEqual({ ...opened, population: { mode: "people", served: 1200 } });
    const changed = followRecord(arrived, project({ mode: "people", served: 900 }));
    expect(changed.population).toEqual({ mode: "people", served: 900 });
    expect(changed.daysOfAccessPerYear).toBe(300);
    expect(followRecord(changed, project()).population).toBeUndefined();
  });
  it("names what the record is missing, in Calvin's words", () => {
    const missing = (p: ReturnType<typeof project>) => missingPopulationFacts(seedD3Input(p, "ex-ante"));
    expect(missing(project())).toEqual(["people served"]);
    expect(missing(project({ served: 1200 }))).toEqual(["whether people served were counted as people or households"]);
    expect(missing(project({ mode: "households", served: 300 }))).toEqual(["people per household"]);
    expect(missing(project({ mode: "people", served: 1200 }))).toEqual([]);
  });
  it("shows the record's count on the screen", () => {
    const html = renderToStaticMarkup(<D3Screen project={project({ mode: "people", served: 1200 })} />);
    expect(html).toContain("People served: 1,200 people, from the project record.");
    expect(html).not.toContain("data-record-ask");
  });
  it("says where to fill in a missing count, rather than asking for it on the screen", () => {
    const html = renderToStaticMarkup(<D3Screen project={project()} />);
    expect(html).toContain("data-record-ask");
    expect(html.replace(/\s+/g, " ")).toContain("this project&rsquo;s record is missing people served. Fill it in on the project record and the figures follow.".replace("&rsquo;", "’"));
    expect(html).not.toMatch(/aria-label="People served"|People served \(/);
  });
  it("a site with no Project Record page is never pointed to one (2026-11-26)", () => {
    const html = renderToStaticMarkup(<D3Screen project={project()} recordPage={false} />);
    expect(html).toContain("data-record-ask");
    expect(html).not.toContain("Fill it in on the project record");
  });
});

describe("the draft label", () => {
  it("reads 'Draft — pending expert review'", () => {
    expect(D3_STATUS).toBe("Draft — pending expert review");
  });
  it("shows on the screen, in both views", () => {
    for (const view of ["ex-ante", "ex-post"] as const) {
      const html = renderToStaticMarkup(<D3Screen project={project({ mode: "people", served: 1200 })} view={view} />);
      expect(html).toContain('<p data-status="">Draft — pending expert review</p>');
    }
  });
  it("is on every result, so any report or answer built from one carries it", () => {
    const results = [
      computeD3({ view: "ex-ante", option: "beneficiaries" }),
      computeD3({ view: "ex-post", option: "metered", meteredM3PerYear: 5000, withoutProjectM3PerYear: 0 }),
      computeD3({ view: "ex-ante", option: "capacity", flowM3PerHour: 2, withoutProjectM3PerYear: 0 }),
    ];
    for (const r of results) expect(r.status).toBe(D3_STATUS);
  });
});

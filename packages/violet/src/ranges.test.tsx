// Violet's values and their ranges (ruled 2026-11-23). Every project here is invented.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyRecord } from "@waterbots/core/record";
import { computeD3Tool } from "./agent/tools.js";
import { D3_RANGES, d3Refusals, refuseD3, type D3NumberKey } from "./ranges.js";
import D3Screen, { recordRefusals, seedD3Input } from "./screen/D3Screen.js";
import type { D3Input } from "./d3/types.js";

const people: D3Input = { view: "ex-post", option: "beneficiaries", population: { mode: "people", served: 1200 }, accessLevel: "full", daysOfAccessPerYear: 300, withoutProjectM3PerYear: 0 };

describe("her number boxes refuse a number outside the range", () => {
  it.each([
    ["daysOfAccessPerYear", 400, "Days of access must be between 0 and 365."],
    ["daysOfAccessPerYear", -1, "Days of access must be between 0 and 365."],
    ["operatingHoursPerYear", 9000, "Operating hours must be between 0 and 8,760."],
    ["meteredM3PerYear", -1, "Metered water must be 0 or more."],
    ["flowM3PerHour", -1, "Flow of the system must be 0 or more."],
    ["withoutProjectM3PerYear", -1, "Water before the project must be 0 or more."],
  ] as const)("%s typed as %s", (key, v, message) => {
    expect(refuseD3(key, v)).toBe(message);
  });
  it("a number at an end is allowed", () => {
    expect([refuseD3("daysOfAccessPerYear", 365), refuseD3("daysOfAccessPerYear", 0), refuseD3("operatingHoursPerYear", 8760)]).toEqual([null, null, null]);
    for (const key of Object.keys(D3_RANGES) as D3NumberKey[]) expect(refuseD3(key, 0), key).toBeNull();
  });
});

describe("her tool refuses the same numbers, in the same words", () => {
  it.each([
    [{ daysOfAccessPerYear: 400 }, "Days of access must be between 0 and 365."],
    [{ population: { mode: "people", served: 0 } }, "People served must be a whole number, 1 or more."],
    [{ population: { mode: "households", served: 1.5, householdSize: 4 } }, "Households served must be a whole number, 1 or more."],
    [{ population: { mode: "households", served: 10, householdSize: 0 } }, "People per household must be more than 0."],
    [{ litresPerPersonPerDay: { value: -1, source: "invented" } }, "Litres per person a day must be 0 or more."],
    [{ withoutProjectM3PerYear: -5 }, "Water before the project must be 0 or more."],
  ])("%j", (bad, message) => {
    expect(() => computeD3Tool.execute({ waterSource: "new", treatment: "none", homeUse: "yes", ...people, ...bad })).toThrow(message);
  });
  it("after the project runs, 400 days gets the message and no figure", () => {
    expect(() => computeD3Tool.execute({ waterSource: "new", treatment: "none", homeUse: "yes", ...people, daysOfAccessPerYear: 400 })).toThrow("Days of access must be between 0 and 365.");
    expect(d3Refusals(people)).toEqual([]);
  });
});

describe("a number on the record that is outside its range is named, and never used", () => {
  it("from the shared record", () => {
    const record = emptyRecord();
    const by = { by: "site intake", note: "invented" } as const;
    record.facts.population = { value: { mode: "households", served: -40, householdSize: 4 }, source: by };
    record.facts.withoutProjectM3PerYear = { value: -1, source: by };
    const html = renderToStaticMarkup(<D3Screen record={record} />);
    expect(html).toContain("Households served must be a whole number, 1 or more.");
    expect(html).toContain("Water before the project must be 0 or more.");
    expect(html).toContain('aria-label="Water benefit, VWBA 2.0 D-3"');
    expect(html).not.toContain("m³/yr");
  });
  it("from a project: part of a person is refused, and a zero is an empty field", () => {
    const project = { name: "Invented", standards: [], population: { mode: "people" as const, served: 12.5 } };
    expect(recordRefusals(project)).toEqual(["People served must be a whole number, 1 or more."]);
    expect(seedD3Input(project, "ex-ante").population).toEqual({ mode: "people" });
    expect(recordRefusals({ ...project, population: { mode: "people", served: 0 } })).toEqual([]);
  });
});

describe("her rules and her screen's style", () => {
  it("her rulings hold the maintainer's line", () => {
    const page = readFileSync(new URL("../RULINGS.md", import.meta.url), "utf8").replace(/\s+/g, " ");
    expect(page).toContain("A number outside a value's range is refused where it is typed, and the message gives the range. A method cap is not a range.");
  });
  it("on a phone the tile sticks to the whole screen, and the parts inside a fold have space", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/@media \(max-width: 639px\) \{[^@]*\.violet-d3 \[data-pinned-header\] \{ display: contents; \}/);
    expect(css).toContain(".violet-d3 [data-fold] > :not(summary) ~ :not(summary) { margin-top: 10px; }");
  });
});

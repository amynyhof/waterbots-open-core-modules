// D-3 hand-worked cases. Every project here is invented. Each expected figure was worked out by hand, step by
// step, from the method in VWBA 2.0, Appendix D, D-3 (p.44 to 46). The working is written beside each case.
import { describe, expect, it } from "vitest";
import { computeD3 } from "./compute.js";
import { DAYS_CAP, DAYS_DEFAULT_FULL_ACCESS, PER_CAPITA_DEFAULT_L } from "./defaults.js";
import { D3_CITES } from "./sources.js";
import { AWAITING, type D3Input, type D3Result, type D3ValueKey } from "./types.js";

const val = (r: D3Result, key: D3ValueKey) => {
  const v = r.values.find((x) => x.key === key);
  if (v === undefined) throw new Error(`no value ${key}`);
  return v;
};

describe("hand-worked cases (invented projects)", () => {
  it("A. ex-ante, people served, full access, defaults only", () => {
    // 1,200 people × 20 L (Table D3.3, p.46) × 365 days (p.46) ÷ 1,000 = 8,760 m³. Before: 0. Benefit: 8,760 m³.
    const r = computeD3({
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "people", served: 1200 },
      accessLevel: "full",
      withoutProjectM3PerYear: 0,
    });
    expect(r.withProjectM3PerYear).toBe(8760);
    expect(r.vwbM3PerYear).toBe(8760);
    expect(val(r, "litresPerPersonPerDay").origin).toBe("default");
    expect(val(r, "daysOfAccessPerYear").origin).toBe("assumed");
    expect(r.awaiting).toEqual([]);
    expect(r.notes).toEqual([]);
  });

  it("B. ex-ante, households, held to what the system can supply", () => {
    // 300 households × 5 people = 1,500 people.
    // 1,500 × 20 L × 365 days ÷ 1,000 = 10,950 m³ for the people served.
    // The system: 1.5 m³/h × 4,000 h = 6,000 m³. The smaller is 6,000 m³ (p.46).
    // Before: 500 m³. Benefit: 6,000 − 500 = 5,500 m³.
    const r = computeD3({
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "households", served: 300, householdSize: 5 },
      accessLevel: "full",
      flowM3PerHour: 1.5,
      operatingHoursPerYear: 4000,
      withoutProjectM3PerYear: 500,
    });
    expect(val(r, "peopleServed").value).toBe(1500);
    expect(val(r, "peopleServed").origin).toBe("derived");
    expect(val(r, "beneficiaryVolumeM3PerYear").value).toBe(10950);
    expect(val(r, "supplyCapacityM3PerYear").value).toBe(6000);
    expect(r.withProjectM3PerYear).toBe(6000);
    expect(r.vwbM3PerYear).toBe(5500);
    expect(r.notes.join(" ")).toMatch(/uses what the system can supply/);
  });

  it("C. ex-ante, a school with limited access", () => {
    // 400 pupils × 2 L (Table D3.3, p.46) × 190 days set on the slider ÷ 1,000 = 152 m³. Before: 0.
    const r = computeD3({
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "people", served: 400 },
      accessLevel: "limited",
      daysOfAccessPerYear: 190,
      withoutProjectM3PerYear: 0,
    });
    expect(r.vwbM3PerYear).toBe(152);
    expect(val(r, "litresPerPersonPerDay").used).toBe(2);
  });

  it("D. limited access has no default days: awaited, never guessed", () => {
    const r = computeD3({
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "people", served: 400 },
      accessLevel: "limited",
      withoutProjectM3PerYear: 0,
    });
    expect(r.vwbM3PerYear).toBeNull();
    expect(r.awaiting).toContain("Days of access in a year");
    const slider = r.sliders.find((s) => s.key === "daysOfAccessPerYear");
    expect(slider?.start).toBeNull();
    expect(slider?.startLabel).toBe(AWAITING);
  });

  it("E. ex-ante, from the system's capacity", () => {
    // 2 m³/h × 3,000 h = 6,000 m³ (p.46). Before: 1,000 m³. Benefit: 5,000 m³.
    const r = computeD3({ view: "ex-ante", option: "capacity", flowM3PerHour: 2, operatingHoursPerYear: 3000, withoutProjectM3PerYear: 1000 });
    expect(r.withProjectM3PerYear).toBe(6000);
    expect(r.vwbM3PerYear).toBe(5000);
  });

  it("F. ex-post, from meter readings", () => {
    // Metered 7,300 m³. Before: 0. Benefit: 7,300 m³ (p.45).
    const r = computeD3({ view: "ex-post", option: "metered", meteredM3PerYear: 7300, withoutProjectM3PerYear: 0 });
    expect(r.vwbM3PerYear).toBe(7300);
    expect(r.sliders).toEqual([]);
  });

  it("G. ex-post, a monitored figure per person, and days typed above the cap", () => {
    // Monitoring shows 25 L per person per day (allowed, p.46). Days typed: 400. The cap is 365: the typed
    // value is kept, the sum uses 365, and a note says so (ruling 2026-11-12).
    // 800 × 25 × 365 ÷ 1,000 = 7,300 m³. Before: 0. Benefit: 7,300 m³.
    const r = computeD3({
      view: "ex-post",
      option: "beneficiaries",
      population: { mode: "people", served: 800 },
      accessLevel: "full",
      litresPerPersonPerDay: { value: 25, source: "invented household survey" },
      daysOfAccessPerYear: 400,
      withoutProjectM3PerYear: 0,
    });
    const days = val(r, "daysOfAccessPerYear");
    expect(days.value).toBe(400);
    expect(days.used).toBe(365);
    expect(days.note).toMatch(/You entered 400 days\. That is more than the cap of 365\. The sum uses the cap\./);
    expect(r.vwbM3PerYear).toBe(7300);
    expect(val(r, "litresPerPersonPerDay").source).toMatch(/^invented household survey \(allowed by VWBA 2\.0/);
  });

  it("H. ex-post, operating hours typed above a year's hours", () => {
    // 1 m³/h; 9,000 h typed; a year holds 8,760 h. The sum uses 8,760: 8,760 m³. Before: 0.
    const r = computeD3({ view: "ex-post", option: "capacity", flowM3PerHour: 1, operatingHoursPerYear: 9000, withoutProjectM3PerYear: 0 });
    expect(val(r, "operatingHoursPerYear").value).toBe(9000);
    expect(r.vwbM3PerYear).toBe(8760);
    expect(r.notes.length).toBe(1);
  });

  it("I. ex-ante, a typed value past the slider's ceiling is held to it", () => {
    const r = computeD3({
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "people", served: 100 },
      accessLevel: "full",
      daysOfAccessPerYear: 400,
      withoutProjectM3PerYear: 0,
    });
    // 100 × 20 × 365 ÷ 1,000 = 730 m³.
    expect(r.vwbM3PerYear).toBe(730);
    expect(r.notes.join(" ")).toMatch(/held at its ceiling of 365 days/);
  });

  it("J. a count with no unit is not people", () => {
    const r = computeD3({ view: "ex-ante", option: "beneficiaries", population: { served: 500 }, accessLevel: "full", withoutProjectM3PerYear: 0 });
    expect(r.vwbM3PerYear).toBeNull();
    expect(val(r, "peopleServed").note).toBe(`${AWAITING}: people or households?`);
  });

  it("K. the water before the project is asked, not assumed", () => {
    const r = computeD3({ view: "ex-ante", option: "capacity", flowM3PerHour: 1, operatingHoursPerYear: 1000 });
    expect(r.withProjectM3PerYear).toBe(1000);
    expect(r.vwbM3PerYear).toBeNull();
    expect(r.awaiting).toEqual(["Water this supply gave before the project"]);
  });

  it("L. a benefit below zero is shown as it is", () => {
    // 1 m³/h × 1,000 h = 1,000 m³. Before: 1,500 m³. Benefit: −500 m³.
    const r = computeD3({ view: "ex-post", option: "capacity", flowM3PerHour: 1, operatingHoursPerYear: 1000, withoutProjectM3PerYear: 1500 });
    expect(r.vwbM3PerYear).toBe(-500);
    expect(r.notes.join(" ")).toMatch(/below zero/);
  });
});

describe("refusals", () => {
  it("refuses meter readings before the project runs", () => {
    expect(() => computeD3({ view: "ex-ante", option: "metered", meteredM3PerYear: 10 })).toThrow(/after the project runs/);
  });
  it("refuses a per-person figure with no source", () => {
    const input: D3Input = { view: "ex-ante", option: "beneficiaries", litresPerPersonPerDay: { value: 50, source: " " } };
    expect(() => computeD3(input)).toThrow(/needs its source/);
  });
  it("refuses a number below zero", () => {
    expect(() => computeD3({ view: "ex-post", option: "metered", meteredM3PerYear: -1 })).toThrow(/below zero/);
  });
});

describe("defaults, caps and sources", () => {
  it("keeps the default and the cap as two separate things", () => {
    expect(DAYS_DEFAULT_FULL_ACCESS).toBe(365);
    expect(DAYS_CAP).toBe(365);
    const r = computeD3({ view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 10 }, accessLevel: "full", withoutProjectM3PerYear: 0 });
    const slider = r.sliders.find((s) => s.key === "daysOfAccessPerYear");
    expect(slider?.ceilingSource).toMatch(/a year has 365 days/);
    expect(slider?.startSource).toMatch(/Option 3, p\.46/);
    expect(val(r, "litresPerPersonPerDayDefault").value).toBe(PER_CAPITA_DEFAULT_L.full);
  });

  it("cites every place to VWBA 2.0 by section and page", () => {
    for (const c of Object.values(D3_CITES)) {
      expect(c.doc).toBe("VWBA 2.0");
      expect(c.section.length).toBeGreaterThan(0);
      expect(c.page).toBeGreaterThanOrEqual(21);
      expect(c.page).toBeLessThanOrEqual(46);
    }
  });

  it("gives every value a source, and every awaited value the awaiting words", () => {
    const r = computeD3({ view: "ex-ante", option: "beneficiaries" });
    for (const v of r.values) expect(v.source.length).toBeGreaterThan(0);
    for (const v of r.values.filter((x) => r.awaiting.includes(x.label))) expect(v.note).toMatch(new RegExp(AWAITING));
  });

  it("never carries a carbon figure", () => {
    const r = computeD3({ view: "ex-post", option: "metered", meteredM3PerYear: 1, withoutProjectM3PerYear: 0 });
    expect(JSON.stringify(r)).not.toMatch(/carbon|co2|tco2/i);
  });
});

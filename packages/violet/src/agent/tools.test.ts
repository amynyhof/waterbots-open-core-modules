import { describe, expect, it } from "vitest";
import { computeD3Tool, VIOLET_TOOLS } from "./tools.js";
import { computeD3 } from "../d3/compute.js";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";

describe("Violet's calculator tool", () => {
  it("calls the engine and hands back its sources", async () => {
    // Invented: 1,200 people, full access, defaults. 1,200 × 20 × 365 ÷ 1,000 = 8,760 m³.
    const run = await computeD3Tool.execute({
      waterSource: "new", treatment: "none", homeUse: "yes",
      view: "ex-ante",
      option: "beneficiaries",
      population: { mode: "people", served: 1200 },
      accessLevel: "full",
      withoutProjectM3PerYear: 0,
    });
    expect((run.output as { vwbM3PerYear: number }).vwbM3PerYear).toBe(8760);
    expect(run.sources.some((s) => s.includes("Table D3.3, p.46"))).toBe(true);
    expect(run.meta).toEqual({ calculatorVersion: D3_ENGINE_VERSION });
  });

  it("says which values are blank or assumed, as facts, in no words of hers (MCP)", async () => {
    const given = { view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 }, accessLevel: "full" } as const;
    const run = await computeD3Tool.execute({ waterSource: "new", treatment: "none", homeUse: "yes", ...given });
    const { blankOrAssumed, ...rest } = run.output as { blankOrAssumed: { key: string; label: string; standing: string }[] };
    expect(blankOrAssumed).toEqual([
      { key: "daysOfAccessPerYear", label: "Days of access in a year", standing: "assumed" },
      { key: "withoutProjectM3PerYear", label: "Water this supply gave before the project", standing: "blank" },
    ]);
    expect(JSON.stringify(blankOrAssumed)).not.toContain("likely change");
    expect(rest).toEqual(computeD3(given));
  });

  it("refuses input it cannot use, in words the model can act on", () => {
    expect(() => computeD3Tool.execute({ waterSource: "new", treatment: "none", homeUse: "yes", view: "ex-ante", option: "metered" })).toThrow(/after the project runs/);
    expect(() => computeD3Tool.execute("not an object")).toThrow(/must be an object/);
  });

  it("is Violet's only tool for now", () => {
    expect(VIOLET_TOOLS.map((t) => t.id)).toEqual(["calc/vwba-d3.computeD3"]);
  });
});

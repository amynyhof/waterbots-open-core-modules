import { describe, expect, it } from "vitest";
import { computeD3Tool, VIOLET_TOOLS } from "./tools.js";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";

describe("Violet's calculator tool", () => {
  it("calls the engine and hands back its sources", async () => {
    // Invented: 1,200 people, full access, defaults. 1,200 × 20 × 365 ÷ 1,000 = 8,760 m³.
    const run = await computeD3Tool.execute({
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

  it("refuses input it cannot use, in words the model can act on", () => {
    expect(() => computeD3Tool.execute({ view: "ex-ante", option: "metered" })).toThrow(/after the project runs/);
    expect(() => computeD3Tool.execute("not an object")).toThrow(/must be an object/);
  });

  it("is Violet's only tool for now", () => {
    expect(VIOLET_TOOLS.map((t) => t.id)).toEqual(["calc/vwba-d3.computeD3"]);
  });
});

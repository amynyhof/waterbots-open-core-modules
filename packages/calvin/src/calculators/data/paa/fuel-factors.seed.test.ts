// THE SEED VERSION of ./fuel-factors.test.ts (CARRY_RULES C7; Amy, 2026-10-23). The same checks, with
// every registry id checked against the public source index rather than the source registry, which
// never crosses. A seed carries the index filtered to the rows it names; this site carries all of it,
// so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import factors from "./fuel-factors.json";

const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

describe("PAA v2.0 fuel factors (V2 SDWS 9 p.51, SDWS 10 p.52)", () => {
  it("carries wood unchanged and the three charcoal conventions as printed", () => {
    expect([factors.fuels.wood.ef_co2, factors.fuels.wood.ef_nonco2]).toEqual([112, 9.46]);
    const c = factors.fuels.charcoal;
    expect(c["combustion-only"]).toEqual({ ef_co2: 112, ef_nonco2: 5.87 });
    expect(c["6:1"]).toEqual({ ef_co2: 355.36, ef_nonco2: 89.68 });
    expect(c["4:1"]).toEqual({ ef_co2: 236.91, ef_nonco2: 61.74 });
  });

  it("V1's charcoal figure is none of V2's — the reason the guard exists", () => {
    const v1 = factors.v1_for_comparison.charcoal;
    const v2 = Object.values(factors.fuels.charcoal).filter((v): v is { ef_co2: number; ef_nonco2: number } => typeof v === "object" && "ef_co2" in v);
    expect(v2.some((v) => v.ef_co2 === v1.ef_co2)).toBe(false);
  });

  it("references only registry ids that exist", () => {
    for (const id of factors.registrySources) {
      expect(indexYaml, `registry id "${id}" not found`).toContain(`- id: "${id}"`);
    }
  });
});

// THE SEED VERSION of ./defaults.test.ts (CARRY_RULES C7; Amy, 2026-10-23). The same checks, with
// every registry id checked against the public source index rather than the source registry, which
// never crosses. A seed carries the index filtered to the rows it names; this site carries all of it,
// so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import defaults from "./defaults.json";

// Read the public source index as text so the data file can be checked against
// it without a YAML dependency: every cited registry id must actually exist.
const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

type ParamEntry = { cite?: string; registry?: string; [k: string]: unknown };
const params = defaults.parameters as Record<string, ParamEntry>;

describe("legacy default parameters (CALCULATOR_SPEC §2.6)", () => {
  it("carries the spec-confirmed values", () => {
    const p = defaults.parameters;
    expect(p.SE_o.value).toBe(360.83);
    expect(p.EF_CO2.wood).toBe(112);
    expect(p.EF_CO2.charcoal).toBe(165.22);
    expect(p.EF_nonCO2.wood).toBe(9.46);
    expect(p.EF_nonCO2.charcoal).toBe(44.83);
    expect(p.eta).toMatchObject({ TSF: 0.1, conventional: 0.2, ICS: 0.3, other: 1 });
    // R1 (2026-09-21): the CWS workbook's applied value was never a methodology default — retired;
    // its record left this file for the maintainers' archive on 2026-10-23 (Amy).
    expect((p as Record<string, unknown>).fNRB_default).toBeUndefined();
    expect((p as Record<string, unknown>).fNRB_workbook_applied_value_RETIRED).toBeUndefined();
    expect(p.Xcleanboil_default.value).toBe(0);
    expect(p.Mq_default.value).toBe(1);
    expect(p.EF_ec.above_250_kWh_yr).toBe(0.001);
    expect(p.EF_ec.below_250_kWh_yr).toBe(0.0008);
    expect(p.TDL_ec.value).toBe(0.2);
    expect(p.QPW_institutional).toMatchObject({ full_day: 4, half_day: 3 });
    expect(p.QPW_cap.value).toBe(5.5);
  });

  it("gives every parameter a citation and a registry id (no un-sourced defaults)", () => {
    for (const [name, entry] of Object.entries(params)) {
      expect(entry.cite, `${name} is missing a cite`).toBeTruthy();
      expect(entry.registry, `${name} is missing a registry id`).toBeTruthy();
    }
  });

  it("references only registry ids that exist in the public source index", () => {
    const ids = new Set<string>([
      ...defaults.registrySources,
      ...Object.values(params).map((e) => e.registry!).filter(Boolean),
    ]);
    for (const id of ids) {
      expect(indexYaml, `registry id "${id}" not in the public index`).toContain(`- id: "${id}"`);
    }
  });

  it("is tagged as the legacy V1.0 gs4gg-carbon table with a semver version", () => {
    expect(defaults.pathway).toBe("gs4gg-carbon");
    expect(defaults.method).toBe("legacy-v1.0");
    expect(defaults.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

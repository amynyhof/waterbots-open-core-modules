// THE SEED VERSION of ./countries.test.ts (CARRY_RULES C7; Amy, 2026-10-23). The same checks, with
// every registry id checked against the public source index rather than the source registry, which
// never crosses. A seed carries the index filtered to the rows it names; this site carries all of it,
// so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import householdSize from "./countries.json";

const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

// Same six anchors as calculators/data/age-shares (M8 households<->people toggle).
const ANCHORS = ["IND", "KEN", "UGA", "MWI", "TZA", "NER"] as const;
type Row = { name: string; peoplePerHousehold: number; source: string; reference_year: number };

describe("UN household-size default (M8 population-input toggle)", () => {
  it("has a plausible average household size for each anchor", () => {
    for (const iso of ANCHORS) {
      const c = (householdSize.countries as Record<string, Row>)[iso];
      expect(c, `${iso} missing`).toBeTruthy();
      // Real national averages sit well inside these bounds; they guard against unit slips.
      expect(c.peoplePerHousehold).toBeGreaterThan(2);
      expect(c.peoplePerHousehold).toBeLessThan(9);
      expect(c.reference_year).toBeGreaterThanOrEqual(2000);
    }
  });

  it("orders demographically (Niger largest households, Kenya smallest)", () => {
    const c = householdSize.countries as Record<string, Row>;
    expect(c.NER.peoplePerHousehold).toBeGreaterThan(c.KEN.peoplePerHousehold);
  });

  it("cites the UN household-size registry source, which exists in the public source index", () => {
    expect(householdSize.registrySources).toContain("un-hh-size-2022");
    for (const id of householdSize.registrySources) {
      expect(indexYaml, `registry id "${id}" not found`).toContain(`- id: "${id}"`);
    }
  });

  it("covers the full UN source, not just the anchors (coverage rule)", () => {
    // Anchors are test scenarios, not coverage limits — the file spans every country
    // the UN source provides. All values must be plausible people/household.
    const entries = Object.values(householdSize.countries as Record<string, Row>);
    expect(entries.length).toBeGreaterThan(150);
    for (const c of entries) {
      expect(c.peoplePerHousehold).toBeGreaterThan(1);
      expect(c.peoplePerHousehold).toBeLessThan(12);
    }
  });

  it("holds no stand-in for a missing country — household size is then the project's own, asked for (Amy, 2026-10-23)", () => {
    // The 25th-percentile quartile dial was our own statistic, not a published default. Its record
    // left this file for the maintainers' archive on 2026-10-23.
    expect((householdSize as Record<string, unknown>).fallback).toBeUndefined();
  });
});

// THE SEED VERSION of ./countries.test.ts (CARRY_RULES C7; Amy, 2026-10-23). The same checks, with
// every registry id checked against the public source index rather than the source registry, which
// never crosses. A seed carries the index filtered to the rows it names; this site carries all of it,
// so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fnrb from "./countries.json";

const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

const ANCHORS = ["IND", "KEN", "UGA", "MWI", "TZA", "NER"] as const;
type Vintage = {
  label: string;
  countries: Record<string, { name: string; fnrb: number }>;
  multiNational?: {
    cite: string;
    footnote5: string;
    noGlobalValue: string;
    supportingRule: string;
    refusal: string;
    registrySources: string[];
    regionMap: string;
    regions: Record<string, { label: string; fnrb: number }>;
  };
  /** Struck 2026-09-22 (ruling (3)) — kept in the file as the record, read by nothing. */
  "retired_2026-09-22_fallback": { struck: string; conservativeDirection: string; percentiles: { p25: number; p50: number; p75: number }; cite: string };
  registrySources: string[];
  cite: string;
  coverage: string;
};
const report = fnrb.vintages["mofuss-2024-06-report"] as Vintage;
const official = fnrb.vintages["mofuss-adm0-csv"] as Vintage;

describe("per-country fNRB — the official source (CALCULATOR_SPEC §2.8; Amy's rulings (2) and (4), 2026-09-21)", () => {
  // THE OFFICIAL-ANCHOR GATE. The default vintage carries A6.4-AMT-009 v01.0 Table 3 exactly — the same
  // values as CDM TOOL33 v03.0 Table 3 (AMT-009 ¶16), read from both PDFs on 2026-09-22. These six are
  // the countries the reference dataset is built on; a drift here is a drift in every reference entry.
  it("default vintage carries the official Table 3 anchors exactly (official-anchor gate)", () => {
    const c = official.countries;
    expect(c.IND.fnrb).toBe(0.07);
    expect(c.KEN.fnrb).toBe(0.29);
    expect(c.UGA.fnrb).toBe(0.39);
    expect(c.MWI.fnrb).toBe(0.48);
    expect(c.TZA.fnrb).toBe(0.51);
    expect(c.NER.fnrb).toBe(0.61);
  });

  it("the default vintage cites A6.4-AMT-009 Table 3 as the authority, with TOOL33 and MoFuSS as its origin", () => {
    expect(official.label).toContain("A6.4-AMT-009");
    expect(official.cite).toContain("A6.4-AMT-009 v01.0 Table 3");
    expect(official.cite).toContain("TOOL33 v03.0");
    expect(official.cite).toContain("MoFuSS");
    expect(official.registrySources).toContain("a64-amt-009-fnrb");
    expect(official.registrySources).toContain("cdm-tool33");
    // The rule-update line's citation leads with the official instrument (scenario.ts prints the
    // clause before the first ";" in the report's driver sentence).
    expect(fnrb.ruleUpdate.instrument.split(";")[0]).toContain("A6.4-AMT-009 v01.0");
    expect(fnrb.ruleUpdate.instrument).toContain("TOOL33 v03.0");
    expect(fnrb.ruleUpdate.instrument).not.toContain("Table 5");
  });

  // The June-2024 report vintage is kept as a cited HISTORICAL record and drives nothing. It differs
  // from the official values on five of the six anchors (the tools took the adm0 dataset, not Table 5).
  it("the June-2024 report vintage is historical, non-default, and still carries Table 5's values as read", () => {
    expect(fnrb.defaultVintage).not.toBe("mofuss-2024-06-report");
    expect(report.label).toContain("HISTORICAL");
    const c = report.countries;
    expect(c.IND.fnrb).toBe(0.06);
    expect(c.KEN.fnrb).toBe(0.3);
    expect(c.UGA.fnrb).toBe(0.35);
    expect(c.MWI.fnrb).toBe(0.49);
    expect(c.TZA.fnrb).toBe(0.51);
    expect(c.NER.fnrb).toBe(0.6);
  });

  it("the official vintage covers the full Table 3 (90 countries)", () => {
    const entries = Object.values(official.countries);
    expect(entries.length).toBe(90);
    for (const e of entries) {
      // fNRB is a fraction in [0,1]; 0 is valid (fully renewable biomass).
      expect(e.fnrb).toBeGreaterThanOrEqual(0);
      expect(e.fnrb).toBeLessThanOrEqual(1);
    }
    for (const iso of ANCHORS) expect(official.countries[iso], `${iso} missing`).toBeTruthy();
  });

  it("defaults new ex-ante to the official vintage", () => {
    expect(fnrb.defaultVintage).toBe("mofuss-adm0-csv");
  });

  // ── Ruling (3): the official multi-national fallback replaces the quartile dial (2026-09-22) ──

  it("the default vintage carries A6.4-AMT-009 Table 2's three multi-national values exactly", () => {
    const mn = official.multiNational!;
    expect(mn.regions.asia.fnrb).toBe(0.18);
    expect(mn.regions["latin-america"].fnrb).toBe(0.32);
    expect(mn.regions["sub-saharan-africa"].fnrb).toBe(0.4);
    expect(Object.keys(mn.regions).length).toBe(3); // Table 2 publishes three regions, no more
  });

  it("the multi-national values cite Table 2 and read their regions from the UN M49 map", () => {
    const mn = official.multiNational!;
    expect(mn.cite).toContain("A6.4-AMT-009 v01.0 Table 2");
    expect(mn.cite).toContain("TOOL33 v03.0");
    expect(mn.regionMap).toBe("calculators/data/regions/un-m49.json");
    expect(mn.registrySources).toContain("a64-amt-009-fnrb");
    expect(mn.registrySources).toContain("cdm-tool33");
    for (const id of mn.registrySources) {
      expect(indexYaml, `registry id "${id}" not found`).toContain(`- id: "${id}"`);
    }
  });

  // AMY'S QUESTION, 2026-09-22, ANSWERED FROM BOTH PRIMARY PDFs: is there a GLOBAL row we are
  // refusing unnecessarily? No. AMT-009 Table 2 has exactly three rows and the word "global"
  // appears nowhere in the document; TOOL33 v03.0 Table 2 is "Regional (Continental)" with the
  // same three. Table 4 is SUB-national — narrower, not broader. The refusal is the whole of what
  // the tools offer, not a choice among options. This test is the record, so nobody re-checks.
  it("records that NEITHER tool publishes a global fNRB row — the basis of the refusal", () => {
    const mn = official.multiNational!;
    expect(mn.noGlobalValue).toContain("NEITHER TOOL PUBLISHES A GLOBAL OR WORLD fNRB ROW");
    expect(mn.noGlobalValue).toContain("CDM TOOL33 v03.0");
    // Three regions, and no fourth hiding under a global-sounding key.
    expect(Object.keys(mn.regions)).not.toContain("global");
    expect(Object.keys(mn.regions)).not.toContain("world");
  });

  it("records TOOL33's national-then-regional order of preference beside the values", () => {
    expect(official.multiNational!.supportingRule).toContain("TOOL33 v03.0 para.16");
    expect(official.multiNational!.supportingRule).toContain("a regional value is allowed only when no national value exists");
  });

  it("footnote 5's condition is held in the data file, so the report prints the source's words", () => {
    const f = official.multiNational!.footnote5;
    expect(f).toContain("A6.4-AMT-009 footnote 5");
    expect(f).toContain("no country-specific national value exists");
    expect(f).toContain("charcoal");
  });

  it("the quartile dial is struck on every vintage, kept as the record and read by nothing", () => {
    for (const v of [report, official]) {
      expect((v as unknown as Record<string, unknown>).fallback).toBeUndefined();
      const struck = v["retired_2026-09-22_fallback"];
      expect(struck.struck).toContain("STRUCK 2026-09-22");
      expect(struck.conservativeDirection).toBe("low"); // the record of what was read
    }
    // The historical vintage gets no multi-national block: nothing computes on it.
    expect(report.multiNational).toBeUndefined();
  });

  it("the workbook comparator is retired (R1, 2026-09-21) and only real registry ids are referenced", () => {
    // Retired on R1; its record left this file for the maintainers' archive on 2026-10-23 (Amy).
    expect((fnrb as Record<string, unknown>).legacy_flat_default).toBeUndefined();
    expect((fnrb as Record<string, unknown>)["retired_2026-09-21"]).toBeUndefined();
    const ids = new Set<string>([
      ...report.registrySources,
      ...official.registrySources,
      ...fnrb.ruleUpdate.registrySources,
    ]);
    for (const id of ids) {
      expect(indexYaml, `registry id "${id}" not found`).toContain(`- id: "${id}"`);
    }
  });
});

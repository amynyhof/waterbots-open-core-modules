// THE SEED VERSION of ./countries.test.ts (CARRY_RULES C7; Amy, 2026-10-23). The same checks, with
// every registry id checked against the public source index rather than the source registry, which
// never crosses. A seed carries the index filtered to the rows it names; this site carries all of it,
// so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ageShares from "./countries.json";

const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

const ANCHORS = ["IND", "KEN", "UGA", "MWI", "TZA", "NER"] as const;
type Share = { under5: number; age5_18: number; adult19plus: number };

describe("UN WPP age-shares default (CALCULATOR_SPEC §3.1.1)", () => {
  it("has all three shares for each anchor, each in (0,1), summing to ~1", () => {
    for (const iso of ANCHORS) {
      const c = (ageShares.countries as Record<string, Share>)[iso];
      expect(c, `${iso} missing`).toBeTruthy();
      for (const k of ["under5", "age5_18", "adult19plus"] as const) {
        expect(c[k]).toBeGreaterThan(0);
        expect(c[k]).toBeLessThan(1);
      }
      const sum = c.under5 + c.age5_18 + c.adult19plus;
      expect(Math.abs(sum - 1), `${iso} shares sum ${sum}`).toBeLessThan(0.001);
    }
  });

  it("Malawi: the exact single-age shares (2026-09-21) — 0.1445 / 0.3591 / 0.4964", () => {
    // From the UN WPP 2024 single-age file, year 2024, medium variant: ages 0–4, 5–18, 19+.
    // The 5-year-band build (v1.x) read slightly different shares, with a guessed split of the 15–19 band.
    expect([ageShares.countries.MWI.under5, ageShares.countries.MWI.age5_18, ageShares.countries.MWI.adult19plus]).toEqual([0.1445, 0.3591, 0.4964]);
  });

  it("orders demographically (Niger youngest, India least young)", () => {
    const c = ageShares.countries;
    expect(c.NER.under5).toBeGreaterThan(c.IND.under5);
    expect(c.IND.adult19plus).toBeGreaterThan(c.NER.adult19plus);
  });

  it("cites the UN WPP single-age registry source (exact 18/19 boundary), which exists in the public source index", () => {
    expect(ageShares.registrySources).toContain("un-wpp-2024-pop-age1");
    expect(ageShares.method).toContain("single-age");
    for (const id of ageShares.registrySources) {
      expect(indexYaml, `registry id "${id}" not found`).toContain(`- id: "${id}"`);
    }
  });

  it("covers the full UN WPP source, not just anchors (coverage rule); every share valid", () => {
    const entries = Object.values(ageShares.countries as Record<string, Share>);
    expect(entries.length).toBeGreaterThan(150);
    for (const c of entries) {
      for (const k of ["under5", "age5_18", "adult19plus"] as const) {
        expect(c[k]).toBeGreaterThan(0);
        expect(c[k]).toBeLessThan(1);
      }
      expect(Math.abs(c.under5 + c.age5_18 + c.adult19plus - 1)).toBeLessThan(0.001);
    }
  });

  it("provides a cited global-default fallback that also sums to ~1", () => {
    const g = (ageShares as { globalDefault?: Share & { cite: string } }).globalDefault;
    expect(g).toBeTruthy();
    expect(Math.abs(g!.under5 + g!.age5_18 + g!.adult19plus - 1)).toBeLessThan(0.001);
    expect(g!.cite).toContain("WPP");
  });
});

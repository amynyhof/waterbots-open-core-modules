// THE SEED VERSION of ./countries.test.ts (CARRY_RULES C7 and C31; Amy, 2026-10-23). A seed carries
// only the six rows of this table that were already public, so this checks those six and nothing that
// depends on the other rows: not the row count, not other countries' values, not which selectable
// countries the full table lists. Registry ids are checked against the public source index. This site
// carries the full table and all of it, so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import daf from "./countries.json";

const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

type Row = { name: string; daf_2026_2030: number; basis: string };
const rows = daf.countries as Record<string, Row>;
const FLOOR = daf.absolute_floor.value;

/** The six rows a seed carries (C31), at the values they have always had. */
const SIX: Record<string, number> = { IND: 0.0204, KEN: 0.0345, UGA: 0.0345, MWI: 0.0345, TZA: 0.0345, NER: 0.0345 };

describe("DAF table, the six rows a seed carries (CALCULATOR_SPEC §3.4)", () => {
  it("holds each of the six rows at the value it always had", () => {
    for (const [iso, value] of Object.entries(SIX)) {
      expect(rows[iso], iso).toBeDefined();
      expect(rows[iso].daf_2026_2030, iso).toBe(value);
      expect(rows[iso].name, iso).toBeTruthy();
      expect(rows[iso].basis, iso).toBeTruthy();
    }
  });

  it("pins the 1.25% absolute floor, and the six are at or above it", () => {
    expect(FLOOR).toBe(0.0125);
    for (const iso of Object.keys(SIX)) expect(rows[iso].daf_2026_2030, iso).toBeGreaterThanOrEqual(FLOOR);
  });

  it("references only registry ids that exist in the public source index", () => {
    for (const id of daf.registrySources) {
      expect(indexYaml, `registry id "${id}" not in the public index`).toContain(`- id: "${id}"`);
    }
  });
});

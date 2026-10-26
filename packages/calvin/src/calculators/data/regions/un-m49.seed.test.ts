// THE SEED VERSION of ./un-m49.test.ts (CARRY_RULES C7; Amy, 2026-10-23). The same checks, with
// every registry id checked against the public source index rather than the source registry, which
// never crosses. A seed carries the index filtered to the rows it names; this site carries all of it,
// so the test runs, and passes, on both. The full test stays here.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import m49 from "./un-m49.json";
import { COUNTRIES } from "../countries";

const indexYaml = readFileSync(
  fileURLToPath(new URL("../../../sources/public-index.yaml", import.meta.url)),
  "utf8",
);

type Row = {
  name: string;
  m49: string;
  region: { code: string; name: string } | null;
  subRegion: { code: string; name: string } | null;
  intermediateRegion?: { code: string; name: string };
  toolRegion: string | null;
};
const countries = m49.countries as unknown as Record<string, Row>;

/**
 * The UN M49 geoscheme is GEOGRAPHY ONLY — it carries no fNRB number and no methodology
 * parameter. It exists because A6.4-AMT-009 v01.0 Table 2 publishes fNRB values for three
 * regions (Asia, Latin America, Sub-Saharan Africa) and names no country list for any of
 * them, so something cited has to decide which region a country sits in (Amy's ruling (3)(a),
 * 2026-09-21). The fNRB values these regions carry are asserted next door, in
 * `calculators/data/fnrb/countries.test.ts`.
 */
describe("UN M49 region map (Amy's ruling (3)(a), 2026-09-21)", () => {
  it("covers every country the calculator's selector offers (coverage rule)", () => {
    const missing = COUNTRIES.filter((c) => !countries[c.iso]).map((c) => `${c.iso} (${c.name})`);
    expect(missing, `selectable countries with no M49 row: ${missing.join(", ")}`).toEqual([]);
  });

  it("carries every row the source publishes, wider than the selector", () => {
    expect(Object.keys(countries).length).toBe(248);
    expect(Object.keys(countries).length).toBeGreaterThan(COUNTRIES.length);
  });

  it("cites the UN M49 geoscheme by a real registry id", () => {
    expect(m49.registrySources).toContain("unsd-m49");
    for (const id of m49.registrySources) {
      expect(indexYaml, `registry id "${id}" not found`).toContain(`- id: "${id}"`);
    }
  });

  // ── The three tool regions, each named by its M49 code (AMT-009 Table 2) ──

  it("Sub-Saharan Africa is M49 sub-region 202 — and excludes Northern Africa", () => {
    expect(m49.toolRegions["sub-saharan-africa"].m49).toBe("202");
    expect(m49.toolRegions["sub-saharan-africa"].level).toBe("sub-region");
    // Every row in 202, and only those rows, carry the tool region.
    for (const [iso, row] of Object.entries(countries)) {
      const inSsa = row.subRegion?.code === "202";
      expect(row.toolRegion === "sub-saharan-africa", iso).toBe(inSsa);
    }
    expect(countries.LSO.toolRegion).toBe("sub-saharan-africa"); // Southern Africa
    expect(countries.TZA.toolRegion).toBe("sub-saharan-africa"); // Eastern Africa
    expect(countries.EGY.subRegion?.code).toBe("015"); // Northern Africa
    expect(countries.EGY.toolRegion).toBeNull();
    expect(countries.MAR.toolRegion).toBeNull();
  });

  it("Latin America is M49 sub-region 419 — and excludes Northern America", () => {
    expect(m49.toolRegions["latin-america"].m49).toBe("419");
    expect(m49.toolRegions["latin-america"].level).toBe("sub-region");
    for (const [iso, row] of Object.entries(countries)) {
      const in419 = row.subRegion?.code === "419";
      expect(row.toolRegion === "latin-america", iso).toBe(in419);
    }
    expect(countries.BRA.toolRegion).toBe("latin-america");
    expect(countries.HTI.toolRegion).toBe("latin-america"); // Caribbean rides with 419
    expect(countries.USA.toolRegion).toBeNull(); // Northern America (021)
    expect(countries.CAN.toolRegion).toBeNull();
  });

  it("Asia is M49 region 142 — all five sub-regions", () => {
    expect(m49.toolRegions.asia.m49).toBe("142");
    expect(m49.toolRegions.asia.level).toBe("region");
    for (const [iso, row] of Object.entries(countries)) {
      // 142 is a REGION, so a row is Asian unless a nearer tool region already claimed it
      // (no M49 row is both 142 and 202/419, so the two readings agree).
      const inAsia = row.region?.code === "142";
      expect(row.toolRegion === "asia", iso).toBe(inAsia);
    }
    expect(countries.IND.toolRegion).toBe("asia"); // Southern Asia
    expect(countries.KAZ.toolRegion).toBe("asia"); // Central Asia
    expect(countries.TUR.toolRegion).toBe("asia"); // Western Asia
    expect(countries.NPL.toolRegion).toBe("asia");
  });

  it("a row outside the three regions carries toolRegion: null, never a nearest guess", () => {
    const outside = Object.entries(countries).filter(([, r]) => r.toolRegion === null);
    expect(outside.length).toBe(93);
    for (const [iso, r] of outside) {
      expect(r.subRegion?.code, iso).not.toBe("202");
      expect(r.subRegion?.code, iso).not.toBe("419");
      expect(r.region?.code, iso).not.toBe("142");
    }
  });

  it("no row invents a code — every country keeps its M49 code and names", () => {
    for (const [iso, r] of Object.entries(countries)) {
      expect(iso, `${iso} is not an ISO 3166-1 alpha-3 code`).toMatch(/^[A-Z]{3}$/);
      expect(r.m49, `${iso} has no M49 code`).toMatch(/^\d{3}$/);
      expect(r.name.length, `${iso} has no name`).toBeGreaterThan(0);
    }
  });
});

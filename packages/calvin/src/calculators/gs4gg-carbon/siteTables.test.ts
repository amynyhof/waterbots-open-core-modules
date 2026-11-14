// A site's own country tables (V13). Every table here is INVENTED for the test: its values are made up, and no row is
// a real site's figure. Country codes are real only because the engine looks rows up by them.
import { describe, expect, it } from "vitest";
import expected from "../../expected-outputs.json" with { type: "json" };
import {
  computeScenario,
  computeTransitionWaterfall,
  fnrbAvailability,
  FnrbUnavailableError,
  householdSizeKnown,
  ProjectFactMissingError,
  resolveHouseholdSize,
  type ScenarioInput,
} from "./scenario";
import { countryBaselineDefault, defaultCharcoalConvention } from "./presets";
import { resolveAgeShares } from "./table9";
import { checkSiteTables, SiteTableError, type SiteTables } from "./siteTables";
import { countryList, countryName, COUNTRIES } from "../data/countries";

const INVENTED = "Invented table for the site-table tests";

/** A plain run: a community water system in Kenya, counted as people. Invented project. */
const base: ScenarioInput = {
  version: "paa",
  method: 1,
  mode: "ex-ante",
  populationMode: "people",
  populationCount: 1200,
  countryIso: "KEN",
  litresPerPersonPerDay: 4,
  operationalDays: 365,
  preset: "traditional-wood-cws",
};

/** Invented DAF rows: Kenya, which the package also has, and Lesotho, which it does not. */
const dafTable = (): SiteTables => ({
  daf: {
    source: INVENTED,
    countries: {
      KEN: { name: "Kenya", daf_2026_2030: 0.0432, basis: "invented basis" },
      LSO: { name: "Lesotho", daf_2026_2030: 0.0321, basis: "invented basis" },
    },
  },
});

const without = <T extends { siteTableValues?: unknown }>(r: T) => {
  const { siteTableValues: _, ...rest } = r;
  return rest;
};

describe("no site tables: the same answers as today", () => {
  const runs: ScenarioInput[] = [
    base,
    { ...base, version: "legacy", fnrbFiledV1: 0.3 },
    { ...base, countryIso: "LSO" },
    { ...base, method: 2, populationMode: "households", populationCount: 300 },
    ...expected.fnrbCases.map((c) => c.scenarioInput as ScenarioInput),
  ];

  it("an empty set of tables changes nothing but adds an empty list", () => {
    for (const input of runs) {
      let plain: unknown;
      try {
        plain = computeScenario(input);
      } catch (e) {
        expect(() => computeScenario(input, {})).toThrow((e as Error).message);
        continue;
      }
      const withEmpty = computeScenario(input, {});
      expect(withEmpty.siteTableValues).toEqual([]);
      expect(without(withEmpty)).toEqual(plain);
    }
  });

  it("with no tables the result carries no list at all", () => {
    expect("siteTableValues" in computeScenario(base)).toBe(false);
  });
});

describe("the engine uses a site's row", () => {
  it("takes the site's DAF for a country the package has, and for one it lacks", () => {
    const tables = dafTable();
    const ken = computeScenario(base, tables);
    expect(ken.DAF).toBe(0.0432);
    const kenProv = ken.provenance.find((p) => p.field === "DAF")!;
    expect(kenProv.source).toBe("site-table");
    expect(kenProv.label).toContain(`from the site's table: ${INVENTED}`);
    expect(ken.siteTableValues).toEqual([{ field: "DAF", countryIso: "KEN", value: 0.0432, source: INVENTED }]);

    const lso = computeScenario({ ...base, countryIso: "LSO" }, tables);
    expect(lso.DAF).toBe(0.0321);
    expect(lso.siteTableValues).toEqual([{ field: "DAF", countryIso: "LSO", value: 0.0321, source: INVENTED }]);
    // The answer moves with the DAF, and the engine did the sum.
    expect(lso.result.ER).not.toBe(computeScenario({ ...base, countryIso: "LSO" }).result.ER);
  });

  it("falls back to the package's row where the site's table has none", () => {
    const tables = dafTable();
    const uga = computeScenario({ ...base, countryIso: "UGA" }, tables);
    const plain = computeScenario({ ...base, countryIso: "UGA" });
    expect(uga.DAF).toBe(plain.DAF);
    expect(uga.provenance.find((p) => p.field === "DAF")!.source).toBe("country");
    expect(uga.siteTableValues).toEqual([]);
  });

  it("keeps the package's cited floor for a country neither table has", () => {
    const r = computeScenario({ ...base, countryIso: "ZMB" }, dafTable());
    expect(r.DAF).toBe(0.0125);
    expect(r.provenance.find((p) => p.field === "DAF")!.source).toBe("global-default");
  });

  it("lists no DAF on a V1.0 run, which has no DAF", () => {
    const r = computeScenario({ ...base, version: "legacy", fnrbFiledV1: 0.3 }, dafTable());
    expect(r.siteTableValues).toEqual([]);
  });

  it("an entered DAF still wins over the site's row", () => {
    expect(computeScenario({ ...base, DAF: 0.05 }, dafTable()).DAF).toBe(0.05);
  });

  it("the transition uses the site's tables on every step", () => {
    const tables = dafTable();
    const w = computeTransitionWaterfall({ ...base, fnrbFiledV1: 0.3 }, tables);
    expect(w.paaER).toBe(computeScenario(base, tables).result.ER);
    expect(w.steps.find((s) => s.key === "daf")!.driver).toContain("DAF = 0.0432");
  });
});

describe("fNRB: row by row within the matching set", () => {
  const fnrbTable = (): SiteTables => ({
    fnrb: {
      "mofuss-adm0-csv": { source: INVENTED, countries: { ALB: { name: "Albania", fnrb: 0.123 } } },
      "mofuss-2024-06-report": { source: INVENTED, countries: { KEN: { name: "Kenya", fnrb: 0.456 } } },
    },
  });

  it("gives a value for a country the package's set lacks", () => {
    const tables = fnrbTable();
    expect(fnrbAvailability("ALB", undefined, undefined).ok).toBe(false);
    expect(fnrbAvailability("ALB", undefined, undefined, tables).ok).toBe(true);
    const r = computeScenario({ ...base, countryIso: "ALB" }, tables);
    expect(r.fNRB).toBe(0.123);
    expect(r.provenance.find((p) => p.field === "fNRB")!.label).toContain(`from the site's table: ${INVENTED}`);
    expect(r.siteTableValues).toContainEqual({ field: "fNRB", countryIso: "ALB", value: 0.123, source: INVENTED });
  });

  it("reads a site's rows only on a run that uses the same set", () => {
    const tables = fnrbTable();
    expect(computeScenario(base, tables).fNRB).toBe(computeScenario(base).fNRB);
    expect(computeScenario({ ...base, fnrbVintage: "mofuss-2024-06-report" }, tables).fNRB).toBe(0.456);
  });

  it("refuses only when neither table has the country, and says the site's table has no row", () => {
    const tables = fnrbTable();
    const plain = fnrbAvailability("AND", undefined, undefined);
    expect(plain.ok).toBe(false);
    if (!plain.ok) expect(plain.refusal.message).toMatch(/three regions only\.$/);
    const withSite = fnrbAvailability("AND", undefined, undefined, tables);
    expect(withSite.ok).toBe(false);
    if (!withSite.ok) expect(withSite.refusal.message).toContain(`The site's own fNRB table (${INVENTED}) has no row for Andorra either.`);
    expect(() => computeScenario({ ...base, countryIso: "AND" }, tables)).toThrow(FnrbUnavailableError);
  });
});

describe("household size, age shares, regions and the baseline mix", () => {
  it("takes the site's household size, and knows one for a country the package lacks", () => {
    const tables: SiteTables = {
      householdSize: { source: INVENTED, countries: { AND: { name: "Andorra", peoplePerHousehold: 2.5 } } },
    };
    const input: ScenarioInput = { ...base, countryIso: "AND", populationMode: "households", populationCount: 400, fnrbOverride: 0.3 };
    expect(householdSizeKnown("AND")).toBe(false);
    expect(() => computeScenario(input)).toThrow(ProjectFactMissingError);
    expect(householdSizeKnown("AND", undefined, tables)).toBe(true);
    const r = computeScenario(input, tables);
    expect(r.people).toBe(1000);
    expect(resolveHouseholdSize("AND", undefined, tables)!.prov.label).toContain(INVENTED);
    expect(r.siteTableValues).toContainEqual({ field: "householdSize", countryIso: "AND", value: 2.5, source: INVENTED });
  });

  it("takes the site's age shares for the Table 9 volume", () => {
    const tables: SiteTables = {
      ageShares: { source: INVENTED, countries: { KEN: { name: "Kenya", under5: 0.2, age5_18: 0.3, adult19plus: 0.5 } } },
    };
    const shares = resolveAgeShares("KEN", undefined, tables);
    expect(shares.source).toBe("site-table");
    const r = computeScenario(base, tables);
    expect(r.table9?.ageShares.source).toBe("site-table");
    expect(r.qpwEffective).not.toBe(computeScenario(base).qpwEffective);
    expect(r.siteTableValues).toContainEqual({ field: "ageShares", countryIso: "KEN", value: { under5: 0.2, age5_18: 0.3, adult19plus: 0.5 }, source: INVENTED });
  });

  it("takes the site's region for the fNRB regional value and the charcoal default", () => {
    const tables: SiteTables = {
      regions: { source: INVENTED, countries: { ALB: { name: "Albania", toolRegion: "sub-saharan-africa" } } },
    };
    expect(defaultCharcoalConvention("ALB")).toBeUndefined();
    expect(defaultCharcoalConvention("ALB", tables)).toBe("6:1");
    const r = computeScenario({ ...base, countryIso: "ALB" }, tables);
    expect(r.fnrbMultiNational?.region).toBeDefined();
    expect(r.siteTableValues).toContainEqual({ field: "toolRegion", countryIso: "ALB", value: "sub-saharan-africa", source: INVENTED });
  });

  it("takes the site's baseline mix, mapped by the same rulings as the package's", () => {
    const tables: SiteTables = {
      baselineMix: {
        source: INVENTED,
        countries: {
          KEN: {
            name: "Kenya",
            fuel: { dataYear: 2025, published: "2026-01-01", percent: { biomass: 70, charcoal: 20, gas: 10 } },
            stove: { surveyId: "INVENTED-1", surveyType: "invented", surveyYear: 2025, fieldwork: null, published: null, percent: { "3SO": 60, TSW: 20, MSW: 20 } },
          },
        },
      },
    };
    expect(countryBaselineDefault("KEN")).toEqual({});
    const mix = countryBaselineDefault("KEN", 2026, tables);
    expect(mix.fuel?.shares.wood).toBeCloseTo(0.7);
    expect(mix.fuel?.label).toContain(INVENTED);
    expect(mix.stove?.siteSource).toBe(INVENTED);
    const r = computeScenario(base, tables);
    expect(r.baselineMix.fuel).toBe("country-default");
    expect(r.baselineMix.stove).toBe("country-default");
    const fields = r.siteTableValues!.map((v) => v.field);
    expect(fields).toContain("baselineMix.fuel");
    expect(fields).toContain("baselineMix.stove");
  });

  it("builds the country list from both tables", () => {
    const tables: SiteTables = {
      householdSize: { source: INVENTED, countries: { AND: { name: "Andorra", peoplePerHousehold: 2.5 } } },
    };
    expect(countryList()).toBe(COUNTRIES);
    expect(countryList(tables)).toHaveLength(COUNTRIES.length + 1);
    expect(countryName("and", tables)).toBe("Andorra");
    expect(countryName("AND")).toBeUndefined();
  });
});

describe("a bad table is refused, and none of it is used", () => {
  const refused = (tables: unknown, words: RegExp) => {
    let err: unknown;
    try {
      computeScenario(base, tables as SiteTables);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(SiteTableError);
    expect((err as Error).message).toMatch(words);
    expect((err as Error).message).toMatch(/Nothing from the site's tables was used\.$/);
  };

  it("a DAF above 1", () =>
    refused({ daf: { source: INVENTED, countries: { KEN: { name: "Kenya", daf_2026_2030: 1.5, basis: "x" } } } }, /daf table cannot be used \(row KEN\): the 2026-2030 DAF must be a number from 0 to 1/));
  it("a country code that is not three capitals", () =>
    refused({ daf: { source: INVENTED, countries: { ke: { name: "Kenya", daf_2026_2030: 0.02, basis: "x" } } } }, /"ke" is not a three-letter country code/));
  it("an empty source", () =>
    refused({ daf: { source: " ", countries: {} } }, /does not say where it comes from/));
  it("a table the engine does not take from a site", () =>
    refused({ charcoalFactors: { source: INVENTED, countries: {} } }, /charcoalFactors table cannot be used: the engine does not take this table from a site/));
  it("a DAF floor inside the DAF table", () =>
    refused({ daf: { source: INVENTED, countries: {}, absolute_floor: 0.01 } }, /holds "absolute_floor", which the engine does not read from a site/));
  it("an fNRB set the package does not have", () =>
    refused({ fnrb: { "invented-set": { source: INVENTED, countries: {} } } }, /there is no set of fNRB values by that name/));
  it("age shares that do not add up to 1", () =>
    refused({ ageShares: { source: INVENTED, countries: { KEN: { name: "Kenya", under5: 0.2, age5_18: 0.2, adult19plus: 0.2 } } } }, /add up to 1/));
  it("a region the fNRB tool does not have", () =>
    refused({ regions: { source: INVENTED, countries: { KEN: { name: "Kenya", toolRegion: "invented-region" } } } }, /tool region must be one of/));
  it("a household size of zero", () =>
    refused({ householdSize: { source: INVENTED, countries: { KEN: { name: "Kenya", peoplePerHousehold: 0 } } } }, /above 0/));
  it("a baseline mix with an unknown fuel", () =>
    refused({ baselineMix: { source: INVENTED, countries: { KEN: { name: "Kenya", fuel: { dataYear: 2025, published: "2026", percent: { peat: 10 } } } } } }, /names a fuel the engine does not read/));

  it("a good table is checked once and handed back unchanged", () => {
    const tables = dafTable();
    expect(checkSiteTables(tables)).toBe(tables);
    expect(checkSiteTables(tables)).toBe(tables);
    expect(checkSiteTables(undefined)).toBeUndefined();
  });
});

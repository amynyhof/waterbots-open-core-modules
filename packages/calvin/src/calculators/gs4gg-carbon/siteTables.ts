/**
 * siteTables.ts — a site's own country tables, passed in while it runs (plan item V13).
 *
 * A site may hand the engine its own country tables: the DAF, the fNRB, household size, age shares,
 * UN regions and the baseline fuel and stove mix. The engine reads them ROW BY ROW: the site's row
 * for a country when its table has one, else the package's row, else the same fallback as today. With
 * no tables passed, every answer is exactly what it was. Nothing a site passes is stored in the package.
 *
 * What a site may NOT pass (rulings 2026-11-14): the DAF floors, which are rules of the DAF tool, not
 * country rows; and the method's own values (the V2.0 charcoal factors and the embodied-emission
 * factors). A table with a part the engine does not read is refused, so a site never believes a value
 * is used when it is not.
 *
 * A passed table is checked before any of it is used. One bad row refuses the run, with a plain
 * message naming the table, the row and the problem. A table is never half used: the paid site must
 * find out at once, not lose data without seeing it.
 *
 * Every value that came from a site's table is labelled with the site's source, and `computeScenario`
 * lists them all in `siteTableValues`.
 */
import fnrbJson from "../data/fnrb/countries.json" with { type: "json" };
import m49Json from "../data/regions/un-m49.json" with { type: "json" };

/** One of a site's tables: where it comes from, and its rows by three-letter country code (ISO 3166-1 alpha-3). */
export interface SiteTable<Row> {
  /** Where the table comes from, in the words the screens and the report print beside each value. */
  source: string;
  /** Rows by three-letter country code, in capitals. */
  countries: Record<string, Row>;
}

/** A DAF row, the same shape as a row of the package's `daf/countries.json`. */
export interface SiteDafRow {
  name: string;
  daf_2026_2030: number;
  basis: string;
}

/** An fNRB row, the same shape as a row of one set of values in the package's `fnrb/countries.json`. */
export interface SiteFnrbRow {
  name?: string;
  fnrb: number;
}

/** A household-size row, the same shape as a row of the package's `household-size/countries.json`. */
export interface SiteHouseholdSizeRow {
  name: string;
  peoplePerHousehold: number;
  source?: string;
  reference_year?: number;
}

/** An age-shares row, the same shape as a row of the package's `age-shares/countries.json`. */
export interface SiteAgeSharesRow {
  name: string;
  under5: number;
  age5_18: number;
  adult19plus: number;
}

/** A UN region row: the country's name and the fNRB tool region it sits in (null for none of the three). */
export interface SiteRegionRow {
  name: string;
  toolRegion: string | null;
}

/** The fuel half of a baseline-mix row: the WHO household energy series' shape (percent of people by main fuel). */
export interface BaselineMixFuel {
  dataYear: number;
  published: string;
  percent: Partial<Record<"biomass" | "charcoal" | "gas" | "kerosene" | "coal" | "electricity", number>>;
}

/** The stove half of a baseline-mix row: a DHS survey's shape (percent of households by cooking technology code). */
export interface BaselineMixStove {
  surveyId: string;
  surveyType: string | null;
  surveyYear: number;
  fieldwork: string | null;
  published: string | null;
  percent: Record<string, number>;
}

/** A baseline-mix row, the same shape as a row of the package's `baseline-mix/countries.json`. */
export interface BaselineMixRow {
  name: string;
  fuel?: BaselineMixFuel;
  stove?: BaselineMixStove;
}

/**
 * A site's own tables. Every part is optional. The fNRB part is keyed by the package's set of values
 * ("vintage") that it fills in: a site's rows are read only on a run that uses that same set
 * (ruling 6, 2026-11-14).
 */
export interface SiteTables {
  daf?: SiteTable<SiteDafRow>;
  fnrb?: Record<string, SiteTable<SiteFnrbRow>>;
  householdSize?: SiteTable<SiteHouseholdSizeRow>;
  ageShares?: SiteTable<SiteAgeSharesRow>;
  regions?: SiteTable<SiteRegionRow>;
  baselineMix?: SiteTable<BaselineMixRow>;
}

/** One value a run took from a site's table: which field, which country, the value, and the site's source. */
export interface SiteTableValue {
  field: "DAF" | "fNRB" | "householdSize" | "ageShares" | "toolRegion" | "baselineMix.fuel" | "baselineMix.stove";
  countryIso: string;
  value: number | string | null | Record<string, number>;
  source: string;
}

/** A site's table that cannot be used. The run refuses, and nothing from the tables is used. */
export class SiteTableError extends Error {
  /** Which part of the tables: for example "daf", or "fnrb.mofuss-adm0-csv". */
  readonly table: string;
  /** The country code of the row at fault, when the problem is in a row. */
  readonly country?: string;
  readonly problem: string;
  constructor(table: string, problem: string, country?: string) {
    super(`The site's ${table} table cannot be used${country ? ` (row ${country})` : ""}: ${problem}. Nothing from the site's tables was used.`);
    this.name = "SiteTableError";
    this.table = table;
    this.country = country;
    this.problem = problem;
  }
}

/** The words every label adds after a value from a site's table. */
export function fromSiteTable(source: string): string {
  return `from the site's table: ${source}`;
}

const PARTS = ["daf", "fnrb", "householdSize", "ageShares", "regions", "baselineMix"] as const;
const FNRB_SETS = new Set(Object.keys((fnrbJson as unknown as { vintages: Record<string, unknown> }).vintages));
const TOOL_REGIONS = new Set(
  Object.values((m49Json as unknown as { countries: Record<string, { toolRegion: string | null }> }).countries)
    .map((c) => c.toolRegion)
    .filter((r): r is string => r !== null),
);
const COUNTRY_CODE = /^[A-Z]{3}$/;
const FUEL_KEYS = new Set(["biomass", "charcoal", "gas", "kerosene", "coal", "electricity"]);

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isText = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;
const isNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isShare = (x: unknown): x is number => isNumber(x) && x >= 0 && x <= 1;
const isYear = (x: unknown): x is number => isNumber(x) && Number.isInteger(x) && x >= 1900 && x <= 2200;
const isPercent = (x: unknown): x is number => isNumber(x) && x >= 0 && x <= 100;

/** Checks one table's frame (source, countries, nothing else), then each row with `row`. */
function checkTable(name: string, t: unknown, row: (r: Record<string, unknown>) => string | null): void {
  if (!isObject(t)) throw new SiteTableError(name, "it is not a table with a source and rows");
  for (const k of Object.keys(t)) {
    if (k !== "source" && k !== "countries") throw new SiteTableError(name, `it holds "${k}", which the engine does not read from a site`);
  }
  if (!isText(t.source)) throw new SiteTableError(name, "it does not say where it comes from (its source is empty)");
  if (!isObject(t.countries)) throw new SiteTableError(name, "it has no rows by country");
  for (const [iso, r] of Object.entries(t.countries)) {
    if (!COUNTRY_CODE.test(iso)) throw new SiteTableError(name, `"${iso}" is not a three-letter country code in capitals`);
    if (!isObject(r)) throw new SiteTableError(name, "the row is not a set of values", iso);
    const problem = row(r);
    if (problem) throw new SiteTableError(name, problem, iso);
  }
}

const nameProblem = (r: Record<string, unknown>) => (isText(r.name) ? null : "it has no country name");

function checkDaf(r: Record<string, unknown>): string | null {
  return nameProblem(r)
    ?? (isShare(r.daf_2026_2030) ? null : "the 2026-2030 DAF must be a number from 0 to 1")
    ?? (isText(r.basis) ? null : "it does not give the DAF's basis");
}

function checkFnrb(r: Record<string, unknown>): string | null {
  if (r.name !== undefined && !isText(r.name)) return "its country name is empty";
  return isShare(r.fnrb) ? null : "the fNRB must be a number from 0 to 1";
}

function checkHouseholdSize(r: Record<string, unknown>): string | null {
  return nameProblem(r)
    ?? (isNumber(r.peoplePerHousehold) && r.peoplePerHousehold > 0 ? null : "the household size must be a number above 0")
    ?? (r.reference_year === undefined || isYear(r.reference_year) ? null : "its reference year is not a year");
}

function checkAgeShares(r: Record<string, unknown>): string | null {
  const p = nameProblem(r);
  if (p) return p;
  if (![r.under5, r.age5_18, r.adult19plus].every(isShare)) return "each age share must be a number from 0 to 1";
  const sum = (r.under5 as number) + (r.age5_18 as number) + (r.adult19plus as number);
  // The same tolerance the Table 9 volume demands (`table9Volume`).
  return sum > 0.999 && sum < 1.001 ? null : "the three age shares must add up to 1";
}

function checkRegion(r: Record<string, unknown>): string | null {
  const p = nameProblem(r);
  if (p) return p;
  if (r.toolRegion === null) return null;
  return typeof r.toolRegion === "string" && TOOL_REGIONS.has(r.toolRegion)
    ? null
    : `the tool region must be one of ${[...TOOL_REGIONS].join(", ")}, or null`;
}

function checkBaselineMix(r: Record<string, unknown>): string | null {
  const p = nameProblem(r);
  if (p) return p;
  if (r.fuel === undefined && r.stove === undefined) return "it has neither a fuel half nor a stove half";
  if (r.fuel !== undefined) {
    const f = r.fuel;
    if (!isObject(f) || !isYear(f.dataYear) || !isText(f.published) || !isObject(f.percent)) {
      return "the fuel half needs a data year, a publication date and the percent by fuel";
    }
    for (const [k, v] of Object.entries(f.percent)) {
      if (!FUEL_KEYS.has(k)) return `the fuel half names a fuel the engine does not read: "${k}"`;
      if (!isPercent(v)) return "each fuel percent must be a number from 0 to 100";
    }
  }
  if (r.stove !== undefined) {
    const s = r.stove;
    if (!isObject(s) || !isText(s.surveyId) || !isYear(s.surveyYear) || !isObject(s.percent)) {
      return "the stove half needs a survey name, a survey year and the percent by stove";
    }
    if (s.surveyType !== undefined && s.surveyType !== null && typeof s.surveyType !== "string") return "the stove half's survey type is not text";
    for (const v of Object.values(s.percent)) if (!isPercent(v)) return "each stove percent must be a number from 0 to 100";
  }
  return null;
}

const checked = new WeakSet<object>();

/**
 * Checks a site's tables, and refuses them (`SiteTableError`) if any part cannot be used. Returns the
 * tables unchanged. Each tables object is checked once; read the tables as given, and pass a new object
 * to change them.
 */
export function checkSiteTables(tables: SiteTables | undefined): SiteTables | undefined {
  if (tables === undefined) return undefined;
  if (checked.has(tables)) return tables;
  if (!isObject(tables)) throw new SiteTableError("site", "the tables are not a set of tables");
  for (const k of Object.keys(tables)) {
    if (!(PARTS as readonly string[]).includes(k)) {
      throw new SiteTableError(k, `the engine does not take this table from a site; it takes ${PARTS.join(", ")}`);
    }
  }
  const t = tables as Record<string, unknown>;
  if (t.daf !== undefined) checkTable("daf", t.daf, checkDaf);
  if (t.fnrb !== undefined) {
    if (!isObject(t.fnrb)) throw new SiteTableError("fnrb", "it must be keyed by the package's set of fNRB values");
    for (const [set, table] of Object.entries(t.fnrb)) {
      if (!FNRB_SETS.has(set)) {
        throw new SiteTableError(`fnrb.${set}`, `there is no set of fNRB values by that name; the package's sets are ${[...FNRB_SETS].join(", ")}`);
      }
      checkTable(`fnrb.${set}`, table, checkFnrb);
    }
  }
  if (t.householdSize !== undefined) checkTable("householdSize", t.householdSize, checkHouseholdSize);
  if (t.ageShares !== undefined) checkTable("ageShares", t.ageShares, checkAgeShares);
  if (t.regions !== undefined) checkTable("regions", t.regions, checkRegion);
  if (t.baselineMix !== undefined) checkTable("baselineMix", t.baselineMix, checkBaselineMix);
  checked.add(tables);
  return tables;
}

/** The site's row for a country, or undefined. Country codes are read in capitals. */
export function siteRow<Row>(table: SiteTable<Row> | undefined, iso: string): Row | undefined {
  if (!table) return undefined;
  const key = iso.toUpperCase();
  return Object.prototype.hasOwnProperty.call(table.countries, key) ? table.countries[key] : undefined;
}

import household from "./household-size/countries.json" with { type: "json" };
import { checkSiteTables, type SiteTables } from "../gs4gg-carbon/siteTables.js";

/** A selectable country (ISO 3166-1 alpha-3 + display name). */
export interface CountryOption {
  iso: string;
  name: string;
}

/**
 * The calculator's country selector lists EVERY country the lookup data provides
 * (coverage rule) — derived from the UN household-size dataset (186 countries).
 * Picking a country with no fNRB value fires the labeled fallback dial by design.
 */
export const COUNTRIES: CountryOption[] = Object.entries(
  household.countries as Record<string, { name: string }>,
)
  .map(([iso, c]) => ({ iso, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * The country list with a site's own household-size table on top (V13): every country in either
 * table, so a site's extra countries can be picked. A site's name for a country wins. Without
 * tables it is `COUNTRIES`.
 */
export function countryList(tables?: SiteTables): CountryOption[] {
  const site = checkSiteTables(tables)?.householdSize;
  if (!site) return COUNTRIES;
  const byIso = new Map(COUNTRIES.map((c) => [c.iso, c.name]));
  for (const [iso, row] of Object.entries(site.countries)) byIso.set(iso, row.name);
  return [...byIso].map(([iso, name]) => ({ iso, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** A country's name from the list above, or undefined when neither table has it. */
export function countryName(iso: string, tables?: SiteTables): string | undefined {
  const key = iso.toUpperCase();
  return countryList(tables).find((c) => c.iso === key)?.name;
}

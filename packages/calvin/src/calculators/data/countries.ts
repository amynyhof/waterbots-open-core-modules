import household from "./household-size/countries.json";

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

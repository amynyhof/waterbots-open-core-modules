# Proposal: a site's own data tables in Calvin

Status: archived 2026-11-14. Kept as it stood before the build, apart from two examples reworded to hold no count from a site. The rulings that followed are in `BUILD_LOG.md`. The build is pull request #20.
Written 2026-11-14.

**The goal.** A site can hand Calvin its own country tables: the DAF, fNRB, household size and any other.
Calvin uses the site's table where it has a value, and its own table where it does not. With no table passed,
Calvin works exactly as it does today. The paid site never loses its data by installing the package.

DAF is the downward adjustment factor. fNRB is the fraction of non-renewable biomass.

**This is plan item V13**, "Data on top", with one more piece: the screen entry, not only the engine.
V13 sits after V6 today. The brief puts it in the next Calvin release. See decision 1.

**No site data enters this repo.** A site passes its tables in while it runs. The package never stores them.

---

## 1. Every table the engine reads

Nine data files sit in `packages/calvin/src/calculators/data/`. Six are country tables. Three are rulebook
values that are the same for every country.

### Country tables: a site may pass its own

| Table | File | Rows in the package | Read by | What one row holds |
|---|---|---|---|---|
| **DAF** | `daf/countries.json` | 6 | engine: `resolveDaf` in `scenario.ts` | name, the 2026-2030 value, its basis |
| **fNRB** | `fnrb/countries.json` | 2 sets of values ("vintages"): 6 rows and 90 rows | engine: `resolveFnrb`, `fnrbAvailability`, `transitionAvailability`. Screen: `useCalculatorState.ts` | name, value |
| **Household size** | `household-size/countries.json` | 186 | engine: `resolveHouseholdSize`, `householdSizeKnown`, `derivePopulation`. Screen: `state.ts`. Also builds the country list, `COUNTRIES`, used by `ReportView.tsx` | name, people per household, source, year |
| **Age shares** | `age-shares/countries.json` | 237 | engine: `resolveAgeShares` in `table9.ts`. Screen: `state.ts` | name, three age shares |
| **UN regions** | `regions/un-m49.json` | 248 | engine: the fNRB region fallback in `scenario.ts`, and `defaultCharcoalConvention` in `presets.ts`. Screen: `state.ts`, `EquationStack.tsx` | name, region codes, the tool region |
| **Baseline fuel and stove mix** | `baseline-mix/countries.json` | 0 today (plan item M10.1) | engine: `countryBaselineDefault` in `presets.ts` | fuel shares, stove shares |

### Rulebook values: the same everywhere, not passed by a site

| Table | File | Why it stays the package's |
|---|---|---|
| Charcoal factors (V2.0) | `paa/fuel-factors.json` | The methodology's own figures (V2.0 SDWS 9 and 10). A site value would change the method, not the data. |
| Embodied emission categories | `embodied/factors.json` | The same: method values, with their own cites. |
| Legacy defaults | `legacy/defaults.json` | No code reads it. It is a record. |

Two values inside the DAF file are rules, not rows: the absolute floor and the sector floor. They stay the
package's, so the fallback stays cited. See decision 3.

---

## 2. How a site passes them

### The shape: one object, every part optional

```ts
interface SiteTables {
  daf?:           SiteTable<{ name: string; daf_2026_2030: number; basis: string }>;
  fnrb?:          SiteTable<{ name: string; fnrb: number }> & { vintageLabel: string };
  householdSize?: SiteTable<{ name: string; peoplePerHousehold: number; source: string; reference_year: number }>;
  ageShares?:     SiteTable<{ name: string; under5: number; age5_18: number; adult19plus: number }>;
  regions?:       SiteTable<{ name: string; toolRegion: string | null }>;
  baselineMix?:   SiteTable<{ fuel: FuelShares; stove: StoveShares }>;
}

interface SiteTable<Row> {
  /** Where the table comes from, in words the report prints. */
  source: string;
  /** Rows by three-letter country code (ISO 3166-1 alpha-3). */
  countries: Record<string, Row>;
}
```

Each row keeps the shape of the package's own row, so a site can build its table the same way.

### The engine entry: one more argument

Every engine call that reads a country table takes `tables` as an optional last argument:

```ts
computeScenario(input, tables?)
computeTransitionWaterfall(input, tables?)
fnrbAvailability(iso, vintage, override, tables?)
resolveHouseholdSize(iso, override, tables?)
resolveAgeShares(iso, entered, tables?)
defaultCharcoalConvention(iso, tables?)
countryBaselineDefault(..., tables?)
countryList(tables?)        // new: the country list, built from both tables
```

No `tables`, and every call works exactly as today.

I suggest an argument, not a setting saved inside the package. An argument cannot leak from one site or one
test to another, and the engine stays pure: the same input always gives the same answer.

### The screen entry: one more option

```ts
useCalculatorState(project, { ...options, tables })
```

`CalculatorOptions` gains `tables?: SiteTables`. The hook passes it to every engine call. The panels read the
country list and the charcoal default through the hook, never from the data files.

### How the two tables combine

Row by row:

1. **The site's row**, if its table has the country.
2. **Else the package's row**, if the package has the country.
3. **Else today's fallback**: the cited floor (DAF), the refusal that asks for the project's own value (fNRB),
   the global default (age shares), or "awaiting user project input" (household size).

So a site whose table has more countries than the package's uses every one of them. A site that passes 3 rows still gets the package's other rows.
See decision 2.

### Where each value came from

Each value from a site's table says so, as the CLAUDE.md rule on value sources asks. The label names the site's
source: for example, "DAF 2026-2030, from the site's table: <its source>". The engine adds one more source kind,
`site-table`, beside today's `country`, `override` and `global-default`.

The result also lists every value that came from a site's table: field, country, value and source (V13's own
"done when").

### Checking a site's table

The engine checks a passed table before using it:

- Every key is a three-letter country code.
- Every number is in its range: DAF and fNRB from 0 to 1; household size above 0; the three age shares add to 1.
- `source` is not empty.

A table that fails is refused with a plain message naming the table, the row and the problem. It is never half
used. A refusal is loud on purpose: the paid site must find out at once, not lose data without seeing it.

---

## 3. The tests

1. **No tables passed, same answers.** The 48 reference cases give exactly today's results, in place and from
   the packed files.
2. **The engine uses a site's row.** An invented DAF table gives an invented value for a country the package
   has, and one for a country it lacks. The answer uses both. Each label says "site's table". The result lists
   both values.
3. **The package fills gaps.** A site table without a country falls back to the package's row for it.
4. **A bad table is refused.** A DAF of 1.5, a bad country code, an empty source: each is refused, with words.
5. **The mount test (what the brief asks for).** `scripts/check-screen-entry.mjs` mounts the screen from the
   packed files and passes an invented DAF table. It checks that the screen prints the site's value and its source
   label, not the package's. A second mount with no table still prints the package's value.
6. **The same for fNRB and household size** in the engine tests, one case each.

Every table in the tests is invented and labelled so. No real site figure is used.

---

## 4. What else changes

- **One sentence counts the package's rows.** The fNRB refusal says the tools publish values for 90 countries.
  That stays true of the tools. But a site's table may cover a country the package lacks, so the refusal only
  fires when neither table has the country.
- **The country list.** Today it is the 186 household-size countries. With site tables it becomes every country
  in either household table, so a site's extra countries can be picked.
- **The release.** A release candidate first, as the plan says for every engine change. The private side installs
  it and reports pass or fail on both carbon filings, with the paid site's tables passed in.
- **Lane 3**, since it touches the engine, the screen, the checks and the tests.

---

## Decisions I need from you

1. **When.** This is V13, which sits after V6 (the method registry) today. Should it move ahead of V6, into the
   next Calvin release?
2. **Row by row, or whole table.** I suggest row by row: the site's row first, then the package's. The other way
   is that a passed table replaces the package's table whole. Then a site would see only its own rows,
   and a country it left out would fall to the fallback. Which do you want?
3. **The rules inside the DAF file.** May a site also pass its own absolute floor and sector floor? I suggest no:
   they are rules from the DAF tool, not country rows.
4. **The charcoal and embodied factors.** I suggest a site may not pass these, since they are the method's own
   figures. Agreed?
5. **The baseline mix table.** It holds no rows today. Should a site be able to pass one now, or leave it until
   item M10.1 is settled?
6. **fNRB sets of values.** The package holds two sets of fNRB values ("vintages"). Should a site's fNRB table
   be added as a new, named set beside them, or replace the default set row by row?

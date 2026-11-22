# Calvin's rulings

These are the rules for Calvin, the carbon module, and nothing else. The rules for the whole site are in
`RULINGS.md` at the root of this repo. Where the two disagree, the root page wins. Only the maintainer changes
these rules.

## Home and versions

- Calvin's home is this repo. Every change to Calvin is made here, by pull request. There is no new seal and no new
  seed.
- The seed's copies of the data tests stay beside the live ones.
- The engine's version changes only when a sum changes.

## Which method a project gets

- A new project, on paper or newly built, gets V2.0 only. There is no V1.0 figure, no transition, and no ask for a
  V1.0 filing.
- The site passes `creditedUnderV1` from its own intake. Left out, the project is new.
- A project moving from V1.0 uses its own filed V1.0 fNRB, and nothing else.
- Two doors, design only. On the sites, the screening sets `creditedUnderV1`, and no door shows. In the Agent
  Commons, Calvin opens with two choices: an estimate for a new project, or a comparison of the old and new rules.
  The wording waits for the maintainer.

## Values and data

- National fNRB defaults come from Table 3 of the official A6.4 tool.
- A country with no national fNRB takes its region's value, by UN M49. With neither, the run refuses and says why.
- V2.0 household runs use the volumes by age group when the project gives an age split. Suppressed demand sits in
  one place.
- The DAF uses the tool's global fallback for a country its table does not list. Its label gives the value, its
  kind, who publishes it and its section.
- Baseline stove and fuel rows take typed shares that add up to 100%.
- The default mix for a country counts biomass as wood, gas as LPG and electricity at zero emissions. It maps the
  survey's stove types to the rulebook's three kinds.
- A source more than three years old is still shown, with its year and a note.
- A fuel whose factor is not a rulebook figure carries a one-line label.
- Presets are invented. They hold method defaults only.
- Kerosene, coal and LPG cite the IPCC 2006 Guidelines, Vol. 2, Ch. 2, Table 2.5.
- The sources of the stove and fuel presets are not raised with the maintainer until the permission replies arrive.
- Household size is the project's own, or else the cited UN figure. With neither, the run refuses.
- Devices per household is a whole number, 1 or more. When it is not given, it is 1.
- A pump on diesel or grid power asks for its yearly emissions. No figures show until they are entered.
- A site's own country tables are read row by row, the site's rows first. The DAF floors and the method's own values
  stay the package's.
- The methodology-order audit is a pass after step M9.

## Starting values and monitoring

- Every opening value is cited, or labelled "starting point". A note says which way credits move. It holds no
  number.
- The litres slider's default and its cap are two separate things, in code and on screen.
- Before the project runs, four values sit on sliders. Each slider runs between cited or natural ends, has a pencil
  for an exact value, and shows the credited figure. A slider share never reaches 0.
- Operating days start at 347 for every project. Claiming more needs a sensor or monitoring.
- The share of homes that use the device starts at 100%, labelled "assumed", until the source sweep finds a source.
- A site can lock Calvin to the view before the project runs. The open site does.
- Monitoring values are assumed before the project runs. After it runs, they come from the operation log or
  monitoring. Until one is entered, its box is blank, with a red dot, and no figures show.

## Screens and report

- Every summary figure carries the "calculated" tag.
- The version is part of a citation.
- The baseline mix is named on its row and in the report.
- The report says how many made-up test cases each build checks, read from the file, and how many match the
  official V1.0 calculator.
- Two marks, two meanings: a monitoring mark and a baseline mark. Both are shown.
- Every field a baseline survey can set gets a teal marker. The age split has its own row.
- U_p shows once, in its entry box.
- Household rows show households × size = people, and the reverse.
- Calvin's colour is Reef (`#0E8A94`).
- The simple view, the bigger tap buttons and Reef go out together, in one release.
- Calvin's question rows are big enough to tap on a phone.
- The report's masthead is the WaterBots mark and nothing else.
- A help note opens on a click as well as on hover.
- Calvin's character has one face.
- Grades and credentials come only from the grading partner's rig.

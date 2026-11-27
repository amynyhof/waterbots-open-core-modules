# Family 4, Console and surfaces: core's part (a proposal)

Session C, 26 Nov 2026. A proposal only. Nothing is built until the maintainer says go.

Read for it: `RULINGS.md`, family 4 of `BUILD_PLAN.md`, the shared console page of 24 Nov and `AGENT_RULES.md`. The
maintainer's words of 26 Nov: the console is in rough shape; every existing agent needs a home on the paid site; the
whole console and the Agent Commons are v1; both sites must feel like one site with two consoles.

## The exports, run from the packed files

**How it was run.** The three packed files the sites install, `core` 0.5.0, `calvin` 0.9.0 and `violet` 0.9.0, were
unpacked into an empty folder. Their fingerprints match `SHA256SUMS.txt`. A test page mounted the screens the way the
packages' READMEs say, with all three stylesheets. Headless Chrome pressed every Export button and printed each one to
PDF. Each export was printed in two layouts:

- **A plain page**, where the whole page scrolls.
- **An app shell, as both consoles are built**: a rail on the left, and a main panel that fills the screen and
  scrolls on its own.

Each was run at the Free site, the Paid site (with a person's note) and the Agent Commons, with each screen alone and
with Calvin and Violet on one page. Every project was made up.

**What each export is.** Calvin has two buttons, "Export report (PDF)" in the controls panel and "Export (PDF)" on the
report tab. Violet has one, "Export (PDF)". All three open the browser's print dialog, and the print styles show only
the report. A site that passes `onExport` runs its own export in place of the print.

| Export | Plain page | App shell (as the consoles are built) |
|---|---|---|
| Calvin, from the calculator tab | Prints all 5 pages, notes included | **Fails: two blank pages** |
| Calvin, from the report tab (either button) | Prints all 5 pages | **Fails: shifted right, clipped on the right, and cut off after about one page (2 of 5)** |
| Violet | Prints in full (2 pages), notes included | **Fails: shifted right, clipped on the right, and cut off after the first page** |
| Calvin and Violet on one page | — | Each prints only its own report, but both fail as above |

**Why they fail.** Both print rules hide the page and then lift the report out with `position: absolute; top: 0;
left: 0`. That only works when the page itself scrolls. In a console:

- the report is placed against the nearest positioned panel, not the page, so it moves right by the width of the rail;
- the panel's fixed height and its own scrolling clip it, so only what fits in one screen prints;
- on Calvin's calculator tab, the report sits inside a part of the screen that prints nothing at all.

The page's own height is also kept, because the rest of the page is only made invisible, not removed. A console
built as a fixed-height panel that scrolls on its own will have this failure. That fits what the maintainer's walk of
26 Nov found. Session C cannot see the sites' own consoles (sessions never read each other's repos), so each site's
walk in Part 2 confirms it.

**Faults on the plain page too:**

1. Calvin's report is about one character too wide for the page. The right edge of every page is cut: "Keny",
   "130.1 tCO₂e/y", "Ex-ante estimat". The report is `width: 100%` plus its own padding.
2. Calvin's notes table prints in the browser's plain serif font, unlike the rest of his report.
3. The two reports stamp the time differently. Calvin prints a local date and time; Violet prints a UTC time code
   (`2026-11-27T00:25:20.785Z`), which can show the next day.
4. Violet, with a site's own `onExport`, never stamps the time, so that export shows no date. Calvin stamps it first.

**What works.** The notes are in every export that was run. Calvin's own notes print at the Free site, the Paid site
and the Agent Commons. Violet's own notes print at the Free site and the Paid site. A person's note prints on the
Paid site in both reports. Two differences remain. Calvin lists every note the person kept. Violet lists only notes
on values her report still shows, so a note on a value that has gone is dropped from her export.

**Not run.** Violet in the Agent Commons, with only a name and the people served, waits for the water source and
the treatment and shows no figure and no Export button. That is her rule for a missing fact, not the export. The same
facts at the Free site do run, though. It is written down for the sprint and not chased (see Part 3).

## Part 1. What core releases, in what order

One release for the family, one tag per package, all on one commit. Core's parts come first in the code; each agent
then uses them.

**1. Core (0.5.0 to 0.6.0)**

- **One print part for every calculator report.** On export it puts the report into a print area of its own,
  straight under `<body>`, and the print rules show only that area. The rest of the page takes no room
  (`display: none`), so no panel can move, clip or cut the report, and no blank pages follow it. The area empties
  after the print. One source for these rules, in core. It ships inside Calvin's and Violet's stylesheets, which every
  site already imports, so no site adds an import.
- **One report width rule.** The report fits the page box, and long values wrap. This fixes the clipped right edge.
- **One notes table** for the export, styled the same in every report, and one time stamp for every report.
- **One list of agent colours** (as data and as tokens): Calvin is Reef `#0E8A94`; Violet is Orchid `#A457D4`; each
  other agent's colour comes from the maintainer (Part 3). A screen sets `--agent` from this list on its own root, so
  the colour is right on both sites, with or without `base.css`.
- **One tap size**, 44 by 44 CSS pixels at the least, for rows, buttons and chips on every screen core ships.
- **The Agent Commons list.** One reader takes the agents a site has installed, and their versions, and gives each
  one's name, seat, job, colour, version and whether it is built or coming. Name, seat and job come from core's one
  crew list; built or coming comes from the one status sheet (agent rule 16).
- **The console's words**, as data both sites read: the six step names, the hand-off button format ("Step 2 of 3:
  Partners. Meet Bridget"), the beta note and the export and save words. They are taken word for word from the shared
  page once it holds them (Part 3).

**2. Calvin (0.9.0 to 0.10.0)**

- Both export buttons use core's print part, and the report fits the page.
- His notes table is core's.
- M5.4: Reef from core's one colour list. His screens use `var(--agent)` in place of the two literal colours they
  hold today (Tide, `#0e7c86`).
- M5.3: his question rows meet core's tap size. A test checks that every row and button on his screens takes it.

**3. Violet (0.9.0 to 0.10.0)**

- Her export uses core's print part.
- Core's time stamp, also when a site passes `onExport`.
- Her buttons, which are 36 pixels tall today, meet the tap size.
- She keeps every note the person wrote, as Calvin does.

**4. Phoebe (0.2.0 to 0.3.0)**

- F4.1: her worksheet's tally as data for the left rail: each pathway with its counts and their words.
- Her caption line under a turn ("Worksheet — ...") is kept only where there is no rail.

**5. Every agent package: its own version and card (Wellington 0.2.0 to 0.3.0, Bridget 0.2.0 to 0.3.0, and the four
above)**

- F4.3: each package's main entry gives its version and card, so the Commons reads what is really installed. Today
  no package exports its version.
- The `version` line in each agent's `config.yaml` follows its package. Today three do not: Violet says 0.4.0 in a
  0.9.0 package, and Phoebe and Wellington say 0.1.0 in 0.2.0 packages.

If the maintainer wants Wellington and Bridget left alone, the sites can read the versions from their own pinned
files instead, and only four packages move. Each package carrying its own version is the surer way.

**The export check.** Before the release, Session C runs the test above by hand from the packed files, in both
layouts, at each door, and reports pass or fail for each export. An automatic check needs the maintainer's yes
(Part 3).

## Part 2. What the sites build against it

Both sites, in one batch, after the shared page (rule 6):

1. Install the six pinned packages. Remove any export or print workaround of their own.
2. Walk every export in the real console, on a desktop and on a phone: Calvin from both tabs, Violet, and both on one
   page. Report pass or fail.
3. The Agent Commons reads core's list with the installed packages' cards. Its own typed list goes. Calvin's two
   Commons choices and his opening line wait on J2.
4. The left rail shows Phoebe's tally from her data, and the caption under her turns goes.
5. Agent colours, the crew rail, the hand-off buttons and the step names come from core's colour list, crew list and
   words. Neither site types its own.
6. The paid site gives every existing agent a home: Phoebe, Bridget's chat and Violet's screen (its #313 and #315), and
   Wellington on his package's answer shape (its #314).
7. The look-only items on the shared page (the beta note, the left rail, chip outlines, map shading and the Tool tab
   tidy) are the sites' own. Core gives only the words and colours they show.

## Part 3. Needs the maintainer, and what may not be v1

**Needs the maintainer:**

- **A shared page for family 4 first** (rule 6): the beta note's scope sentence, the six step names, the hand-off
  format and the look-only items. Core copies its words from it and nothing else.
- **The colour of every agent.** Only Calvin's (Reef) and Violet's (Orchid) are written down here. Wellington's,
  Phoebe's and Bridget's are needed, or the word to take the open site's.
- **One source for "built".** Core's roster file holds a `built` answer for each door; agent rule 16 says the status
  sheet. They disagree today (the coach's item 28). Choose one; core reads only that.
- **An automatic export check:** headless Chrome prints each export from the packed files, in both layouts, on every
  pull request. It is a new check, so it needs a yes. Without it, Session C runs it by hand at each release.
- **J2**, Calvin's two Commons choices and his opening line.

**May not be v1:**

- **One report frame**, the same header and footer for every calculator's report. Both reports already say what they
  must. A shared frame is for looks and can follow v1.
- **The automatic export check.** The check by hand at each release meets the need for v1.

**Found and not chased:**

- **Violet's screen and the same facts.** With the same made-up facts (a name and the people served), Violet's screen
  runs at the Free site and waits for the water source and treatment in the Agent Commons. Her own rule is to refuse
  the same projects at every door. Family 1 or family 2 should check which is right.

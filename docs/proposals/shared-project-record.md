# Proposal: one shared project record (step V9)

**Status:** a proposal only. Nothing here is built. The maintainer has ruled on its first three decisions (rulings
2026-11-21, below). The questions at the end still need answers from the paid site and the open site.

**Family:** Agent orchestration.

## What this is for

Today each site keeps its own project facts and hands a module a small set of them. The modules don't share what
they learn. One module can't tell another that a pathway is unlikely. The site walk of 2026-11-21 found three
problems that come from this (W1 to W3 in `BUILD_PLAN.md`).

This proposal puts **one project record** in `core`. Every module reads it and fills in its own part, and both
sites use it. A *record* here means one structured set of facts about one project, in one agreed shape (a
*schema*: the list of fields, their names and their types). The record lives only in `core` (ruling 2026-11-21). Each
site turns it into its own storage and back.

Some rules stay as they are:

- A module never fetches or saves anything itself. The site hands it the record, and the site's `onSave` stores
  what the module gives back. A refused save always shows its reason.
- The engine does every sum. A site shows an estimate from the record, but never works one out.
- A project fact is never guessed. While it is missing, its field says "awaiting user project input".

We are guides, not gates (ruling 2026-11-21). A pathway's reading says how likely it is, and why. It never shuts a
door for good.

## The rulings of 2026-11-21

1. **One set of status words, everywhere:** "likely", "more to learn" and "unlikely". "Ruled out" is never used.
   Violet's code today calls her readings "likely", "not enough known" and "unlikely". "Not enough known" becomes
   "more to learn", and "unlikely" stays.
2. **Agents in play.** A pathway's reading decides whether its calculator agent is called inside a site's screening.
   See "Agents in play" below. This replaces the ruling of 2026-10-01 that the water calculator always shows.
3. **The record lives only in `core`.**

## What `core` holds today

`core` 0.1.1 holds the start of a record, but not the record itself:

- `ModuleProject` is the facts a site hands a module: name, standards, technology, country, region, people served
  and the daily water per person. It also carries the module's own saved working state, `analysis`.
- `Technology` is one of three codes: `CWS`, `HWT` or `other`.
- `StandardId` is one of four standards: `carbon`, `vwba`, `wqba` or `wash-ba`.
- `SaveOutcome` is what a site's save answers: it worked, or it was refused, with a reason.

What is missing: a reading for each pathway, which pathways are in play, place facts beyond country and region, each
module's estimate, question counts, and a check that refuses a bad fact.

## The record, part by part

The record has five parts. Every value in it says where it came from: who set it (the person, a site's intake, or a
module), and from what source.

1. **Project facts.** What the person tells us about the project.
   - Name.
   - Technology: the code (`CWS`, `HWT` or `other`) and the site's own label for it, word for word.
   - People served: the count, whether it counts people or households, and people per household.
   - The daily water per person, when the project has its own figure.
   - What powers the pump: hand, gravity, solar, diesel or grid.
   - Whether the project was already credited under the carbon method's V1.0.
   - Full or limited access to the water.
   - The water the supply gave each year before the project, which is 0 for a new supply.
2. **Pathways.** One entry for each funding pathway: carbon, VWBA, WQBA and WASH-BA, the four standards `core`
   already lists. Each entry has:
   - a reading: **likely**, **more to learn** or **unlikely**;
   - its reason, in plain words;
   - what would change the reading, in plain words: for example, a fact that is missing, or a change to the project;
   - for "more to learn", the information that is missing;
   - its source: the eligibility agent and the rule or citation it read.

   The record also carries **which pathways are in play**: those read "likely" or "more to learn". The site writes
   this list from the readings, using one function in `core`, so no module has to work it out.
3. **Place facts.** Country (a three-letter code) and region. Later, the project's point on the map and its river
   basin. The map agent, Bridget, writes these.
4. **Each module's part.** For each module:
   - its inputs, shaped by the module. Today this is Calvin's `analysis`, and Violet will have the same;
   - its estimate: the headline figure, its unit, the method, the engine version, the module's standing (such as
     "Draft — pending expert review"), and when it was worked out.

   The estimate is stored so that the paid site can show it and the same-numbers check (V14) can compare it. It is
   always the engine's answer.
5. **Question counts.** For each module, how many questions it asked the person on this walk. A fact read from the
   record is not a question. Only a question asked counts.

The record also carries a version number for its shape. A site can then tell an older record from a newer one, and
a later version can still read an earlier one.

### The pathways replace `standards`

Today `ModuleProject.standards` lists the standards a project can qualify under. Calvin receives it but never reads
it. The pathway readings say the same thing and more: a reading, its reason and what would change it. So the readings
replace `standards`. For one release, `core` still fills in `standards` from the pathways in play, so a site that
reads it keeps working. Then `standards` is retired.

Here is a sketch of the shape. It is for reading only; none of it is built.

```ts
// A sketch, not code in the package.
type Source = { by: "person" | "site intake" | ModuleId; note: string };
type Fact<T> = { value: T; source: Source };
type Reading = "likely" | "more to learn" | "unlikely";

interface PathwayReading {
  reading: Reading;
  reason: string;
  /** What would change the reading. */
  wouldChange: string;
  /** "more to learn" only: the information that is missing. */
  missing?: string[];
  source: Source;
}

interface ProjectRecord {
  recordVersion: 1;
  facts: {
    name: string;
    technology?: { code?: "CWS" | "HWT" | "other"; label: string; source: Source };
    population?: Fact<{ mode?: "people" | "households"; served?: number; householdSize?: number }>;
    lpcd?: Fact<number>;
    pumpPower?: Fact<"hand" | "gravity" | "solar" | "diesel" | "grid">;
    creditedUnderV1?: Fact<boolean>;
    accessLevel?: Fact<"full" | "limited">;
    withoutProjectM3PerYear?: Fact<number>;
  };
  pathways: Partial<Record<StandardId, PathwayReading>>;
  /** Written from the readings by core's one function: the pathways read "likely" or "more to learn". */
  inPlay: StandardId[];
  place: { country?: Fact<string>; region?: Fact<string> /* later: point, basin */ };
  modules: Partial<Record<ModuleId, { inputs?: unknown; estimate?: Estimate; questionsAsked?: number }>>;
}
```

## Each module: what it reads, what it writes

| Module | Reads from the record | Writes back | Pathway | Method |
|---|---|---|---|---|
| Wellington (the open site's host agent; another repo) | The pathways in play, to know which agents to call | The project facts it collects at intake, and its question count | — | — |
| Phoebe (eligibility; not built yet) | Project facts and place facts | A reading for each pathway, with its reason, what would change it and its source, and its question count | All four | — |
| Bridget (the map; not built yet) | Country and region | Place facts: the point and the basin, each with its source, and its question count | — | — |
| Calvin (carbon) | Technology code, country, region, people served, daily water per person, what powers the pump, credited under V1.0, the carbon reading | His inputs, his estimate in tCO₂e a year (V2.0, plus V1.0 and the transition for a credited project), and his question count | Carbon | The carbon method: Method 1 for `CWS`, Method 2 for `HWT`; V2.0, with V1.0 for the transition |
| Violet (water) | People served, full or limited access, the water before the project, the VWBA reading, and her own saved inputs | Her inputs, her estimate in m³ a year with her standing, and her question count | VWBA | VWBA 2.0 D-3, Volume Provided |

### Violet reads her facts from the record, and her inputs come back

Today Violet reads only people served from the record. She asks for access level and the water before the project on
her own screen, though both are project facts. Her screen also starts fresh each time it opens: she has no `onSave`,
and nothing she saved is handed back.

Under this proposal:

- Violet reads all her project facts from the record: people served, access level and the water before the project.
  While one is missing, she says what the record is missing and where to fill it in, as she does for people served
  today, and as Calvin does.
- Her own inputs, such as the option, the sliders and the monitoring values, are saved through the site's `onSave`
  and handed back when she opens, as Calvin's are.

## Agents in play

The host agent reads the pathways in play and calls only their calculator agents: Calvin for carbon, Violet for VWBA.
`core` holds the one function it uses, so both sites decide the same way.

- **Likely:** the host agent calls that pathway's calculator agent. The agent shows, and the calculator runs.
- **More to learn:** the same, with a flag that some information is missing. The flag names what is missing, from the
  reading.
- **Unlikely:** inside a site's screening, that agent is not called and does not show. The record carries the reason
  and what would change the reading. The host agent tells the visitor both, so they know whether the project can be
  salvaged, and how.
- **No reading yet:** this is a question for the maintainer (see the end). The screening runs Phoebe before the
  calculators, so on a site this should be rare.

In the Agent Commons door, every agent still opens alone, whatever a reading says (see "The two doors").

This replaces the ruling of 2026-10-01 that the water calculator always shows. When the code moves to the record,
Violet's `WATER_ALWAYS_SHOWS` and `carbonShowsBeside` give way to `core`'s function, and her `CarbonReading` takes the
three words.

## The two doors

A module learns its door from the site, not from the record. The site passes it alongside the record. A door is
where the module is working, not a fact about the project. `core` takes Violet's `Door` type (`"site"` or
`"agent-commons"`), so every module uses the same one.

- **Inside a site's screening** (`site`): the host agent calls only the agents in play. A module reads the record and
  never asks again for a fact the record holds. It writes back its part. When it is done, it hands back to
  Wellington.
- **Alone in the Agent Commons** (`agent-commons`): every agent opens alone. There is no site record and no
  eligibility agent. The module starts an empty record of the same shape and fills it from the person's answers. The
  same checks and the same engine then run, so a figure in the Commons and one on a site come from the same code. The
  module sends nothing to another agent. Calvin's two Commons choices (V17) set "credited under V1.0" in that record.

## How the record closes W1, W2 and W3

- **W1, a minus count of people served.** `core` holds one check for every fact. A count must be a whole number above
  zero, people per household must be above zero, and a volume can't be below zero. The site runs the check before it
  saves the record, and a fact that fails is refused with its reason (`SaveOutcome`). So a minus count never reaches
  the record. A module that is handed a fact that fails the check says what is wrong ("the record's count of people
  served is below zero"). It doesn't say the fact is missing. Both sites and every module use the one check, so no
  calculator can ignore the count without a message.
- **W2, an unlikely pathway still got a figure.** The eligibility agent writes "unlikely" into the record, with its
  reason and what would change it. The host agent reads the pathways in play through the one function in `core`, and
  doesn't call an agent whose pathway is unlikely. So no figure appears, and the visitor is told why and what would
  change it. A test takes an invented project whose VWBA reading is unlikely, and shows Violet is not in play.
- **W3, a technology label read as "other".** The record keeps the site's own label next to the code. `core` holds
  one mapping from the sites' labels to the codes, so both sites read a label the same way. A label the mapping
  doesn't know gets no code, and the module says the label isn't known yet and shows it. Then the label is added to
  the mapping. `other` is kept for a project the person says is neither a community water supply nor household water
  treatment. A test covers "Community level water treatment technologies". The mapping needs the sites' list of
  labels first (see the questions).

## How it could be built, in small steps

Each step is its own pull request and trial release. Nothing changes for a site until it chooses to move.

1. **The shape and the check.** `ProjectRecord`, the fact check and the label mapping go in `core`, with tests on
   invented projects. `ModuleProject` keeps working: `core` turns a record into one, `standards` included. Lane 3.
2. **The agents in play and the doors.** The function that turns readings into the pathways in play, and `Door` moved
   into `core`. Violet's readings take the three words.
3. **Calvin and Violet read the record.** Each module reads its facts from the record and hands back its part.
   Violet reads access level and the water before the project from the record, and takes her saved inputs back, as
   Calvin does.
4. **Question counts.** Each module counts the questions it asks and writes the count.
5. **The same-numbers check (V14).** A record saved by the screening, read back the way the paid site reads it, gives
   the same estimates.

The files in `core` came with the seed and are kept byte for byte (`.gitattributes`). Changes to them still go
through a normal pull request, as for Calvin's seeded files.

## Questions for the paid site (its save format)

1. How does the paid site store a project record today: as one document, or as fields spread over several tables?
2. What is each project fact called there, and in what unit? For example: people served, households, technology,
   country.
3. Where does it keep each module's saved inputs (Calvin's `analysis` today)? Can it keep a part for each module,
   Violet's included?
4. Can it store a reading, a reason, what would change it and a source for each pathway?
5. Can it store a version number for the record's shape, and keep reading older records?
6. Who may change which part? For example, may a contributor change project facts but not pathway readings?
7. Does it keep earlier versions of a record, or only the latest?
8. Can it read a record saved by the open site, for the same-numbers check (V14)?

## Questions for the open site (the host agent's fields)

1. Which facts does Wellington collect at intake, and what is each field called? Does it collect access level and
   the water the supply gave before the project?
2. What technology labels can a project have on the open site? Please send the full list, word for word.
3. How does Wellington ask for people served: as people, as households, or either? Does it ask for people per
   household?
4. Is country stored as a three-letter code or as a name?
5. Where does the open site keep the record between steps of the walk, and for how long?
6. How does the eligibility result reach the other steps today?
7. Does the open site's own water calculator stay once Violet is mounted, or does Violet take its place?
8. Does the open site count questions today? If so, how?

## Still for the maintainer

1. A pathway with no reading yet, inside a site's screening: should its agent be called with the "more to learn"
   flag, or not called until there is a reading?

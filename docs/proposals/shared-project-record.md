# Proposal: one shared project record (step V9)

**Status:** a proposal only. Nothing here is built. The maintainer decides; the questions at the end need answers
from the paid site and the open site first.

**Family:** Agent orchestration.

## What this is for

Today each site keeps its own project facts and hands a module a small set of them. The modules don't share what
they learn. One module can't tell another that a pathway is ruled out. The site walk of 2026-11-21 found three
problems that come from this (W1 to W3 in `BUILD_PLAN.md`).

This proposal puts **one project record** in `core`. Every module reads it and fills in its own part, and both
sites use it. A *record* here means one structured set of facts about one project, in one agreed shape (a
*schema*: the list of fields, their names and their types).

Some rules stay as they are:

- A module never fetches or saves anything itself. The site hands it the record, and the site's `onSave` stores
  what the module gives back. A refused save always shows its reason.
- The engine does every sum. A site shows an estimate from the record, but never works one out.
- A project fact is never guessed. While it is missing, its field says "awaiting user project input".

## What `core` holds today

`core` 0.1.1 holds the start of a record, but not the record itself:

- `ModuleProject` is the facts a site hands a module: name, standards, technology, country, region, people served
  and the daily water per person. It also carries the module's own saved working state, `analysis`.
- `Technology` is one of three codes: `CWS`, `HWT` or `other`.
- `StandardId` is one of four standards: `carbon`, `vwba`, `wqba` or `wash-ba`.
- `SaveOutcome` is what a site's save answers: it worked, or it was refused, with a reason.

What is missing: a status for each pathway, place facts beyond country and region, each module's estimate, question
counts, and a check that refuses a bad fact.

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
   - a status: **likely**, **more to learn** or **ruled out**;
   - its reason, in plain words;
   - its source: the eligibility agent and the rule or citation it read.

   A pathway with no entry yet has no status. That is different from "more to learn".
3. **Place facts.** Country (a three-letter code) and region. Later, the project's point on the map and its river
   basin. The map agent, Bridget, writes these.
4. **Each module's part.** For each module:
   - its inputs, which is today's `analysis` and shaped by the module;
   - its estimate: the headline figure, its unit, the method, the engine version, the module's standing (such as
     "Draft — pending expert review"), and when it was worked out.

   The estimate is stored so that the paid site can show it and the same-numbers check (V14) can compare it. It is
   always the engine's answer.
5. **Question counts.** For each module, how many questions it asked the person on this walk. A fact read from the
   record is not a question. Only a question asked counts.

The record also carries a version number for its shape. A site can then tell an older record from a newer one, and
a later version can still read an earlier one.

Here is a sketch of the shape. It is for reading only; none of it is built.

```ts
// A sketch, not code in the package.
type Source = { by: "person" | "site intake" | ModuleId; note: string };
type Fact<T> = { value: T; source: Source };

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
  pathways: Partial<Record<StandardId, { status: "likely" | "more to learn" | "ruled out"; reason: string; source: Source }>>;
  place: { country?: Fact<string>; region?: Fact<string> /* later: point, basin */ };
  modules: Partial<Record<ModuleId, { inputs?: unknown; estimate?: Estimate; questionsAsked?: number }>>;
}
```

## Each module: what it reads, what it writes

| Module | Reads from the record | Writes back | Pathway | Method |
|---|---|---|---|---|
| Wellington (the open site's host agent; another repo) | Nothing to start; it opens the record | The project facts it collects at intake, and its question count | — | — |
| Phoebe (eligibility; not built yet) | Project facts and place facts | A status, reason and source for each pathway, and its question count | All four | — |
| Bridget (the map; not built yet) | Country and region | Place facts: the point and the basin, each with its source, and its question count | — | — |
| Calvin (carbon) | Technology code, country, region, people served, daily water per person, what powers the pump, credited under V1.0, the carbon pathway's status | His inputs, his estimate in tCO₂e a year (V2.0, plus V1.0 and the transition for a credited project), and his question count | Carbon | The carbon method: Method 1 for `CWS`, Method 2 for `HWT`; V2.0, with V1.0 for the transition |
| Violet (water) | People served, full or limited access, the water before the project, the VWBA pathway's status | Her inputs, her estimate in m³ a year with her standing, and her question count | VWBA | VWBA 2.0 D-3, Volume Provided |

## The rule for a ruled-out pathway

A module reads its pathway's status before it does anything else.

- **Ruled out:** the module shows the reason and its source, and it does not run. It shows no figure and no
  sliders, and it asks no questions. It writes no estimate. Any old estimate stays in the record, marked as from
  before the pathway was ruled out.
- **Likely or more to learn:** the module runs.
- **No status yet:** the module runs, and says the pathway hasn't been read yet.

`core` holds one function for this, so every module reads the status the same way. It answers either "runs" or "does
not run, because of this reason, from this source".

**This changes an earlier ruling.** Ruling 2026-10-01 says the water calculator always shows on the screening. Under
this rule, Violet would not run when VWBA is ruled out. The maintainer decides which one stands.

## The two doors

A module learns its door from the site, not from the record. The site passes it alongside the record. A door is
where the module is working, not a fact about the project. `core` takes Violet's `Door` type (`"site"` or
`"agent-commons"`), so every module uses the same one.

- **Inside a site's screening** (`site`): the module reads the record and never asks again for a fact the record
  holds. It writes back its part. When it is done, it hands back to Wellington. Phoebe's pathway statuses apply.
- **Alone in the Agent Commons** (`agent-commons`): there is no site record and no eligibility agent. The module
  starts an empty record of the same shape and fills it from the person's answers. The same checks and the same
  engine then run, so a figure in the Commons and one on a site come from the same code. The module sends nothing to
  another agent. Its pathways have no status, so the module runs and says so. Calvin's two Commons choices (V17) set
  "credited under V1.0" in that record.

## How the record closes W1, W2 and W3

- **W1, a minus count of people served.** `core` holds one check for every fact. A count must be a whole number above
  zero, people per household must be above zero, and a volume can't be below zero. The site runs the check before it
  saves the record, and a fact that fails is refused with its reason (`SaveOutcome`). So a minus count never reaches
  the record. A module that is handed a fact that fails the check says what is wrong ("the record's count of people
  served is below zero"). It doesn't say the fact is missing. Both sites and every module use the one check, so no
  calculator can ignore the count without a message.
- **W2, a ruled-out pathway still got a figure.** The eligibility agent writes "ruled out" into the record, with its
  reason. Every calculator reads its pathway's status first, through the one function in `core`. A calculator on a
  ruled-out pathway shows the reason and no figure. A test takes an invented project that is ruled out for VWBA, and
  shows Violet gives no figure.
- **W3, a technology label read as "other".** The record keeps the site's own label next to the code. `core` holds
  one mapping from the sites' labels to the codes, so both sites read a label the same way. A label the mapping
  doesn't know gets no code, and the module says the label isn't known yet and shows it. Then the label is added to
  the mapping. `other` is kept for a project the person says is neither a community water supply nor household water
  treatment. A test covers "Community level water treatment technologies". The mapping needs the sites' list of
  labels first (see the questions).

## How it could be built, in small steps

Each step is its own pull request and trial release. Nothing changes for a site until it chooses to move.

1. **The shape and the check.** `ProjectRecord`, the fact check and the label mapping go in `core`, with tests on
   invented projects. `ModuleProject` keeps working: `core` turns a record into one. Lane 3.
2. **The pathway rule and the doors.** The function a module calls before it runs, and `Door` moved into `core`.
3. **Calvin and Violet read the record.** Each module reads its facts and pathway from the record, and hands back its
   part. Violet also takes her saved inputs back, as Calvin already does. Today her screen starts fresh each time it
   opens.
4. **Question counts.** Each module counts the questions it asks and writes the count.
5. **The same-numbers check (V14).** A record saved by the screening, read back the way the paid site reads it, gives
   the same estimates.

The files in `core` came with the seed and are kept byte for byte (`.gitattributes`). Changes to them still go
through a normal pull request, as for Calvin's seeded files.

## Questions for the paid site (its save format)

1. How does the paid site store a project record today: as one document, or as fields spread over several tables?
2. What is each project fact called there, and in what unit? For example: people served, households, technology,
   country.
3. Where does it keep each module's saved inputs (Calvin's `analysis` today)? Can it keep a part for each module?
4. Can it store a status, a reason and a source for each pathway?
5. Can it store a version number for the record's shape, and keep reading older records?
6. Who may change which part? For example, may a contributor change project facts but not pathway statuses?
7. Does it keep earlier versions of a record, or only the latest?
8. Can it read a record saved by the open site, for the same-numbers check (V14)?

## Questions for the open site (the host agent's fields)

1. Which facts does Wellington collect at intake, and what is each field called?
2. What technology labels can a project have on the open site? Please send the full list, word for word.
3. How does Wellington ask for people served: as people, as households, or either? Does it ask for people per
   household?
4. Is country stored as a three-letter code or as a name?
5. Where does the open site keep the record between steps of the walk, and for how long?
6. How does the eligibility result reach the other steps today?
7. Does the open site's own water calculator stay once Violet is mounted, or does Violet take its place?
8. Does the open site count questions today? If so, how?

## Decisions for the maintainer

1. The pathway statuses are "likely", "more to learn" and "ruled out". Violet's code today uses "likely", "not enough
   known" and "unlikely" for carbon. Should those be renamed to the new words? And does "unlikely" mean "ruled out"?
2. Should a ruled-out VWBA pathway stop the water calculator? That would change ruling 2026-10-01 (see above).
3. Should the record live only in `core`, with each site turning it into its own storage? That is what this proposal
   assumes.

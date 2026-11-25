// Calvin and the shared project record (J3), his place (J2) and his choices in the Agent Commons. Every project here
// is made up.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyRecord, type ProjectRecord } from "@waterbots/core/record";
import { computeScenario } from "../engine";
import { seedCalcState, toSavedAnalysis, toScenarioInput, missingProjectFacts } from "../screen/state";
import { addCalvinFacts, addCalvinResults, calvinGivenFacts, calvinNeeds, calvinProjectFromRecord, calvinRecordProblems } from "./record";
import { CALVIN_COMMONS_CHOICES, commonsChoiceFacts, showsCommonsChoices } from "./commons";
import { calculatorPageContext } from "./pageContext";

const intake = { by: "site intake", note: "made up for a test" } as const;

/** A made-up project as Wellington leaves it: the basic facts, and a count with no unit yet. */
function gathered(): ProjectRecord {
  const r = emptyRecord();
  r.facts.name = "Invented test project";
  r.facts.technology = { label: "Community water supply", code: "CWS", source: intake };
  r.place.country = { value: "LSO", source: intake };
  r.facts.population = { value: { served: 1200 }, source: intake };
  r.pathways.carbon = { reading: "likely", reason: "made up", wouldChange: "made up", source: { by: "phoebe", note: "made up" } };
  return r;
}

describe("Calvin reads the record first", () => {
  it("takes the facts the record holds, and fills in nothing it does not", () => {
    const p = calvinProjectFromRecord(gathered());
    expect(p).toEqual({ name: "Invented test project", standards: ["carbon"], technology: "CWS", country: "LSO", population: { served: 1200 } });
    // People served keep the way they were entered: no unit is filled in on its own.
    expect(seedCalcState(p).populationMode).toBeNull();
    expect(missingProjectFacts(seedCalcState(p)).map((f) => f.key)).toEqual(["countedAs"]);
  });

  it("asks only for what the record does not hold", () => {
    expect(calvinNeeds(gathered())).toEqual(["population.mode"]);
    // Nobody is asked for a kind: the source comes first (2026-11-25).
    expect(calvinNeeds(emptyRecord())).toEqual(["waterSource", "country", "population.served", "population.mode"]);
  });

  it("an unlikely pathway is not one of the project's standards", () => {
    const r = gathered();
    r.pathways.vwba = { reading: "unlikely", reason: "made up", wouldChange: "made up", source: { by: "phoebe", note: "made up" } };
    expect(calvinProjectFromRecord(r).standards).toEqual(["carbon"]);
  });

  it("names a count below zero as wrong, not as missing (W1)", () => {
    expect(calvinRecordProblems({ population: { mode: "people", served: -40 } })).toEqual([{ ok: false, fact: "population.served", problem: "below zero" }]);
    expect(calvinRecordProblems({ population: { mode: "people" } })).toEqual([]);
  });
});

describe("Calvin adds what he asked for, and his results (agent rule 10)", () => {
  it("takes a made-up project through his part: saved and read back unchanged, with his question count", () => {
    // He asks one question: whether the count is people or households.
    const asked = addCalvinFacts(gathered(), { population: { mode: "people" } });
    expect(asked.added).toEqual(["population.mode"]);

    const project = calvinProjectFromRecord(asked.record);
    const state = seedCalcState(project);
    const paaResult = computeScenario({ ...toScenarioInput(state), version: "paa" });
    const record = addCalvinResults(asked.record, { analysis: toSavedAnalysis(state), paaResult, done: true });

    const part = record.agents.calvin!;
    expect(part.questionsAsked).toBe(1);
    expect(part.done).toBe(true);
    // The figure is the engine's answer, as it came.
    expect(part.estimate).toEqual({ figure: paaResult.result.ER, unit: "tCO2e a year", method: "carbon-v2.0", engineVersion: expect.any(String) });

    // Saved and read back, the record is the same, and Calvin opens on the inputs he saved.
    const back = JSON.parse(JSON.stringify(record)) as ProjectRecord;
    expect(back).toEqual(record);
    expect(seedCalcState(calvinProjectFromRecord(back))).toEqual(state);
  });

  it("a count typed on his screen goes to the record only when the record lacks it", () => {
    const state = { populationCount: 900, populationMode: "people" as const, householdSizeOverride: null };
    expect(calvinGivenFacts(state)).toEqual({ population: { served: 900, mode: "people" } });
    // The record's own count stays: it is edited where the host keeps it.
    const { record, added } = addCalvinFacts(gathered(), calvinGivenFacts(state));
    expect(added).toEqual(["population.mode"]);
    expect(record.facts.population?.value).toEqual({ served: 1200, mode: "people" });
    expect(calvinGivenFacts({ populationCount: null, populationMode: null, householdSizeOverride: null })).toEqual({});
  });

  it("a figure that no longer holds is cleared", () => {
    const state = seedCalcState(calvinProjectFromRecord(gathered()));
    const withFigure = { ...emptyRecord(), agents: { calvin: { estimate: { figure: 1, unit: "tCO2e a year", method: "carbon-v2.0", engineVersion: "0" } } } };
    expect(addCalvinResults(withFigure, { analysis: toSavedAnalysis(state), paaResult: null }).agents.calvin?.estimate).toBeUndefined();
  });
});

describe("Calvin works with what his place gives him (J2)", () => {
  const state = seedCalcState(calvinProjectFromRecord(emptyRecord()));
  const base = { projectName: "Invented", state, missingFacts: missingProjectFacts(state), fnrbRefusal: null, result: null, legacyResult: null, paaResult: null, waterfall: null };

  it("on a site, the facts are filled in on the record", () => {
    expect(calculatorPageContext({ ...base, place: "free-site" })).toContain("Once the facts are on the project record");
    expect(calculatorPageContext(base)).toContain("Once the facts are on the project record");
  });

  it("in the Agent Commons and at MCP there is no record: the person gives each fact", () => {
    for (const place of ["agent-commons", "mcp"] as const) {
      const text = calculatorPageContext({ ...base, place });
      expect(text).toContain("There is no project record here");
      expect(text).not.toContain("Once the facts are on the project record");
    }
  });

  it("he is told a count on the record is below zero, not that it is missing (W1)", () => {
    const text = calculatorPageContext({ ...base, recordProblems: [{ ok: false, fact: "population.served", problem: "below zero" }] });
    expect(text).toContain("people served can't be used: below zero");
  });
});

describe("Calvin's two choices in the Agent Commons (was V17)", () => {
  it("show only in the Agent Commons", () => {
    expect(showsCommonsChoices("agent-commons")).toBe(true);
    for (const place of ["free-site", "paid-site", "mcp", "lobby-chat"] as const) expect(showsCommonsChoices(place)).toBe(false);
  });

  it("each sets whether the project was credited under V1.0; the comparison still needs the filed V1.0 fNRB", () => {
    expect(CALVIN_COMMONS_CHOICES.map((c) => [c.id, c.sets.creditedUnderV1, c.needsFiledV1Fnrb])).toEqual([
      ["new-project-estimate", false, false],
      ["compare-old-and-new-rules", true, true],
    ]);
    expect(commonsChoiceFacts("compare-old-and-new-rules")).toEqual({ creditedUnderV1: true });
  });

  it("carry no words: the wording waits for the maintainer", () => {
    for (const c of CALVIN_COMMONS_CHOICES) expect(Object.keys(c).sort()).toEqual(["id", "needsFiledV1Fnrb", "sets"]);
  });

  it("a choice is one question, added to a temporary record", () => {
    const { record, added } = addCalvinFacts(emptyRecord(), commonsChoiceFacts("new-project-estimate"));
    expect(added).toEqual(["creditedUnderV1"]);
    expect(calvinProjectFromRecord(record).creditedUnderV1).toBe(false);
    expect(record.agents.calvin?.questionsAsked).toBe(1);
  });
});

describe("the agent entry", () => {
  const pkgDir = fileURLToPath(new URL("../../../..", import.meta.url));
  const srcDir = join(pkgDir, "src");

  it("is in the package's exports", () => {
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
    expect(pkg.exports["./agent"]).toEqual({ types: "./dist/agent.d.ts", default: "./dist/agent.js" });
  });

  it("reaches no React and no screen component", () => {
    const seen = new Set<string>();
    const todo = [join(srcDir, "agent.ts")];
    while (todo.length > 0) {
      const file = todo.pop()!;
      if (seen.has(file) || file.endsWith(".json")) continue;
      seen.add(file);
      for (const [, spec] of readFileSync(file, "utf8").matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)) {
        expect(spec!.startsWith("react"), `${file} imports "${spec}"`).toBe(false);
        if (!spec!.startsWith(".")) continue;
        const next = resolve(dirname(file), spec!.replace(/\.js$/, ""));
        todo.push(next.endsWith(".json") ? next : existsSync(`${next}.ts`) ? `${next}.ts` : `${next}.tsx`);
      }
    }
    expect([...seen].some((f) => f.endsWith(".tsx"))).toBe(false);
  });
});

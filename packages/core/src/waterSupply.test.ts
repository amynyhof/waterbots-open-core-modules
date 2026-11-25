// Which projects the map sends to Violet (ruled by the maintainer on 2026-11-24). Every project here is made up.
import { describe, expect, test } from "vitest";
import { FACT_RULES, METHODS, agentMap, methodsFor, noMethodFor, stepOf, type MapInput } from "./agentMap";
import { HOME_USES, PROJECT_TYPE_IDS, addGivenFacts, emptyRecord, needsHomeUse, recordTechnology, recordWaterSupply, waterNotCovered, type HomeUse, type PathwayReading, type ProjectFacts, type ProjectRecord } from "./record";
import { TECHNOLOGY_LABELS, technologyCode, waterCoverage } from "./technologyLabels";

const by = { by: "person", note: "made up for a test" } as const;
const read = (reading: PathwayReading["reading"]): PathwayReading => ({ reading, reason: "made up", wouldChange: "made up", source: { by: "phoebe", note: "made up" } });
const label = (words: string): ProjectFacts => {
  const code = technologyCode(words);
  return { technology: { label: words, ...(code === undefined ? {} : { code }), source: by } };
};
const type = (id: (typeof PROJECT_TYPE_IDS)[number]): ProjectFacts => ({ type: { value: id, source: by } });

/** A made-up project, read as likely on water and on carbon, with Bridget finished. */
function likely(facts: ProjectFacts): ProjectRecord {
  return {
    ...emptyRecord(),
    facts,
    place: { country: { value: "XKX", source: by } },
    pathways: { carbon: read("likely"), vwba: read("likely") },
    agents: { bridget: { done: true } },
  };
}
const reads = ["carbon", "vwba"] as const;
const map = (facts: ProjectFacts, extra: Partial<MapInput> = {}) => agentMap({ place: "free-site", record: likely(facts), reads, ...extra });
const violet = (m: ReturnType<typeof agentMap>) => m.agents.find((a) => a.agent === "violet")!;
const water = (m: ReturnType<typeof agentMap>) => m.pathways.find((p) => p.pathway === "vwba")!;

const home = (value: HomeUse): ProjectFacts => ({ homeUse: { value, source: by } });
const NEW_SUPPLY = "New or alternative water supply";
const SUPPLIES = ["Community water supply", "Community water supply technologies", "A new water source a community collects from"];
const TREATMENT = [
  "Household water treatment",
  "Household water treatment technologies",
  "Institutional water treatment technologies",
  "Community level water treatment technologies",
  "Water made safe in the home",
];

test("every label on the list is a supply, a supply for home use, or treatment, with a source", () => {
  expect(TECHNOLOGY_LABELS.map((t) => t.label).sort()).toEqual([...SUPPLIES, NEW_SUPPLY, ...TREATMENT].sort());
  expect(waterCoverage(NEW_SUPPLY)).toBe("covered for home use");
  for (const t of TECHNOLOGY_LABELS) expect(t.whyWater).toContain("VWBA 2.0");
  expect(waterCoverage("A label nobody has sent yet")).toBe("not known");
});

test("the carbon side does not change: the codes are the ones they were", () => {
  expect(TECHNOLOGY_LABELS.filter((t) => t.code === "CWS").map((t) => t.label)).toEqual(["Community water supply", "Community water supply technologies", "A new water source a community collects from"]);
  expect(TECHNOLOGY_LABELS.filter((t) => t.code === "HWT").map((t) => t.label)).toEqual(["Household water treatment", "Household water treatment technologies", "Water made safe in the home"]);
  expect(recordTechnology({ facts: label("New or alternative water supply") })).toBeUndefined();
});

describe("a supply that gives people water", () => {
  test.each(SUPPLIES)("%s: Violet is called, with D-3", (words) => {
    const m = map(label(words));
    expect(violet(m)).toEqual({ agent: "violet", called: true, introduce: true });
    expect(water(m)).toMatchObject({ inPlay: true, agent: "violet", methods: ["vwba-d3"] });
    expect(water(m)).not.toHaveProperty("noMethod");
  });
  test.each(SUPPLIES)("%s: with nothing read yet, it points to the water pathway", (words) => {
    const record = { ...likely(label(words)), pathways: {}, agents: {} };
    expect(water(agentMap({ place: "free-site", record, reads }))).toMatchObject({ inPlay: true, moreToLearn: true, because: "project facts", methods: ["vwba-d3"] });
  });
  test("a drinking-water type with a supply's class", () => {
    expect(violet(map({ ...type("C-19"), technologyClass: { value: "CWS", source: by } })).called).toBe(true);
  });
  test("a site's own label the list does not know, with the supply's code", () => {
    expect(recordWaterSupply({ technology: { label: "A label nobody has sent yet", code: "CWS", source: by } })).toBe("covered");
  });
  test("Bridget, then Calvin, then Violet, then the report or sign-up", () => {
    const record = likely(label("Community water supply"));
    record.agents = {};
    const next = () => agentMap({ place: "free-site", record, reads }).next;
    expect(next()).toEqual({ step: "call", agent: "bridget" });
    record.agents.bridget = { done: true };
    expect(next()).toEqual({ step: "call", agent: "calvin" });
    record.agents.calvin = { done: true };
    expect(next()).toEqual({ step: "call", agent: "violet" });
    record.agents.violet = { done: true };
    expect(next()).toEqual({ step: "report or sign-up" });
  });
});

describe("a new or alternative supply: home use is asked first", () => {
  const ways: ProjectFacts[] = [label(NEW_SUPPLY), type("C-11"), { ...label(NEW_SUPPLY), ...type("C-11") }];
  test("before it is said: she waits, and Wellington gathers the one fact next", () => {
    for (const facts of [ways[0]!, ways[2]!]) {
      expect(needsHomeUse(facts)).toBe(true);
      for (const extra of [{}, { place: "paid-site", saved: true }] as const) {
        const m = map(facts, extra);
        expect(violet(m)).toEqual({ agent: "violet", called: false, because: "waiting for basic facts" });
        expect(water(m)).toMatchObject({ inPlay: true, agent: "violet", methods: [], noMethod: "waiting for basic facts" });
        expect(stepOf(m, "violet")).not.toBeNull();
        expect(m.next).toEqual({ step: "gather facts", facts: ["homeUse"] });
        expect(m.agents.find((a) => a.agent === "calvin")).toMatchObject({ called: true });
      }
    }
  });
  test("by the type alone, the technology is still a basic fact and comes first", () => {
    expect(map(ways[1]!).next).toEqual({ step: "gather facts", facts: ["technology"] });
  });
  test("yes: Violet is called, with D-3, and it points to water by itself", () => {
    for (const facts of ways) {
      const m = map({ ...facts, ...home("yes") });
      expect(violet(m)).toEqual({ agent: "violet", called: true, introduce: true });
      expect(water(m)).toMatchObject({ methods: ["vwba-d3"] });
      const unread = { ...likely({ ...facts, ...home("yes") }), pathways: {}, agents: {} };
      expect(water(agentMap({ place: "free-site", record: unread, reads }))).toMatchObject({ inPlay: true, because: "project facts" });
    }
  });
  test("no, and not sure: the pathway stays in play with no calculator agent, and nobody is asked again", () => {
    for (const [answer, because] of [["no", "another kind of project"], ["not sure", "not covered yet"]] as const) {
      const m = map({ ...label(NEW_SUPPLY), ...home(answer) });
      expect(violet(m)).toEqual({ agent: "violet", called: false, because });
      expect(water(m)).toMatchObject({ inPlay: true, agent: null, methods: [], noMethod: because });
      expect(m.next).toEqual({ step: "call", agent: "calvin" });
    }
    expect(waterNotCovered({ ...label(NEW_SUPPLY), ...home("not sure") })).toBe(NEW_SUPPLY);
    expect(waterNotCovered({ ...label(NEW_SUPPLY), ...home("no") })).toBeNull();
  });
  test("it is not asked before Phoebe is done, where water is unlikely, on a site without Violet, or of any other project", () => {
    const unread = { ...likely(label(NEW_SUPPLY)), pathways: {}, agents: {} };
    expect(agentMap({ place: "free-site", record: unread, reads }).next).toEqual({ step: "call", agent: "phoebe" });
    expect(water(agentMap({ place: "free-site", record: unread, reads })).inPlay).toBe(false);
    const unlikely = likely(label(NEW_SUPPLY));
    unlikely.pathways.vwba = read("unlikely");
    expect(agentMap({ place: "free-site", record: unlikely, reads }).next).toEqual({ step: "call", agent: "calvin" });
    expect(map(label(NEW_SUPPLY), { crew: ["wellington", "phoebe", "bridget", "calvin"] }).next).toEqual({ step: "call", agent: "calvin" });
    for (const words of [...SUPPLIES, ...TREATMENT]) expect(needsHomeUse(label(words)), words).toBe(false);
    expect([needsHomeUse({}), needsHomeUse(type("C-12")), needsHomeUse(type("C-19"))]).toEqual([false, false, false]);
  });
  test("a community supply's own label has already said it, and a plain no still counts", () => {
    expect(recordWaterSupply({ ...label("Community water supply"), ...type("C-11") })).toBe("covered");
    expect(recordWaterSupply({ ...label("Community water supply"), ...type("C-11"), ...home("no") })).toBe("another kind of project");
  });
  test("Wellington adds it once, and only a word on the list", () => {
    const { record, added } = addGivenFacts(emptyRecord(), "wellington", { homeUse: "yes" });
    expect([record.facts.homeUse?.value, added]).toEqual(["yes", ["homeUse"]]);
    expect(addGivenFacts(record, "violet", { homeUse: "no" }).record.facts.homeUse?.value).toBe("yes");
    expect(addGivenFacts(emptyRecord(), "wellington", { homeUse: "maybe" as HomeUse }).dropped).toEqual(["homeUse"]);
    expect(HOME_USES).toEqual(["yes", "no", "not sure"]);
  });
});

describe("treatment is not covered yet", () => {
  test.each(TREATMENT)("%s: the pathway stays in play with no calculator agent", (words) => {
    const m = map(label(words));
    expect(violet(m)).toEqual({ agent: "violet", called: false, because: "not covered yet" });
    expect(water(m)).toMatchObject({ reading: "likely", inPlay: true, agent: null, methods: [], noMethod: "not covered yet" });
    expect(stepOf(m, "violet")).toBeNull();
  });
  test.each(["HWT", "IWT", "CWT"] as const)("a drinking-water type with class %s", (c) => {
    expect(violet(map({ ...type("C-19"), technologyClass: { value: c, source: by } }))).toMatchObject({ because: "not covered yet" });
  });
  test("two facts that disagree are not sure, so no calculator yet", () => {
    expect(recordWaterSupply({ ...label("Community water supply"), ...type("C-19"), technologyClass: { value: "CWT", source: by } })).toBe("not covered yet");
  });
  test("a code saved before the rule does not make treatment a supply", () => {
    expect(recordWaterSupply({ technology: { label: "Community level water treatment technologies", code: "CWS", source: by } })).toBe("not covered yet");
  });
  test("a label the list does not know, with no code or the treatment code", () => {
    for (const code of [undefined, "HWT"] as const) {
      expect(recordWaterSupply({ technology: { label: "A label nobody has sent yet", ...(code ? { code } : {}), source: by } })).toBe("not covered yet");
    }
  });
  test("a saved project on the paid site is the same, and Calvin is still called", () => {
    const m = map(label("Household water treatment"), { place: "paid-site", saved: true });
    expect(violet(m)).toMatchObject({ called: false, because: "not covered yet" });
    expect(m.agents.find((a) => a.agent === "calvin")).toMatchObject({ called: true });
  });
});

describe("another kind of project", () => {
  test.each(PROJECT_TYPE_IDS.filter((t) => t !== "C-11" && t !== "C-19"))("%s: the pathway stays in play with no calculator agent", (id) => {
    for (const facts of [type(id), { ...type(id), ...label("Community water supply") }]) {
      const m = map(facts);
      expect(violet(m)).toEqual({ agent: "violet", called: false, because: "another kind of project" });
      expect(water(m)).toMatchObject({ inPlay: true, agent: null, methods: [], noMethod: "another kind of project" });
    }
  });
  test("a technology that is neither a supply nor treatment", () => {
    expect(recordWaterSupply({ technology: { label: "A label nobody has sent yet", code: "other", source: by } })).toBe("another kind of project");
  });
  test("only water likely: Bridget works, there is no Quantify step, and the report comes next", () => {
    const record = likely(type("C-12"));
    record.facts.technology = { label: "A label nobody has sent yet", source: by };
    record.pathways.carbon = read("unlikely");
    const m = agentMap({ place: "free-site", record, reads });
    expect(m.agents.filter((a) => a.called).map((a) => a.agent)).toEqual(["wellington", "bridget"]);
    expect(m.steps.map((x) => x.id)).toEqual(["eligibility", "partners"]);
    expect(m.next).toEqual({ step: "report or sign-up" });
  });
});

describe("what does not change", () => {
  test("while the facts do not say yet, she waits for them and is still ahead", () => {
    const m = map(type("C-19"));
    expect(violet(m)).toEqual({ agent: "violet", called: false, because: "waiting for basic facts" });
    expect(water(m)).toMatchObject({ agent: "violet", methods: [], noMethod: "waiting for basic facts" });
    expect(stepOf(m, "violet")).not.toBeNull();
  });
  test("an unlikely reading still gives its own reason, and the visitor may still open her", () => {
    const record = likely(label("Household water treatment"));
    record.pathways.vwba = read("unlikely");
    const m = agentMap({ place: "free-site", record, reads });
    expect(violet(m)).toMatchObject({ because: "pathway unlikely" });
    expect(m.tellVisitor).toEqual([expect.objectContaining({ pathway: "vwba", inAgentCommons: "violet" })]);
  });
  test("in the Agent Commons and at MCP she opens alone, as before", () => {
    for (const place of ["agent-commons", "mcp"] as const) {
      expect(agentMap({ place, opened: "violet", record: likely(label("Household water treatment")) }).pathways).toEqual([expect.objectContaining({ pathway: "vwba", agent: "violet", methods: ["vwba-d3"] })]);
    }
  });
  test("the carbon methods, and a pathway nobody covers", () => {
    for (const facts of [label("Household water treatment"), type("C-12"), {}]) {
      expect(methodsFor("carbon", true, facts)).toEqual(["carbon-v2.0", "carbon-v1.0", "carbon-transition"]);
      for (const p of ["carbon", "wqba", "wash-ba"] as const) expect(noMethodFor(p, facts)).toBeNull();
    }
    expect(methodsFor("vwba", false)).toEqual(["vwba-d3"]);
    expect(METHODS.filter((m) => m.counts !== undefined).map((m) => m.id)).toEqual(["vwba-d3"]);
    expect(FACT_RULES.find((r) => r.pathway === "vwba")!.source).toContain("pp.37 to 39");
  });
});

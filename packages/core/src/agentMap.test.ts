// The agent map: a test for each of its rules. Every project here is made up.
import { describe, expect, test } from "vitest";
import { AGENT_MAP_VERSION, METHODS, agentMap, stepOf, type AgentCall, type AgentMap, type MapInput } from "./agentMap";
import { emptyRecord, type AgentId, type PathwayReading, type ProjectRecord, type Reading } from "./record";
import type { StandardId } from "./standards";

const by = { by: "person", note: "made up for a test" } as const;
const phoebe = { by: "phoebe", note: "made up for a test" } as const;

/** A made-up project with the basic facts in. */
function project(extra: Partial<ProjectRecord> = {}): ProjectRecord {
  const r = emptyRecord();
  r.facts.technology = { label: "Household water treatment", code: "HWT", source: by };
  r.place.country = { value: "XKX", source: by };
  return { ...r, ...extra };
}
/** The same made-up project, as a supply: the kind Violet is called for. */
function supply(extra: Partial<ProjectRecord> = {}): ProjectRecord {
  const r = project(extra);
  r.facts.technology = { label: "Community water supply", code: "CWS", source: by };
  return r;
}
const read = (reading: Reading): PathwayReading => ({
  reading,
  reason: `made-up reason for ${reading}`,
  wouldChange: `made-up change for ${reading}`,
  source: phoebe,
});
/** Readings for every pathway: the ones named, and "unlikely" for the rest. */
const readings = (named: Partial<Record<StandardId, Reading>>): ProjectRecord["pathways"] => ({
  carbon: read(named.carbon ?? "unlikely"),
  vwba: read(named.vwba ?? "unlikely"),
  wqba: read(named.wqba ?? "unlikely"),
  "wash-ba": read(named["wash-ba"] ?? "unlikely"),
});
const call = (map: AgentMap, agent: AgentId): AgentCall => map.agents.find((a) => a.agent === agent)!;
const called = (map: AgentMap): AgentId[] => map.agents.filter((a) => a.called).map((a) => a.agent);
const pathway = (map: AgentMap, p: StandardId) => map.pathways.find((x) => x.pathway === p)!;

describe("rule 1: on the sites, Wellington leads", () => {
  for (const place of ["free-site", "paid-site"] as const) {
    test(`${place}: Wellington is always called, with or without a record`, () => {
      expect(call(agentMap({ place }), "wellington").called).toBe(true);
      expect(call(agentMap({ place, record: project({ pathways: readings({}) }) }), "wellington").called).toBe(true);
    });
  }
});

describe("rule 2: in the Agent Commons and through MCP, the one agent opened works alone", () => {
  test("only the opened agent is called, and an unlikely reading hides nothing", () => {
    const record = project({ pathways: readings({ carbon: "unlikely" }) });
    const map = agentMap({ place: "agent-commons", opened: "calvin", record });
    expect(called(map)).toEqual(["calvin"]);
    expect(map.pathways).toEqual([
      expect.objectContaining({ pathway: "carbon", inPlay: true, because: "opened by the user", methods: ["carbon-v2.0"] }),
    ]);
    expect(map.tellVisitor).toEqual([]);
    expect(map.next).toEqual({ step: "work alone", agent: "calvin" });
  });
  test("in the Agent Commons an agent introduces itself; a tool called through MCP does not", () => {
    expect(call(agentMap({ place: "agent-commons", opened: "violet" }), "violet")).toEqual({ agent: "violet", called: true, introduce: true });
    expect(call(agentMap({ place: "mcp", opened: "violet" }), "violet")).toEqual({ agent: "violet", called: true, introduce: false });
  });
  test("there is no Wellington at MCP", () => {
    const map = agentMap({ place: "mcp", opened: "wellington" });
    expect(called(map)).toEqual([]);
    expect(map.next).toEqual({ step: "choose an agent" });
  });
  test("with no agent opened yet, the next step is to choose one", () => {
    expect(agentMap({ place: "agent-commons" }).next).toEqual({ step: "choose an agent" });
  });
  test("Calvin's Commons choice sets the transition in his temporary record, and the legacy calculator comes with it", () => {
    const record = emptyRecord();
    record.facts.creditedUnderV1 = { value: true, source: by };
    expect(pathway(agentMap({ place: "agent-commons", opened: "calvin", record }), "carbon").methods).toEqual([
      "carbon-v2.0",
      "carbon-v1.0",
      "carbon-transition",
    ]);
  });
});

describe("rule 3: the eligibility agent is called once the basic facts are in, while a pathway has no reading", () => {
  test("with a basic fact blank, Phoebe waits and Wellington gathers it", () => {
    const map = agentMap({ place: "free-site", record: emptyRecord() });
    expect(call(map, "phoebe")).toEqual({ agent: "phoebe", called: false, because: "waiting for basic facts" });
    // Nobody is asked for a kind: the basic facts are the source, the treatment and the country (2026-11-25).
    expect(map.next).toEqual({ step: "gather facts", facts: ["waterSource", "treatment", "country"] });
  });
  test("with the basic facts in and no readings, Phoebe is called next", () => {
    const map = agentMap({ place: "free-site", record: project() });
    expect(call(map, "phoebe").called).toBe(true);
    expect(map.next).toEqual({ step: "call", agent: "phoebe" });
  });
  test("once every pathway has a reading, Phoebe is not called again", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "likely" }) }) });
    expect(call(map, "phoebe")).toEqual({ agent: "phoebe", called: false, because: "every pathway has a reading" });
  });
});

describe("rule 4: on likely or more to learn, the pathway's calculator agent is called and shows", () => {
  // SWITCHED OFF 2026-11-24, never deleted: it expects a later agent to be called before the agent before it has finished.
  // That changed on 2026-11-24. The tests at the end of this file hold the new rule.
  test.skip("likely carbon calls Calvin", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "likely" }) }) });
    expect(call(map, "calvin").called).toBe(true);
    expect(pathway(map, "carbon")).toEqual(expect.objectContaining({ inPlay: true, moreToLearn: false, agent: "calvin" }));
  });
  // SWITCHED OFF 2026-11-24, never deleted: it expects a later agent to be called before the agent before it has finished.
  // That changed on 2026-11-24. The tests at the end of this file hold the new rule.
  test.skip("more to learn on water calls Violet, with the flag", () => {
    const map = agentMap({ place: "paid-site", record: project({ pathways: readings({ vwba: "more to learn" }) }) });
    expect(call(map, "violet").called).toBe(true);
    expect(pathway(map, "vwba")).toEqual(expect.objectContaining({ inPlay: true, moreToLearn: true, methods: ["vwba-d3"] }));
  });
  test("a pathway with no calculator agent yet is in play, with no agent and no method", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({ wqba: "likely" }) }) });
    expect(pathway(map, "wqba")).toEqual(expect.objectContaining({ inPlay: true, agent: null, methods: [] }));
  });
});

describe("rule 5: on unlikely, the agent is not called, and the visitor is told what would change it", () => {
  test("an unlikely water reading keeps Violet out, though the technology points to water (W2)", () => {
    const record = project({ pathways: readings({ carbon: "likely", vwba: "unlikely" }) });
    record.facts.technology = { label: "Community water supply", code: "CWS", source: by };
    const map = agentMap({ place: "free-site", record });
    expect(call(map, "violet")).toEqual({ agent: "violet", called: false, because: "pathway unlikely" });
    expect(pathway(map, "vwba")).toEqual(expect.objectContaining({ inPlay: false, methods: [] }));
    expect(map.tellVisitor).toContainEqual({
      pathway: "vwba",
      reason: "made-up reason for unlikely",
      wouldChange: "made-up change for unlikely",
      inAgentCommons: "violet",
    });
  });
});

describe("rule 6: one entry for each carbon method, and the legacy calculator for a transitioning project", () => {
  test("the table holds V2.0, V1.0 and the transition, each run by Calvin", () => {
    expect(METHODS.filter((m) => m.pathway === "carbon").map((m) => [m.id, m.agent])).toEqual([
      ["carbon-v2.0", "calvin"],
      ["carbon-v1.0", "calvin"],
      ["carbon-transition", "calvin"],
    ]);
  });
  test("a new project gets V2.0 only", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "likely" }) }) });
    expect(pathway(map, "carbon").methods).toEqual(["carbon-v2.0"]);
  });
  test("a transitioning project also sees the legacy calculator", () => {
    const record = project({ pathways: readings({ carbon: "likely" }) });
    record.facts.creditedUnderV1 = { value: true, source: by };
    expect(pathway(agentMap({ place: "paid-site", record }), "carbon").methods).toEqual(["carbon-v2.0", "carbon-v1.0", "carbon-transition"]);
  });
});

describe("rule 7: Bridget is called when at least one pathway is in play", () => {
  test("in play: called", () => {
    expect(call(agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "more to learn" }) }) }), "bridget").called).toBe(true);
  });
  test("nothing in play yet: not called", () => {
    expect(call(agentMap({ place: "free-site", record: project() }), "bridget")).toEqual({
      agent: "bridget",
      called: false,
      because: "no pathway in play yet",
    });
  });
});

describe("rule 8: with no pathway forward, Wellington points to the WaterBots team", () => {
  test("every reading unlikely: Bridget and the calculator agents are not called", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({}) }) });
    expect(called(map)).toEqual(["wellington"]);
    for (const a of ["bridget", "calvin", "violet"] as const) {
      expect(call(map, a)).toEqual({ agent: a, called: false, because: "no pathway forward" });
    }
    expect(map.next).toEqual({ step: "point to the WaterBots team" });
    expect(map.tellVisitor).toHaveLength(4);
  });
});

describe("rule 9: worked out from facts, and worked out again when a fact changes", () => {
  test("the same record and place always give the same answer, and the map changes nothing it is handed", () => {
    const record = project({ pathways: readings({ carbon: "likely", vwba: "more to learn" }) });
    const frozen = JSON.stringify(record);
    const input: MapInput = { place: "paid-site", record, met: ["wellington"] };
    expect(agentMap(input)).toEqual(agentMap(input));
    expect(JSON.stringify(record)).toBe(frozen);
  });
  // SWITCHED OFF 2026-11-24, never deleted: it expects a later agent to be called before the agent before it has finished.
  // That changed on 2026-11-24. The tests at the end of this file hold the new rule.
  test.skip("when a reading changes, nothing is kept from before", () => {
    const before = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "likely" }) }) });
    const after = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "unlikely", vwba: "likely" }) }) });
    expect(called(before)).toEqual(["wellington", "bridget", "calvin"]);
    expect(called(after)).toEqual(["wellington", "bridget", "violet"]);
  });
  test("every answer carries the map's version", () => {
    expect(agentMap({ place: "free-site" }).mapVersion).toBe(AGENT_MAP_VERSION);
  });
});

describe("the lobby chat: only Wellington, no record, nothing calculated", () => {
  test("he answers questions, with the doors he may point to when that helps, whatever record is handed in", () => {
    const map = agentMap({ place: "lobby-chat", record: project({ pathways: readings({ carbon: "likely" }) }) });
    expect(called(map)).toEqual(["wellington"]);
    expect(map.pathways).toEqual([]);
    expect(map.tellVisitor).toEqual([]);
    expect(map.next).toEqual({ step: "answer questions", doors: ["free-site", "paid-site", "agent-commons"] });
  });});

describe("facts that point to a pathway, before it has a reading (the two rules this repo can cite)", () => {
  // SWITCHED OFF 2026-11-24, never deleted: it expects a later agent to be called before the agent before it has finished.
  // That changed on 2026-11-24. The tests at the end of this file hold the new rule.
  test.skip("a community water supply puts water in play, with more to learn", () => {
    const record = project();
    record.facts.technology = { label: "Community water supply", code: "CWS", source: by };
    const map = agentMap({ place: "free-site", record });
    expect(pathway(map, "vwba")).toEqual(expect.objectContaining({ inPlay: true, moreToLearn: true, because: "project facts" }));
    expect(call(map, "violet").called).toBe(true);
    expect(map.next).toEqual({ step: "call", agent: "phoebe" });
  });
  test("a project credited under V1.0 puts carbon in play", () => {
    const record = project();
    record.facts.creditedUnderV1 = { value: true, source: by };
    expect(pathway(agentMap({ place: "free-site", record }), "carbon")).toEqual(
      expect.objectContaining({ inPlay: true, because: "project facts" }),
    );
  });
  test("household water treatment alone puts nothing in play: those rules have no source yet", () => {
    expect(agentMap({ place: "free-site", record: project() }).pathways.every((p) => !p.inPlay)).toBe(true);
  });
});

describe("introductions (agent rule 17) and the order of the next steps", () => {
  // SWITCHED OFF 2026-11-24, never deleted: it expects a later agent to be called before the agent before it has finished.
  // That changed on 2026-11-24. The tests at the end of this file hold the new rule.
  test.skip("an agent already met is not introduced again", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "likely" }) }), met: ["calvin"] });
    expect(call(map, "calvin")).toEqual({ agent: "calvin", called: true, introduce: false });
    expect(call(map, "bridget")).toEqual({ agent: "bridget", called: true, introduce: true });
  });
  test("once a project is saved on the paid site, nobody is introduced", () => {
    const map = agentMap({ place: "paid-site", record: project({ pathways: readings({ carbon: "likely" }) }), saved: true });
    expect(map.agents.filter((a) => a.called).every((a) => a.called && !a.introduce)).toBe(true);
  });
  // SWITCHED OFF 2026-11-24, never deleted: it expects Violet to be called for household treatment. The maintainer ruled on
  // 2026-11-24 that she is called for supplies only. `waterSupply.test.ts` holds the new rule.
  test.skip("Bridget, then Calvin, then Violet, then the report or sign-up", () => {
    const record = project({ pathways: readings({ carbon: "likely", vwba: "likely" }) });
    expect(agentMap({ place: "free-site", record }).next).toEqual({ step: "call", agent: "bridget" });
    record.agents.bridget = { done: true };
    expect(agentMap({ place: "free-site", record }).next).toEqual({ step: "call", agent: "calvin" });
    record.agents.calvin = { done: true };
    expect(agentMap({ place: "free-site", record }).next).toEqual({ step: "call", agent: "violet" });
    record.agents.violet = { done: true };
    expect(agentMap({ place: "free-site", record }).next).toEqual({ step: "report or sign-up" });
  });
});

describe("a site that reads two of the four pathways", () => {
  const reads = ["carbon", "vwba"] as const;
  const two = (carbon: Reading, vwba: Reading) => project({ pathways: { carbon: read(carbon), vwba: read(vwba) } });
  test("the map asks only about those two, and the eligibility agent is done once both are read", () => {
    const map = agentMap({ place: "free-site", record: two("likely", "unlikely"), reads });
    expect(map.pathways.map((p) => p.pathway)).toEqual(["carbon", "vwba"]);
    expect(call(map, "phoebe")).toEqual({ agent: "phoebe", called: false, because: "every pathway has a reading" });
    expect(map.tellVisitor.map((t) => t.pathway)).toEqual(["vwba"]);
  });
  test("both unlikely: it reaches no pathway forward, though the other two were never read", () => {
    const record = two("unlikely", "unlikely");
    const map = agentMap({ place: "free-site", record, reads });
    expect(called(map)).toEqual(["wellington"]);
    expect(map.next).toEqual({ step: "point to the WaterBots team" });
    // Left alone, it waits for the other two.
    expect(agentMap({ place: "free-site", record }).next).toEqual({ step: "call", agent: "phoebe" });
  });
});

describe("a later agent is called only when the agent before it has finished (ruled 2026-11-24)", () => {
  const both = (extra: ProjectRecord["agents"] = {}) => supply({ pathways: readings({ carbon: "likely", vwba: "more to learn" }), agents: extra });
  const waiting = { called: false, because: "waiting for the agent before" };

  test("a community water supply, with nothing read yet: water is in play, and only Phoebe is called", () => {
    const record = project();
    record.facts.technology = { label: "Community water supply", code: "CWS", source: by };
    const map = agentMap({ place: "free-site", record });
    expect(pathway(map, "vwba")).toEqual(expect.objectContaining({ inPlay: true, moreToLearn: true, because: "project facts" }));
    expect(called(map)).toEqual(["wellington", "phoebe"]);
    for (const a of ["bridget", "violet"] as const) expect(call(map, a)).toMatchObject(waiting);
    expect(map.next).toEqual({ step: "call", agent: "phoebe" });
  });
  test("readings that show while Phoebe is still at work do not call anyone early", () => {
    const map = agentMap({ place: "free-site", record: both({ phoebe: { done: false } }) });
    expect(called(map)).toEqual(["wellington", "phoebe"]);
    expect(map.next).toEqual({ step: "call", agent: "phoebe" });
  });
  test("all unlikely while Phoebe is still at work: she finishes first, then Wellington points to the team", () => {
    const record = project({ pathways: readings({}), agents: { phoebe: { done: false } } });
    expect(called(agentMap({ place: "free-site", record }))).toEqual(["wellington", "phoebe"]);
    record.agents.phoebe = { done: true };
    expect(agentMap({ place: "free-site", record }).next).toEqual({ step: "point to the WaterBots team" });
  });
  test("Phoebe done: Bridget is called, and both calculators wait for her", () => {
    for (const agents of [{}, { phoebe: { done: true } }]) {
      const map = agentMap({ place: "paid-site", record: both(agents) });
      expect(called(map)).toEqual(["wellington", "bridget"]);
      for (const a of ["calvin", "violet"] as const) expect(call(map, a)).toMatchObject(waiting);
    }
  });
  test("Bridget done: Calvin and Violet are called together, and neither waits for the other", () => {
    for (const agents of [{}, { calvin: { done: true } }, { violet: { done: true } }, { calvin: { done: false } }]) {
      expect(called(agentMap({ place: "free-site", record: both({ bridget: { done: true }, ...agents }) }))).toEqual(["wellington", "bridget", "calvin", "violet"]);
    }
  });
  test("an unlikely pathway's agent is still not called, whoever has finished", () => {
    const record = project({ pathways: readings({ carbon: "likely" }), agents: { bridget: { done: true } } });
    expect(call(agentMap({ place: "free-site", record }), "violet")).toEqual({ agent: "violet", called: false, because: "pathway unlikely" });
  });
  test("when a reading changes, nothing is kept from before", () => {
    const at = (named: Partial<Record<StandardId, Reading>>) => called(agentMap({ place: "free-site", record: supply({ pathways: readings(named), agents: { bridget: { done: true } } }) }));
    expect(at({ carbon: "likely" })).toEqual(["wellington", "bridget", "calvin"]);
    expect(at({ carbon: "unlikely", vwba: "likely" })).toEqual(["wellington", "bridget", "violet"]);
  });
  test("an agent already met is not introduced again", () => {
    const map = agentMap({ place: "free-site", record: both({ bridget: { done: true } }), met: ["calvin"] });
    expect(call(map, "calvin")).toEqual({ agent: "calvin", called: true, introduce: false });
    expect(call(map, "violet")).toEqual({ agent: "violet", called: true, introduce: true });
  });
  test("a site without an agent: it is never called, and nobody waits for it", () => {
    const map = agentMap({ place: "paid-site", record: both(), crew: ["wellington", "calvin"] });
    expect(called(map)).toEqual(["wellington", "calvin"]);
    expect(call(map, "bridget")).toEqual({ agent: "bridget", called: false, because: "not at this place" });
  });
  test("a saved project on the paid site: the walk is over, so nobody waits", () => {
    expect(called(agentMap({ place: "paid-site", record: both(), saved: true }))).toEqual(["wellington", "bridget", "calvin", "violet"]);
  });
  test("in the Agent Commons and at MCP the one agent opened waits for nobody", () => {
    for (const place of ["agent-commons", "mcp"] as const) expect(called(agentMap({ place, opened: "violet" }))).toEqual(["violet"]);
  });
});

describe("the steps this project has", () => {
  const steps = (map: AgentMap) => map.steps.map((x) => [x.number, x.of, x.name, x.agents]);
  test("Step 1 Eligibility, Step 2 Partners, Step 3 Quantify; Calvin and Violet share the last", () => {
    const map = agentMap({ place: "free-site", record: supply({ pathways: readings({ carbon: "likely", vwba: "likely" }) }) });
    expect(steps(map)).toEqual([
      [1, 3, "Eligibility", ["phoebe"]],
      [2, 3, "Partners", ["bridget"]],
      [3, 3, "Quantify", ["calvin", "violet"]],
    ]);
    expect(stepOf(map, "calvin")).toEqual(stepOf(map, "violet"));
    expect(stepOf(map, "phoebe")).toMatchObject({ number: 1, of: 3 });
    expect(stepOf(map, "wellington")).toBeNull();
  });
  test("before anything is read, all three are ahead", () => {
    expect(steps(agentMap({ place: "free-site" })).map((x) => x[2])).toEqual(["Eligibility", "Partners", "Quantify"]);
  });
  test("one pathway unlikely: its agent is not in the last step", () => {
    const map = agentMap({ place: "free-site", record: project({ pathways: readings({ carbon: "likely" }) }) });
    expect(map.steps.at(-1)).toMatchObject({ id: "quantify", agents: ["calvin"] });
    expect(stepOf(map, "violet")).toBeNull();
  });
  test("no calculator agent for the pathway in play: two steps", () => {
    expect(steps(agentMap({ place: "free-site", record: project({ pathways: readings({ wqba: "likely" }) }) }))).toEqual([
      [1, 2, "Eligibility", ["phoebe"]],
      [2, 2, "Partners", ["bridget"]],
    ]);
  });
  test("no pathway forward: one step", () => {
    expect(steps(agentMap({ place: "free-site", record: project({ pathways: readings({}) }) }))).toEqual([[1, 1, "Eligibility", ["phoebe"]]]);
  });
  test("a site without an agent has no step for it, and the numbers run on", () => {
    const map = agentMap({ place: "paid-site", record: project({ pathways: readings({ carbon: "likely" }) }), crew: ["wellington", "phoebe", "calvin"] });
    expect(steps(map)).toEqual([
      [1, 2, "Eligibility", ["phoebe"]],
      [2, 2, "Quantify", ["calvin"]],
    ]);
  });
  test("where one agent works alone, and in the lobby chat, there are none", () => {
    for (const input of [{ place: "agent-commons", opened: "calvin" }, { place: "mcp", opened: "violet" }, { place: "lobby-chat" }] as const) expect(agentMap(input).steps).toEqual([]);
  });
});

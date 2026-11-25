// She refuses the same projects at every door (ruled by the maintainer on 2026-11-24). Every project here is made up.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { addGivenFacts, emptyRecord, recordWaterSupply, type ProjectRecord } from "@waterbots/core/record";
import { addVioletAnswer, fillViolet, readVioletAnswer, violetAsks, violetChatContext, violetPageContext } from "./agent/chat.js";
import { computeD3Tool, parseD3Input } from "./agent/tools.js";
import { computeD3 } from "./d3/compute.js";
import type { D3Input } from "./d3/types.js";
import { addVioletFacts, d3InputFromRecord } from "./record.js";
import D3Screen from "./screen/D3Screen.js";
import { useD3State, type D3State, type D3StateOptions } from "./screen/useD3State.js";
import { D3_TECHNOLOGIES, d3Stop, d3StopMessage, d3Technology, kindFacts, readKind, type D3Technology } from "./supply.js";

const people: D3Input = { view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 }, accessLevel: "full", withoutProjectM3PerYear: 0 };
const TREATMENT = [
  ["HWT", "Household water treatment technologies"],
  ["CWT", "Community level water treatment technologies"],
  ["IWT", "Institutional water treatment technologies"],
] as const;
const refused = (label: string): string => `“${label}” is not covered yet.`;
function record(kind: { technology?: D3Technology; homeUse?: "yes" | "no" | "not sure" }): ProjectRecord {
  const given = { name: "Invented project", population: { mode: "people", served: 1200 } as const, accessLevel: "full" as const, withoutProjectM3PerYear: 0 };
  return addGivenFacts(emptyRecord(), "wellington", { ...given, ...(kind.technology ? { technology: d3Technology(kind.technology) } : {}), ...(kind.homeUse ? { homeUse: kind.homeUse } : {}) }).record;
}
function mount(options: D3StateOptions): { state: D3State; html: string } {
  let state!: D3State;
  function Host() {
    state = useD3State(options);
    return <D3Screen state={state} {...(options.place !== undefined ? { place: options.place } : {})} />;
  }
  return { html: renderToStaticMarkup(<Host />), state };
}

describe("her tool, in the Agent Commons and at MCP", () => {
  it.each(TREATMENT)("%s is refused, in the words Calvin's tools use", (technology, label) => {
    expect(() => computeD3Tool.execute({ technology, ...people })).toThrow(refused(label));
    // Home use does not make treatment a supply.
    expect(() => computeD3Tool.execute({ technology, homeUse: "yes", ...people })).toThrow(refused(label));
  });
  it("a missing or made-up kind of project is asked for, never guessed", () => {
    for (const technology of [undefined, "other", "C-12", 1]) expect(() => computeD3Tool.execute({ ...people, technology })).toThrow(/technology is a project fact .* it is missing/);
  });
  it("a new or alternative supply needs home use, and only a yes gives a figure", async () => {
    const label = "New or alternative water supply";
    expect(() => computeD3Tool.execute({ technology: "C-11", ...people })).toThrow(/homeUse is a project fact .* it is missing/);
    expect(() => computeD3Tool.execute({ technology: "C-11", homeUse: "perhaps", ...people })).toThrow(/homeUse is a project fact/);
    expect(() => computeD3Tool.execute({ technology: "C-11", homeUse: "no", ...people })).toThrow(`“${label}” is covered only where people use the water at home.`);
    expect(() => computeD3Tool.execute({ technology: "C-11", homeUse: "not sure", ...people })).toThrow(refused(label));
    expect(((await computeD3Tool.execute({ technology: "C-11", homeUse: "yes", ...people })).output as { vwbM3PerYear: number }).vwbM3PerYear).toBe(8760);
  });
  it("the figure is the engine's, and the engine is told only what it counts", async () => {
    expect(parseD3Input({ technology: "CWS", homeUse: "yes", ...people })).toEqual(people);
    const { blankOrAssumed: _notes, ...rest } = (await computeD3Tool.execute({ technology: "CWS", ...people })).output as Record<string, unknown>;
    expect(rest).toEqual(computeD3(people));
  });
  it("its shape asks for the kind of project", () => {
    const schema = computeD3Tool.inputSchema as { required: string[]; properties: Record<string, { enum?: string[] }> };
    expect(schema.required).toEqual(["technology", "view", "option"]);
    expect(schema.properties.technology!.enum).toEqual(["HWT", "IWT", "CWT", "CWS", "C-11"]);
    expect(schema.properties.homeUse!.enum).toEqual(["yes", "no", "not sure"]);
  });
});

describe("her chat", () => {
  const keys = (r: ProjectRecord): string[] => violetAsks(d3InputFromRecord(r, "ex-ante"), true, r.facts).map((a) => a.key);
  it("asks for the kind of project first, then home use only where it matters", () => {
    expect(violetAsks({ view: "ex-ante", option: "beneficiaries" }, false, {}).map((a) => a.key).slice(0, 2)).toEqual(["technology", "option"]);
    expect(keys(record({ technology: "C-11" }))).toEqual(["homeUse"]);
    expect(keys(record({ technology: "C-11", homeUse: "yes" }))).toEqual([]);
    expect(keys(record({ technology: "CWS" }))).toEqual([]);
  });
  it("for a project she does not count, she asks for nothing", () => {
    for (const [technology] of TREATMENT) expect(keys(record({ technology }))).toEqual([]);
    for (const homeUse of ["no", "not sure"] as const) expect(keys(record({ technology: "C-11", homeUse }))).toEqual([]);
  });
  it("in the Agent Commons the hook asks for it with no record, and a site's record is not asked again", () => {
    expect(mount({ place: "agent-commons" }).state.asks[0]?.key).toBe("technology");
    expect(mount({ place: "free-site", record: record({ technology: "CWS" }) }).state.asks.map((a) => a.key)).toEqual(["option"]);
    expect(mount({}).state.asks[0]?.key).toBe("option");
  });
  it("an answer's kind of project and home use go to the record, once", () => {
    const reply = readVioletAnswer({ reply: "Thanks.", facts: { technology: "C-11", homeUse: "yes" } })!;
    expect(reply.facts).toEqual({ technology: { label: "New or alternative water supply" }, homeUse: "yes" });
    const { record: next, added } = addVioletFacts(emptyRecord(), reply.facts);
    expect(added.sort()).toEqual(["homeUse", "technology"]);
    expect(recordWaterSupply(next.facts)).toBe("covered");
    expect(readVioletAnswer({ reply: "Thanks.", facts: { technology: "HWT" } })!.facts).toEqual({ technology: { label: "Household water treatment technologies", code: "HWT" } });
    expect(readVioletAnswer({ reply: "Thanks.", facts: { technology: "a pump", homeUse: true } })!.facts).toEqual({});
    expect(readKind(null)).toEqual({});
  });
  it("the block for a turn says it is not covered yet, gives no figure and never says her part is done", () => {
    const r = record({ technology: "HWT" });
    const input = d3InputFromRecord(r, "ex-ante");
    const block = violetChatContext({ place: "agent-commons", projectName: "Invented project", input, result: computeD3(input), chosen: true, facts: r.facts });
    expect(block).toContain('"Household water treatment technologies", which is not covered yet');
    expect(block).toContain("There are NO figures on this screen");
    expect(block).not.toMatch(/8,760|Your part is done|Values you do not ask for/);
    const supply = record({ technology: "CWS" });
    expect(violetChatContext({ place: "free-site", projectName: "Invented project", input, result: computeD3(input), chosen: true, facts: supply.facts })).toMatch(/Kind of project: Community water supply technologies[\s\S]*Your part is done/);
  });
  it("what she sees, for each reason", () => {
    const see = (kind: Parameters<typeof record>[0]): string => violetPageContext({ projectName: "Invented project", input: people, result: computeD3(people), facts: record(kind).facts });
    expect(see({ technology: "C-11" })).toContain("has not been said yet");
    expect(see({ technology: "C-11", homeUse: "no" })).toContain("another kind of project");
    expect(see({ technology: "CWS" })).toContain("8,760");
  });
  it("no figure goes on the record for a project she does not count", () => {
    const r = record({ technology: "CWT" });
    expect(addVioletAnswer(r, fillViolet(people, {})).record.agents.violet?.estimate).toBeUndefined();
    const ok = record({ technology: "CWS" });
    expect(addVioletAnswer(ok, fillViolet(people, {})).record.agents.violet?.estimate?.figure).toBe(8760);
  });
});

describe("her screen", () => {
  it.each(TREATMENT)("%s: the sentence, and nothing to fill in", (technology, label) => {
    const { html, state } = mount({ place: "agent-commons", record: record({ technology }) });
    expect(html).toContain(`can&#x27;t run for this project yet. ${refused(label)}`);
    expect(html).not.toMatch(/8,760|<input|<button/);
    expect(state.kept).toEqual([]);
    expect(state.fill({ accessLevel: "limited" })).toMatchObject({ filled: [], refused: [] });
  });
  it("home use not given, or no: no figure", () => {
    for (const kind of [{ technology: "C-11" }, { technology: "C-11", homeUse: "no" }] as const) {
      const { html } = mount({ place: "agent-commons", record: record(kind) });
      expect(html).toContain("can&#x27;t run for this project yet.");
      expect(html).not.toContain("8,760");
    }
  });
  it("a supply works as before, and so does a screen that is told no kind of project", () => {
    for (const kind of [{ technology: "CWS" }, { technology: "C-11", homeUse: "yes" }, {}] as const) expect(mount({ place: "free-site", record: record(kind) }).html).toContain("8,760");
    expect(mount({ project: { name: "Invented project", standards: [], population: { mode: "people", served: 10 } } }).state.stop).toBeNull();
  });
});

it("every kind of project is on core's list, and the stop is core's answer", () => {
  for (const t of D3_TECHNOLOGIES) {
    expect(d3Technology(t).label.length).toBeGreaterThan(0);
    const facts = kindFacts({ technology: t });
    expect(d3Stop(facts) === null).toBe(recordWaterSupply(facts) === "covered");
  }
  expect(d3Stop({})).toBeNull();
  expect(d3StopMessage({ because: "not covered yet", label: null })).toBe("The calculator can't run for this project yet.");
});

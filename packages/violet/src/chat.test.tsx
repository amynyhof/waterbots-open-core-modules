// Violet's chat (J5): what she asks, what she keeps, how an answer fills her screen, and what she sees. Invented projects.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { agentMap } from "@waterbots/core/agentMap";
import { REPLY_LIMIT, readingGrade } from "@waterbots/core/reply";
import { emptyRecord, type ProjectRecord } from "@waterbots/core/record";
import { VIOLET_ANSWER_SCHEMA, VIOLET_CHAT, VIOLET_OPENED, addVioletAnswer, fillViolet, readVioletAnswer, setVioletDone, violetAsks, violetChatContext, violetKept, violetPageContext } from "./agent/chat.js";
import { computeD3 } from "./d3/compute.js";
import { violetCall } from "./doors.js";
import { d3InputFromRecord } from "./record.js";
import D3Screen from "./screen/D3Screen.js";
import { useD3State, type D3State, type D3StateOptions } from "./screen/useD3State.js";
import type { D3Input } from "./d3/types.js";

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const keys = (input: D3Input, chosen = true): string[] => violetAsks(input, chosen).map((a) => a.key);
const by = { by: "site intake", note: "invented" } as const;
function record(): ProjectRecord {
  const r = emptyRecord();
  r.facts.name = "Invented project";
  r.facts.population = { value: { mode: "people", served: 1200 }, source: by };
  return r;
}
function mount(options: D3StateOptions): { state: D3State; html: string } {
  let state!: D3State;
  function Host() {
    state = useD3State(options);
    return <D3Screen state={state} {...(options.place !== undefined ? { place: options.place } : {})} />;
  }
  return { html: renderToStaticMarkup(<Host />), state };
}

describe("what she asks for, in order", () => {
  it("with nothing known: how the water can be counted, then the people, then the access, then the water before", () => {
    expect(keys({ view: "ex-ante", option: "beneficiaries" }, false)).toEqual(["option", "population.served", "accessLevel", "withoutProjectM3PerYear"]);
  });
  it("only for what the record lacks", () => {
    expect(keys(d3InputFromRecord(record(), "ex-ante"))).toEqual(["accessLevel", "withoutProjectM3PerYear"]);
  });
  it("a count with no unit, and a count of households with no size, are asked about", () => {
    expect(keys({ view: "ex-ante", option: "beneficiaries", population: { served: 10 }, accessLevel: "full", withoutProjectM3PerYear: 0 })).toEqual(["population.mode"]);
    expect(keys({ view: "ex-ante", option: "beneficiaries", population: { served: 10, mode: "households" }, accessLevel: "full", withoutProjectM3PerYear: 0 })).toEqual(["population.householdSize"]);
  });
  it("by capacity she asks for the flow, and never for the planned hours: those are assumed", () => {
    expect(keys({ view: "ex-ante", option: "capacity", withoutProjectM3PerYear: 0 })).toEqual(["flowM3PerHour"]);
    expect(keys({ view: "ex-post", option: "capacity", flowM3PerHour: 2, withoutProjectM3PerYear: 0 })).toEqual(["operatingHoursPerYear"]);
  });
  it("planned days are assumed with full access, and asked for with limited access", () => {
    const at = (accessLevel: "full" | "limited"): string[] => keys({ view: "ex-ante", option: "beneficiaries", population: { served: 10, mode: "people" }, accessLevel, withoutProjectM3PerYear: 0 });
    expect(at("full")).toEqual([]);
    expect(at("limited")).toEqual(["daysOfAccessPerYear"]);
  });
  it("after the project runs, the meter or the days from the logs", () => {
    expect(keys({ view: "ex-post", option: "metered", withoutProjectM3PerYear: 0 })).toEqual(["meteredM3PerYear"]);
    expect(keys({ view: "ex-post", option: "beneficiaries", population: { served: 10, mode: "people" }, accessLevel: "full", withoutProjectM3PerYear: 0 })).toEqual(["daysOfAccessPerYear"]);
  });
  it("she never asks for a method value, and each ask says what it is for and where it comes from", () => {
    for (const a of violetAsks({ view: "ex-ante", option: "beneficiaries" })) expect(a.why.length * a.from.length, a.key).toBeGreaterThan(0);
    expect(violetAsks({ view: "ex-ante", option: "beneficiaries" }).map((a) => a.key)).not.toContain("litresPerPersonPerDay");
  });
  it("once she has what she needs, the figure shows", () => {
    const input: D3Input = { view: "ex-ante", option: "beneficiaries", population: { served: 1200, mode: "people" }, accessLevel: "full", withoutProjectM3PerYear: 0 };
    expect(keys(input)).toEqual([]);
    expect(computeD3(input).vwbM3PerYear).not.toBeNull();
  });
});

describe("what she leaves at its default or its assumed start", () => {
  it("litres are the method's default; days are assumed; each with its source", () => {
    const kept = violetKept(computeD3({ view: "ex-ante", option: "beneficiaries", population: { served: 1200, mode: "people" }, accessLevel: "full", withoutProjectM3PerYear: 0 }));
    expect(kept.map((k) => [k.key, k.called])).toEqual([["litresPerPersonPerDay", "default"], ["daysOfAccessPerYear", "assumed"]]);
    for (const k of kept) expect(k.source.length).toBeGreaterThan(0);
  });
  it("hours by capacity are assumed, with no source yet", () => {
    expect(violetKept(computeD3({ view: "ex-ante", option: "capacity", flowM3PerHour: 2, withoutProjectM3PerYear: 0 }))).toMatchObject([{ key: "operatingHoursPerYear", called: "assumed", shown: "4,380 hours" }]);
  });
});

describe("filling her screen from an answer", () => {
  const start: D3Input = { view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 } };
  it("her way of counting, days, litres, flow and hours", () => {
    const a = fillViolet(start, { accessLevel: "full", daysOfAccessPerYear: 300, litresPerPersonPerDay: { value: 25, source: "an invented survey" }, withoutProjectM3PerYear: 0 });
    expect([a.filled, a.refused]).toEqual([["accessLevel", "withoutProjectM3PerYear", "daysOfAccessPerYear", "litresPerPersonPerDay"], []]);
    expect(computeD3(a.input).vwbM3PerYear).toBe((1200 * 25 * 300) / 1000);
    const b = fillViolet(start, { option: "capacity", flowM3PerHour: 2, operatingHoursPerYear: 3000, withoutProjectM3PerYear: 0 });
    expect(computeD3(b.input).vwbM3PerYear).toBe(6000);
    expect(start).toEqual({ view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 } });
  });
  it("a number outside its range is refused with its message, and the rest is filled", () => {
    const f = fillViolet(start, { daysOfAccessPerYear: 400, accessLevel: "limited", population: { served: 12.5 }, litresPerPersonPerDay: { value: -1, source: "x" } });
    expect(f.refused.map((r) => r.message)).toEqual(["People served must be a whole number, 1 or more.", "Days of access must be between 0 and 365.", "Litres per person a day must be 0 or more."]);
    expect(f.filled).toEqual(["accessLevel"]);
    expect(f.input).toEqual({ ...start, accessLevel: "limited" });
  });
  it("her own litres need their source, and a null clears a value", () => {
    expect(fillViolet(start, { litresPerPersonPerDay: { value: 25, source: " " } }).filled).toEqual([]);
    expect(fillViolet({ ...start, daysOfAccessPerYear: 300 }, { daysOfAccessPerYear: null }).input).toEqual(start);
  });
  it("what the engine cannot take changes nothing: no meter readings before the project runs", () => {
    expect(fillViolet(start, { option: "metered" })).toEqual({ input: start, filled: [], refused: [] });
    expect(fillViolet(start, { option: "guess" as never, accessLevel: "some" as never }).filled).toEqual([]);
  });
  it("an answer fills the mounted screen's state, and a read-only seat stays as it is", () => {
    const { state, html } = mount({ record: record(), place: "free-site" });
    expect(html).toContain("violet-d3");
    expect(state.fill({ accessLevel: "full", withoutProjectM3PerYear: 0 }).filled).toEqual(["accessLevel", "withoutProjectM3PerYear"]);
    expect(mount({ record: record(), readOnly: true }).state.fill({ accessLevel: "full" }).filled).toEqual([]);
  });
  it("the same record shows the same screen, with her own state or a site's", () => {
    expect(mount({ record: record() }).html).toBe(renderToStaticMarkup(<D3Screen record={record()} />));
  });
});

describe("her answer", () => {
  it("reads the reply, the hand-back, what was left and the values; a reply with no words is none", () => {
    expect(readVioletAnswer({ reply: " Thanks. ", handBack: "wellington", leftForNow: ["accessLevel", "nonsense"], values: { accessLevel: "full" } })).toEqual({ reply: "Thanks.", handBack: "wellington", leftForNow: ["accessLevel"], values: { accessLevel: "full" } });
    expect([readVioletAnswer({ reply: " " }), readVioletAnswer(null), readVioletAnswer("x")]).toEqual([null, null, null]);
    expect(readVioletAnswer({ reply: "Hi.", handBack: "phoebe" })?.handBack).toBe("none");
  });
  it("its shape takes nothing else", () => {
    expect(VIOLET_ANSWER_SCHEMA).toMatchObject({ additionalProperties: false, required: ["reply", "handBack"] });
  });
  it("adds the facts and her figure to the record, and marks her part done", () => {
    const r = record();
    const fill = fillViolet(d3InputFromRecord(r, "ex-ante"), { accessLevel: "full", withoutProjectM3PerYear: 0 });
    const { record: next, added } = addVioletAnswer(r, fill, true);
    expect(added).toEqual(["accessLevel", "withoutProjectM3PerYear"]);
    expect(next.agents.violet).toMatchObject({ done: true, questionsAsked: 2, estimate: { figure: 8760 } });
    expect(setVioletDone(next, false).agents.violet?.done).toBe(false);
  });
});

describe("what she can see of her screen", () => {
  it("the figures on it, the standing, and where each came from", () => {
    const { state } = mount({ record: record() });
    expect(state.pageContext()).toContain('for project "Invented project"');
    expect(state.pageContext()).toContain("There is NO figure on this screen yet.");
    expect(state.pageContext()).toContain("Draft — pending expert review");
    const input: D3Input = { view: "ex-ante", option: "beneficiaries", population: { served: 1200, mode: "people" }, accessLevel: "full", withoutProjectM3PerYear: 0 };
    const seen = violetPageContext({ projectName: "Invented", input, result: computeD3(input) });
    expect(seen).toContain("Volumetric water benefit 8,760 m³ per year (calculated)");
    expect(seen).toContain("Days of access in a year 365 days (assumed)");
    expect(seen).not.toContain("NO figure");
  });
  it("a number on the record she cannot use is named", () => {
    const r = record();
    r.facts.population = { value: { mode: "people", served: -40 }, source: by };
    expect(mount({ record: r }).state.pageContext()).toContain("People served must be a whole number, 1 or more.");
  });
});

describe("her chat opens first", () => {
  const input = d3InputFromRecord(record(), "ex-ante");
  const turn = { projectName: "Invented", input, result: computeD3(input), chosen: true } as const;
  it("on a site: she speaks first, asks the one question, and does not introduce herself", () => {
    const block = violetChatContext({ ...turn, place: "free-site", opened: true });
    expect(block).toContain("Speak first. They have already met you");
    expect(block).toContain("- People served: 1,200");
    expect(block).toContain("Ask for this one thing, in your own words: whether people have full access");
    expect(VIOLET_OPENED).toBe("(The visitor opened Violet's chat.)");
  });
  it("in the Agent Commons: no record, and she introduces herself", () => {
    const block = violetChatContext({ ...turn, place: "agent-commons", opened: true, introduce: true });
    expect(block).not.toContain("Already on the project record");
    expect(block).toContain("say who you are and what you do");
  });
  it("when her figure shows and nothing is blank, Wellington comes next", () => {
    const full = fillViolet(input, { accessLevel: "full", withoutProjectM3PerYear: 0 }).input;
    expect(violetChatContext({ ...turn, input: full, result: computeD3(full), place: "free-site" })).toContain("Wellington comes next");
  });
});

describe("the map calls her after Bridget has finished (2026-11-24)", () => {
  it("not before, and then on a likely water pathway", () => {
    const r = emptyRecord();
    r.facts.technology = { label: "Community water supply", code: "CWS", source: by };
    r.place.country = { value: "KEN", source: by };
    r.pathways.vwba = { reading: "likely", reason: "made up", wouldChange: "made up", source: by };
    const at = () => violetCall(agentMap({ place: "free-site", record: r, reads: ["vwba"] }));
    expect(at()).toEqual({ agent: "violet", called: false, because: "waiting for the agent before" });
    r.agents.bridget = { done: true };
    expect(at()).toEqual({ agent: "violet", called: true, introduce: true });
  });
});

describe("her files ship, with her settings", () => {
  it("each has a named entry, and the settings are the same in both places", () => {
    const pkg = JSON.parse(read("../package.json")) as { exports: Record<string, unknown>; scripts: Record<string, string> };
    for (const f of ["prompt.md", "knowledge.md", "config.yaml"]) expect(pkg.exports[`./${f}`]).toBe(`./dist/${f}`);
    expect(pkg.scripts.build).toMatch(/build:agent-files/);
    const config = read("./agents/violet/config.yaml");
    expect(config).toContain(`\nmodel: ${VIOLET_CHAT.model}\n`);
    expect(config).toContain(`\neffort: ${VIOLET_CHAT.effort}\n`);
    expect(config).toContain(`\nmax_output_tokens: ${VIOLET_CHAT.maxOutputTokens} `);
    expect(config).toContain(`\nreply: { sentences: ${VIOLET_CHAT.reply.sentences}, characters: ${VIOLET_CHAT.reply.chars} }`);
    expect(VIOLET_CHAT.reply).toEqual(REPLY_LIMIT);
  });
  it("her instructions name every ask, both labels and each place, and are plain enough to copy a tone from", () => {
    const prompt = read("./agents/violet/prompt.md");
    for (const word of ["`values`", "`leftForNow`", '"default"', '"assumed"', "Agent Commons", "MCP", "free site", "paid site"]) expect(prompt).toContain(word);
    expect(readingGrade("Say these in your own words. You share your step with the other calculator agent, and neither of you waits for the other.")).toBeLessThan(9);
  });
});

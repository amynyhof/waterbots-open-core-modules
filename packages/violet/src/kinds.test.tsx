// Violet and the kinds of project (decided by the maintainer on 2026-11-25): her screen, her asks, her tool and the guards on her
// numbers. Every project here is made up.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NO_CALCULATOR_YET, type GivenKindFacts } from "@waterbots/core/projectKinds";
import { addGivenFacts, newProjectRecord, type HomeUse, type ProjectRecord } from "@waterbots/core/record";
import { VIOLET_ANSWER_SCHEMA, VIOLET_ASK_KEYS, addVioletAnswer, fillViolet, guardVioletReply, readVioletAnswer, violetChatContext, violetPageContext, type VioletReply } from "./agent/chat.js";
import { computeD3Tool, parseD3Input, violetToolsFor } from "./agent/tools.js";
import { computeD3 } from "./d3/compute.js";
import type { D3Input } from "./d3/types.js";
import { addVioletFacts, d3InputFromRecord } from "./record.js";
import D3Screen from "./screen/D3Screen.js";
import { useD3State, type D3State, type D3StateOptions } from "./screen/useD3State.js";
import { d3Stop, d3StopMessage, kindFacts } from "./supply.js";

type Kind = GivenKindFacts & { homeUse?: HomeUse };
const people: D3Input = { view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 }, accessLevel: "full", withoutProjectM3PerYear: 0 };
const record = (k: Kind, without: number | null = 0): ProjectRecord =>
  addGivenFacts(newProjectRecord(), "wellington", { name: "Invented project", population: { mode: "people", served: 1200 }, accessLevel: "full", ...(without !== null ? { withoutProjectM3PerYear: without } : {}), ...k }).record;
function mount(options: D3StateOptions): { state: D3State; html: string } {
  let state!: D3State;
  function Host() {
    state = useD3State(options);
    return <D3Screen state={state} {...(options.place !== undefined ? { place: options.place } : {})} />;
  }
  return { html: renderToStaticMarkup(<Host />), state };
}
const NEW: Kind = { waterSource: "new", treatment: "none", homeUse: "yes" };
const RESTORED: Kind = { waterSource: "restored", treatment: "none", homeUse: "yes" };
const HELD: Kind[] = (["central", "homes", "institution", "more than one", "none"] as const).map((treatment) => ({ waterSource: "existing", treatment }));

describe("her screen", () => {
  it("a new source, with or without treatment, is counted, and she never asks whether the water is safe", () => {
    for (const k of [NEW, { ...NEW, treatment: "central" }, { ...NEW, treatment: "homes" }] as Kind[]) {
      const { html, state } = mount({ place: "free-site", record: record(k) });
      expect(html).toContain("8,760");
      expect(state.asks.map((a) => a.key)).not.toContain("sourceSafe");
    }
  });
  it("a restored source is its own answer, and takes off the water before the project", () => {
    expect(mount({ place: "free-site", record: record(RESTORED, 760) }).html).toContain("8,000");
    const blank = mount({ place: "free-site", record: record(RESTORED, null) });
    expect(blank.state.result.vwbM3PerYear).toBeNull();
    expect(blank.state.asks.map((a) => a.key)).toContain("withoutProjectM3PerYear");
  });
  it.each(HELD)("%j: held for now, the one sentence, and nothing to fill in", (k) => {
    const { html, state } = mount({ place: "agent-commons", record: record({ ...k, homeUse: "yes" }) });
    expect(html).toContain(NO_CALCULATOR_YET);
    expect(html).not.toMatch(/8,760|<input|<button/);
    expect([state.asks, state.kept]).toEqual([[], []]);
    expect(state.fill({ accessLevel: "limited" })).toMatchObject({ filled: [], refused: [] });
    expect(state.pageContext()).toContain("held for now");
    expect(html.replace(/<[^>]*>/g, " ") + state.pageContext()).not.toMatch(/\bK[1-6]\b|experts|not covered yet/);
  });
  it("not for home use: not set up yet, in the same sentence", () => {
    const { html, state } = mount({ place: "agent-commons", record: record({ ...NEW, homeUse: "no" }) });
    expect(html).toContain(NO_CALCULATOR_YET);
    expect(state.pageContext()).toContain("not set up yet");
  });
  it("one blank fact: no figure, one question, and what is said meanwhile still fills her screen", () => {
    for (const [k, key] of [[{}, "waterSource"], [{ waterSource: "new" }, "treatment"], [{ waterSource: "new", treatment: "none" }, "homeUse"]] as [Kind, string][]) {
      const { html, state } = mount({ place: "free-site", record: record(k) });
      expect(html).toContain("can&#x27;t run for this project yet.");
      expect(html).not.toContain("8,760");
      expect(state.asks[0]?.key).toBe(key);
      expect(state.fill({ option: "capacity" }).filled).toEqual(["option"]);
    }
  });
  it("when the source changes in an answer, the water before the project is cleared, and not put back on the record", () => {
    const before = record(NEW);
    const { state } = mount({ place: "free-site", record: before });
    expect(state.input.withoutProjectM3PerYear).toBe(0);
    const facts = { waterSource: "restored" } as const;
    const changed = addVioletFacts(before, facts).record;
    const fill = state.fill({}, facts);
    expect(fill.input.withoutProjectM3PerYear).toBeUndefined();
    const after = addVioletAnswer(changed, fill).record;
    expect([after.facts.withoutProjectM3PerYear, after.agents.violet?.estimate]).toEqual([undefined, undefined]);
    // Said in the same answer, it is kept.
    expect(state.fill({ withoutProjectM3PerYear: 760 }, facts).input.withoutProjectM3PerYear).toBe(760);
    // The same source said again changes nothing.
    expect(mount({ place: "free-site", record: before }).state.fill({}, { waterSource: "new" }).input.withoutProjectM3PerYear).toBe(0);
  });
  it("in the Agent Commons with no record yet: no figure, and the source is asked first", () => {
    const { html, state } = mount({ place: "agent-commons" });
    expect(html).toContain("can&#x27;t run for this project yet.");
    expect(state.asks[0]?.key).toBe("waterSource");
  });
});

describe("her chat", () => {
  it("her answer holds the facts, and a fact the visitor changes is changed", () => {
    const reply = readVioletAnswer({ reply: "Thanks.", facts: { waterSource: "existing", treatment: "central", technology: "CWS", homeUse: "maybe" } })!;
    expect(reply.facts).toEqual({ waterSource: "existing", treatment: "central" });
    const r = addVioletAnswer(record(NEW), fillViolet(people, {})).record;
    expect(r.agents.violet?.estimate?.figure).toBe(8760);
    const out = addVioletFacts(r, reply.facts);
    expect([out.changed, out.figuresOff, out.record.agents.violet?.estimate]).toEqual([["waterSource", "treatment"], ["violet"], undefined]);
    expect(addVioletFacts(r, reply.facts, { saved: true })).toMatchObject({ changed: [], onRecordPage: ["waterSource", "treatment"] });
    // While it is held, no figure goes on the record.
    expect(addVioletAnswer(out.record, fillViolet(people, {})).record.agents.violet?.estimate).toBeUndefined();
    expect(JSON.stringify(VIOLET_ANSWER_SCHEMA)).not.toMatch(/"technology"|\bK[1-6]\b/);
    expect(VIOLET_ASK_KEYS).not.toContain("technology");
  });
  it("the block holds the facts as lines, and never says her part is done while it is held", () => {
    const turn = (k: Kind) => {
      const r = record(k);
      const input = d3InputFromRecord(r, "ex-ante");
      return violetChatContext({ place: "free-site", projectName: "Invented project", input, result: computeD3(input), chosen: true, facts: r.facts });
    };
    expect(turn(RESTORED)).toMatch(/The source: brought back after it had stopped[\s\S]*Your part is done/);
    expect(turn(HELD[0]!)).not.toMatch(/8,760|Your part is done|Values you do not ask for/);
    expect(turn({ waterSource: "new" })).toContain("The one thing to ask now: whether the project treats the water");
  });
  it("what she sees, for each reason", () => {
    const see = (k: Kind): string => violetPageContext({ projectName: "Invented project", input: people, result: computeD3(people), facts: record(k).facts });
    expect(see({})).toContain("whether the source is new, restored or already in use");
    expect(see({ waterSource: "new", treatment: "none" })).toContain("whether people use the water at home");
    expect(see(NEW)).toContain("8,760");
  });
  it("her instructions say the two words, where the guidebook is quiet, and hold no old line", () => {
    const read = (f: string): string => readFileSync(new URL(`./agents/violet/${f}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    for (const word of ["Held for now", "Not set up yet", "WaterBots' reading", "where it is quiet"]) expect(read("prompt.md").replace(/\n/g, " ")).toContain(word);
    for (const f of ["prompt.md", "knowledge.md"]) expect(read(f)).not.toMatch(/experts|not covered yet|new or restored|\bK[1-6]\b/);
    expect(read("knowledge.md").replace(/\s+/g, " ")).toContain("It does not say which holds. Taking the water off is WaterBots' reading.");
  });
});

describe("her tool", () => {
  it("with no record, the person's facts decide, and the figure is the engine's", async () => {
    for (const k of [NEW, RESTORED, { ...NEW, treatment: "homes" }] as Kind[]) {
      expect(parseD3Input({ ...k, ...people })).toEqual(people);
      const { blankOrAssumed: _notes, ...rest } = (await computeD3Tool.execute({ ...k, ...people })).output as Record<string, unknown>;
      expect(rest).toEqual(computeD3(people));
    }
  });
  it("a blank fact is asked for, and the rest is refused in the words of the page", () => {
    for (const [k, message] of [
      [{}, /waterSource is a project fact .* it is missing/],
      [{ waterSource: "new" }, /treatment is a project fact/],
      [{ waterSource: "new", treatment: "none" }, /homeUse is a project fact/],
      [{ ...NEW, homeUse: "no" }, /^Not set up yet\..*hello@waterbots\.ai/],
      ...HELD.map((h) => [h, /^Held for now\..*hello@waterbots\.ai/] as const),
      [{ technology: "CWS" }, /waterSource is a project fact/],
    ] as [Record<string, unknown>, RegExp][]) expect(() => computeD3Tool.execute({ ...k, ...people })).toThrow(message);
  });
  it("with a record, the record decides and the model is not asked", async () => {
    const [tool] = violetToolsFor(record(NEW).facts);
    expect(JSON.stringify(tool!.inputSchema)).not.toContain("waterSource");
    expect(((await tool!.execute(people)).output as { vwbM3PerYear: number }).vwbM3PerYear).toBe(8760);
    const [held] = violetToolsFor(record(HELD[0]!).facts);
    expect(() => held!.execute({ ...NEW, ...people })).toThrow(/Held for now/);
  });
  it("a project that already exists keeps its tool's answer", async () => {
    const by = { by: "site intake", note: "made up" } as const;
    const [tool] = violetToolsFor({ technology: { label: "Community water supply", code: "CWS", source: by } });
    expect(((await tool!.execute(people)).output as { vwbM3PerYear: number }).vwbM3PerYear).toBe(8760);
  });
});

describe("the guards on her numbers", () => {
  const reply = (values: VioletReply["values"]): VioletReply => ({ reply: "Thanks.", handBack: "none", leftForNow: [], facts: {}, values });
  const guard = (values: VioletReply["values"], messages: string[], asked?: string, input: D3Input = { view: "ex-ante", option: "beneficiaries" }) =>
    guardVioletReply(reply(values), { input, messages, ...(asked !== undefined ? { asked } : {}) });
  it("a number the visitor gave stays; one they did not give comes back, then is taken out and said", () => {
    const g = guard({ population: { served: 900, mode: "people" }, flowM3PerHour: 4, litresPerPersonPerDay: { value: 25, source: "local" } }, ["It serves nine hundred people."]);
    expect(g.reply.values).toEqual({ population: { served: 900, mode: "people" } });
    expect(g.returned).toMatch(/Flow of the system 4; Litres per person a day 25/);
    expect(g.told).toContain("Flow of the system and Litres per person a day: not filled in");
  });
  it("what the screen holds is dropped with no fault", () => {
    const g = guard({ population: { served: 1200 } }, ["Yes."], undefined, people);
    expect([g.reply.values, g.returned]).toEqual([{}, null]);
  });
  it("a zero is taken from none or brand-new, as the answer to that question", () => {
    for (const said of ["None.", "It is brand-new."]) expect(guard({ withoutProjectM3PerYear: 0 }, [said], "withoutProjectM3PerYear").reply.values).toEqual({ withoutProjectM3PerYear: 0 });
    expect(guard({ withoutProjectM3PerYear: 0 }, ["A new borehole."], "withoutProjectM3PerYear").returned).not.toBeNull();
  });
  it("the out-of-range message for the fact just asked, whether or not she sent the number", () => {
    for (const values of [{}, { daysOfAccessPerYear: 400 }]) expect(guard(values, ["400 days"], "daysOfAccessPerYear").outOfRange).toBe("Days of access must be between 0 and 365.");
    expect(guard({}, ["0"], "population.served", { view: "ex-ante", option: "beneficiaries", population: { mode: "households" } }).outOfRange).toBe("Households served must be a whole number, 1 or more.");
    expect(guard({}, ["300 days"], "daysOfAccessPerYear").outOfRange).toBeNull();
  });
});

it("the stop, and the words for it", () => {
  expect(d3Stop(kindFacts({}))).toEqual({ because: "fact not given", fact: "waterSource" });
  expect(d3Stop(kindFacts({ waterSource: "new" }))).toEqual({ because: "fact not given", fact: "treatment" });
  expect(d3Stop(kindFacts({ waterSource: "new", treatment: "none" }))).toEqual({ because: "home use not given" });
  expect(d3Stop(kindFacts(NEW))).toBeNull();
  expect(d3StopMessage({ because: "fact not given", fact: "treatment" })).toBe("The calculator can't run for this project yet.");
});

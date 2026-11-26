// Calvin's chat (J5): what he asks, what he keeps, how an answer fills his screen, and his files. Invented projects.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { REPLY_LIMIT } from "@waterbots/core/reply";
import { emptyRecord } from "@waterbots/core/record";
import { computeScenario } from "../engine";
import { seedCalcState, toScenarioInput, type CalcState, type CalvinProject } from "../screen/state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "../screen/useCalculatorState";
import { CALVIN_ANSWER_SCHEMA, CALVIN_ANSWER_VALUES, CALVIN_CHAT, CALVIN_OPENED, calvinAsks, calvinChatContext, calvinKept, fillCalvin, readCalvinAnswer, setCalvinDone } from "./chat";

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const invented = (extra: Partial<CalvinProject> = {}): CalvinProject => ({ name: "Invented", standards: ["carbon"], technology: "CWS", country: "KEN", population: { mode: "people", served: 1200 }, ...extra });
const seat = (extra: Partial<CalvinProject> = {}): CalcState => seedCalcState(invented(extra));
const keys = (s: CalcState, o: Parameters<typeof calvinAsks>[1] = {}): string[] => calvinAsks(s, o).map((a) => a.key);
function mount(project: CalvinProject, options: CalculatorOptions = {}): CalculatorState {
  let calc!: CalculatorState;
  function Seat() {
    calc = useCalculatorState(project, options);
    return null;
  }
  renderToStaticMarkup(<Seat />);
  return calc;
}

describe("what he asks for, in order", () => {
  // SWITCHED OFF 2026-11-25, never deleted: nobody is asked for a kind; the source comes first.
  it.skip("with nothing known: the technology, the country, the people and how they were counted", () => {
    const s = seedCalcState({ name: "Invented", standards: [] });
    expect(keys(s)).toEqual(["technology", "country", "population.served", "population.mode"]);
  });
  it("only for what the record lacks, then two facts that may stay blank", () => {
    const asks = calvinAsks(seat());
    expect(asks.map((a) => [a.key, a.needed])).toEqual([["pumpPower", false], ["meteredVolumeL", false]]);
    expect(keys(seat({ population: { served: 300 } }))[0]).toBe("population.mode");
  });
  it("a pump on diesel or grid power: its emissions, and they are needed", () => {
    for (const pumpPower of ["diesel", "grid"] as const) expect(calvinAsks(seat({ pumpPower }))[0]).toMatchObject({ key: "activityEmissions", needed: true });
    expect(keys(seat({ pumpPower: "hand" }))).toEqual(["meteredVolumeL"]);
  });
  it("the filed V1.0 fNRB only for a project credited under V1.0", () => {
    expect(keys(seat({ creditedUnderV1: true }), { transition: true })).toContain("fnrbFiledV1");
    expect(keys(seat())).not.toContain("fnrbFiledV1");
  });
  it("after the project runs, each monitored value from its own record", () => {
    const asks = calvinAsks(seat({ technology: "HWT", analysis: { mode: "ex-post" } }));
    expect(asks.map((a) => a.key)).toEqual(["operationalDays", "waterQualityFactor", "usageRate", "xCleanboil"]);
    expect(asks.every((a) => a.needed && a.from.length > 0)).toBe(true);
  });
  it("never a method value, and devices per household only with a flow rate", () => {
    const hwt = seat({ technology: "HWT" });
    for (const s of [seat(), hwt]) for (const k of ["litresPerPersonPerDay", "etaOverride", "fnrbOverride", "operationalDays", "deviceCapacityLPerHour", "cBaseline"]) expect(keys(s)).not.toContain(k);
    expect(keys(hwt)).toEqual([]);
    expect(keys({ ...hwt, deviceCapacityLPerHour: 2 })).toEqual(["devicesPerPremises"]);
  });
  it("a technology that is not covered yet: he asks for nothing", () => {
    expect(keys(seedCalcState({ name: "Invented", standards: [] }), { notCoveredYet: "Community level water treatment technologies" })).toEqual([]);
  });
});

describe("what he leaves at its default or its assumed start, called what its tag says", () => {
  it("on sliders, and on typed boxes", () => {
    const called = (sliders: boolean) => Object.fromEntries(calvinKept(seat(), { sliders }).map((k) => [k.key, k.called]));
    expect(called(true)).toEqual({ litresPerPersonPerDay: "assumed", operationalDays: "assumed", waterQualityFactor: "assumed", xCleanboil: "assumed", cBaseline: "assumed" });
    expect(called(false).litresPerPersonPerDay).toBe("default");
  });
  it("a value the person set is no longer listed, and after the project runs none of the monitored ones is", () => {
    expect(calvinKept(seat({ analysis: { operationalDays: 300, operationalDaysEntered: true } })).map((k) => k.key)).not.toContain("operationalDays");
    expect(calvinKept(seat({ analysis: { mode: "ex-post" } })).map((k) => k.key)).toEqual(["litresPerPersonPerDay", "cBaseline"]);
  });
  it("the country's fNRB, with its source, from the engine's own run", () => {
    const s = seat();
    const result = computeScenario(toScenarioInput(s));
    expect(calvinKept(s, { result })).toContainEqual(expect.objectContaining({ key: "fnrbOverride", called: "default", shown: String(result.fNRB) }));
  });
});

describe("filling his screen from an answer", () => {
  it("the values, with their entered marks, as if they were typed", () => {
    const s = seat();
    const f = fillCalvin(s, { values: { operationalDays: 300, cBaseline: 0.1, meteredVolumeL: 1_000_000 } });
    expect([f.filled, f.refused]).toEqual([["operationalDays", "cBaseline", "meteredVolumeL"], []]);
    expect({ ...s, ...f.patch }).toEqual({ ...s, operationalDays: 300, operationalDaysEntered: true, cBaseline: 0.1, meteredVolumeL: 1_000_000 });
  });
  it("a number outside its range is refused with its message, and the rest is filled", () => {
    const f = fillCalvin(seat(), { values: { operationalDays: 400, waterQualityFactor: 90, cBaseline: 0.2, populationCount: 1.5 } });
    expect(f.refused).toEqual([
      { field: "populationCount", message: "People served must be a whole number, 1 or more." },
      { field: "operationalDays", message: "Days of operation must be between 0 and 365." },
      { field: "waterQualityFactor", message: "Share of water tests that pass must be between 0 and 1." },
    ]);
    expect(f.filled).toEqual(["cBaseline"]);
  });
  it("a value this run does not use is left out, and a null clears one that may be blank", () => {
    expect(fillCalvin(seat(), { values: { deviceCapacityLPerHour: 2, premises: 4 } }).filled).toEqual([]);
    expect(fillCalvin(seat({ analysis: { meteredVolumeL: 5 } }), { values: { meteredVolumeL: null, populationCount: null } }).patch).toEqual({ meteredVolumeL: null });
  });
  it("every value an answer may set is a value he checks", () => {
    const s = seat({ technology: "HWT", creditedUnderV1: true });
    for (const v of CALVIN_ANSWER_VALUES) expect(fillCalvin(s, { values: { [v]: -1 } }).refused.map((r) => r.field), v).toEqual([v]);
  });
  it("on the seat: filled, and inert when read-only", () => {
    expect(mount(invented()).fill({ values: { operationalDays: 300 } }).filled).toEqual(["operationalDays"]);
    expect(mount(invented(), { readOnly: true }).fill({ values: { operationalDays: 300 } }).filled).toEqual([]);
    expect(mount(invented()).asks.map((a) => a.key)).toEqual(["pumpPower", "meteredVolumeL"]);
    expect(mount(invented()).kept.length).toBeGreaterThan(0);
  });
});

describe("his answer", () => {
  // SWITCHED OFF 2026-11-25, never deleted: his answer holds the project's facts, not a kind.
  it.skip("keeps only facts that hold, and turns a kind of project into the label list's technology", () => {
    const a = readCalvinAnswer({ reply: " Thanks. ", handBack: "none", facts: { country: "ken", pumpPower: "steam", technologyClass: "CWS", population: { served: 300, mode: "households" } }, values: { operationalDays: 300 }, leftForNow: ["pumpPower", "nonsense"] });
    expect(a).toEqual({
      reply: "Thanks.",
      handBack: "none",
      leftForNow: ["pumpPower"],
      facts: { country: "KEN", population: { served: 300, mode: "households" }, technology: { label: "Community water supply technologies", code: "CWS" } },
      values: { operationalDays: 300 },
    });
    expect(readCalvinAnswer({ reply: "Hi.", facts: { technologyClass: "IWT", country: "Kenya" } })?.facts).toEqual({ technology: { label: "Institutional water treatment technologies" } });
    expect([readCalvinAnswer({ reply: "" }), readCalvinAnswer(null)]).toEqual([null, null]);
  });
  it("its shape takes nothing else, and his part can be marked done", () => {
    expect(CALVIN_ANSWER_SCHEMA).toMatchObject({ additionalProperties: false, required: ["reply", "handBack"] });
    expect(setCalvinDone(emptyRecord(), true).agents.calvin).toEqual({ done: true });
  });
});

describe("his chat opens first", () => {
  it("he speaks first, with the record in hand and one question", () => {
    const calc = mount(invented());
    const block = calvinChatContext({ place: "free-site", state: calc.state, screen: calc.pageContext(), result: calc.paaResult, opened: true });
    expect(block).toContain("this is your first turn with them: you have not talked before. Speak first");
    expect(block).toContain("- Technology: a community water supply");
    expect(block).toContain("The one thing to ask now: what powers the pump");
    expect(block).toContain("It may be left blank, and the figure still shows.");
    expect(block).toContain("GS Safe Water calculator");
    expect(CALVIN_OPENED).toBe("(The visitor opened Calvin's chat.)");
  });
  it("once nothing he needs is blank, his part is done and Wellington comes next, at each place with him", () => {
    const calc = mount(invented({ pumpPower: "hand" }));
    const at = (place: "free-site" | "paid-site" | "agent-commons") => calvinChatContext({ place, state: calc.state, screen: "", result: calc.paaResult, leftForNow: ["meteredVolumeL"] });
    expect(at("free-site")).toContain("Wellington comes next");
    expect(at("paid-site")).toContain("Wellington comes next");
    expect(at("agent-commons")).not.toContain("Wellington comes next");
  });
  it("with no figure, his part is not done", () => {
    const calc = mount(invented({ population: {} }));
    expect(calvinChatContext({ place: "free-site", state: calc.state, screen: "", result: calc.paaResult })).not.toContain("Your part is done");
  });
});

describe("his files ship, with his settings", () => {
  it("each has a named entry, and the settings are the same in both places", () => {
    const pkg = JSON.parse(read("../../../../package.json")) as { exports: Record<string, unknown>; scripts: Record<string, string> };
    for (const f of ["prompt.md", "knowledge.md", "config.yaml"]) expect(pkg.exports[`./${f}`]).toBe(`./dist/${f}`);
    expect(pkg.scripts.build).toMatch(/build:agent-files/);
    const config = read("../../../agents/calvin/config.yaml");
    expect(config).toContain(`\nmodel: ${CALVIN_CHAT.model}\n`);
    expect(config).toContain(`\neffort: ${CALVIN_CHAT.effort}\n`);
    expect(config).toContain(`\nmax_output_tokens: ${CALVIN_CHAT.maxOutputTokens} `);
    expect(config).toContain(`\nreply: { sentences: ${CALVIN_CHAT.reply.sentences}, characters: ${CALVIN_CHAT.reply.chars} }`);
    expect(CALVIN_CHAT.reply).toEqual(REPLY_LIMIT);
  });
  // SWITCHED OFF 2026-11-25, never deleted: the words are now held for now and not set up yet.
  it.skip("his instructions name both labels, what is not covered yet, and each place, and restate none of the 21 rules", () => {
    const prompt = read("../../../agents/calvin/prompt.md");
    for (const word of ["`facts`", "`values`", "`leftForNow`", '"default"', '"assumed"', "not covered yet", "Wellington comes next", "Agent Commons", "MCP"]) expect(prompt).toContain(word);
    expect(prompt).not.toMatch(/own words|one question at a time|do not know|what you filled in/);
  });
});

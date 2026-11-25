// Calvin and the kinds of project (decided by the maintainer on 2026-11-25): his screen, his asks, his tools and the guards on
// his numbers. Every project here is invented.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NO_CALCULATOR_YET, PROJECT_RULES, SHORTFALL_WORDS, type GivenKindFacts } from "@waterbots/core/projectKinds";
import { NEWER_WAY_NOTE, addGivenFacts, emptyRecord, newProjectRecord, redoUnderTodaysRules, type ProjectRecord } from "@waterbots/core/record";
import { computeScenario } from "../engine";
import { CALVIN_ANSWER_SCHEMA, CALVIN_ASK_KEYS, calvinAsks, calvinChatContext, calvinKnown, guardCalvinReply, readCalvinAnswer, type CalvinReply } from "../agent/chat";
import { addCalvinFacts, calvinNeeds, calvinProjectFromRecord } from "../agent/record";
import { calvinToolsFor, computeScenarioTool, transitionWaterfallTool } from "../agent/tools";
import CalculatorWork from "./CalculatorWork";
import ReportView from "./ReportView";
import { seedCalcState } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";

const by = { by: "site intake", note: "invented" } as const;
const base = { name: "Invented project", population: { mode: "people" as const, served: 1200 }, country: "KEN" };
const record = (f: GivenKindFacts): ProjectRecord => addGivenFacts(newProjectRecord(), "wellington", { ...base, ...f }).record;
/** A project that already exists, with the label its site gave it. */
function existing(label: string, code?: "CWS" | "HWT"): ProjectRecord {
  const r = emptyRecord();
  r.facts.name = base.name;
  r.facts.technology = { label, ...(code ? { code } : {}), source: by };
  r.facts.population = { value: base.population, source: by };
  r.place.country = { value: base.country, source: by };
  return r;
}
function mount(r: ProjectRecord, options: CalculatorOptions = {}): { calc: CalculatorState; html: string } {
  const project = calvinProjectFromRecord(r);
  let calc!: CalculatorState;
  function Seat() {
    calc = useCalculatorState(project, options);
    return <CalculatorWork calc={calc} project={project} appVersion="test" tab="calculator" />;
  }
  return { html: renderToStaticMarkup(<Seat />), calc };
}
const text = (s: string): string => s.replace(/'/g, "&#x27;");

const CWT: GivenKindFacts = { waterSource: "existing", treatment: "central", publicPiped: false };
const SUPPLY: GivenKindFacts = { waterSource: "new", treatment: "none", sourceSafe: true };
const HOMES: GivenKindFacts = { waterSource: "existing", treatment: "homes" };

describe("community level treatment is counted again, treatment only included", () => {
  it("a figure shows, by Method 1, and it is the engine's own", () => {
    const { calc } = mount(record(CWT));
    expect(calc.state.method).toBe(1);
    expect(calc.paaResult?.result.ER).toBeGreaterThan(0);
    // The same people, country and days as a new supply: the same engine run.
    expect(calc.paaResult?.result).toEqual(mount(record(SUPPLY)).calc.paaResult?.result);
  });
  it("the report names it for what it is", () => {
    for (const [f, words] of [[CWT, "CWT — Method 1 (community water treatment)"], [{ waterSource: "new", treatment: "central" }, "CWS with CWT — Method 1 (community water supply with treatment)"], [SUPPLY, "CWS — Method 1 (community water supply)"], [HOMES, "HWT — Method 2 (household water treatment)"]] as const) {
      const project = calvinProjectFromRecord(record(f));
      function Report() {
        const calc = useCalculatorState(project);
        return <CalculatorWork calc={calc} project={project} appVersion="test" tab="report" />;
      }
      expect(renderToStaticMarkup(<Report />)).toContain(words);
    }
    expect(ReportView).toBeTypeOf("function");
  });
  it("a project saved with its code has its figure, with no new question", () => {
    const { calc, html } = mount(existing("Community level water treatment technologies", "CWS"));
    expect(calc.paaResult?.result.ER).toBeGreaterThan(0);
    expect(html).not.toContain(NEWER_WAY_NOTE);
    expect(calc.asks.map((a) => a.key)).toEqual(["pumpPower", "meteredVolumeL"]);
  });
});

describe("where no figure shows", () => {
  const cases: [GivenKindFacts, string, RegExp][] = [
    [{ waterSource: "existing", treatment: "institution" }, NO_CALCULATOR_YET, /not set up yet/],
    [{ waterSource: "new", treatment: "homes" }, NO_CALCULATOR_YET, /not set up yet/],
    [{ waterSource: "existing", treatment: "none" }, NO_CALCULATOR_YET, /held for now/],
    [{ waterSource: "existing", treatment: "central", publicPiped: true, pipedShownUnsafe: false }, SHORTFALL_WORDS["public piped water"], /falls short/],
    [{ waterSource: "restored", treatment: "none", outThreeMonths: false }, SHORTFALL_WORDS["restored source, 2026 version"], /falls short/],
  ];
  it.each(cases)("%j: the sentence, no figure and nothing asked", (f, words, standing) => {
    const { calc, html } = mount(record(f));
    expect(html).toContain(text(words));
    expect(html).not.toContain("Project facts needed");
    expect([calc.result, calc.asks]).toEqual([null, []]);
    expect(calc.pageContext()).toMatch(standing);
    expect(calc.pageContext()).toContain("There are NO figures on this screen");
    expect(html + calc.pageContext()).not.toMatch(/\bK[1-6]\b|experts|not covered yet/);
  });
  it("one blank fact: the sentence names it, and it is his one question", () => {
    for (const [f, key, words] of [
      [{}, "waterSource", "whether the source is new, restored or already in use"],
      [{ waterSource: "new" }, "treatment", "where the water is treated, if it is treated"],
      [{ waterSource: "new", treatment: "none" }, "sourceSafe", "whether the water at the source is safe to drink"],
      [{ waterSource: "new", treatment: "none", sourceSafe: false }, "treatment", "where the water is treated, if it is treated"],
      [{ waterSource: "existing", treatment: "central" }, "publicPiped", "whether the supply is public piped water"],
      [{ waterSource: "restored", treatment: "none" }, "outThreeMonths", "out of action for at least three months"],
    ] as [GivenKindFacts, string, string][]) {
      const { calc, html } = mount(record(f));
      expect(html).toContain(words);
      expect(html).toContain("Project facts needed");
      expect(calc.asks[0]?.key).toBe(key);
      expect(calc.result).toBeNull();
    }
  });
  it("a restored source is counted once its conditions and the safe-water question are answered", () => {
    const { calc } = mount(record({ waterSource: "restored", treatment: "none", outThreeMonths: true, repairPlanned: false, sourceSafe: true }));
    expect(calc.paaResult?.result.ER).toBeGreaterThan(0);
  });
});

describe("a project that already exists keeps its answer", () => {
  it.each([["Community water supply", "CWS", 1], ["Household water treatment", "HWT", 2]] as const)("%s: the same figure, and no new question", (label, code, method) => {
    const { calc, html } = mount(existing(label, code));
    const plain = seedCalcState({ name: base.name, standards: [], technology: code, country: "KEN", population: base.population });
    expect(calc.state).toEqual(plain);
    expect(calc.state.method).toBe(method);
    expect(calc.paaResult?.result.ER).toBeGreaterThan(0);
    expect(calc.asks.map((a) => a.key)).not.toContain("waterSource");
    expect(html).not.toContain(NEWER_WAY_NOTE);
  });
  it("with no figure before, it says there is a newer way and offers to redo it", () => {
    const r = existing("Community level water treatment technologies");
    const { calc, html } = mount(r, { onRedo: () => {} });
    expect(calc.result).toBeNull();
    expect(html).toContain(text(NEWER_WAY_NOTE));
    expect(html).toContain("Redo it");
    // Nothing on the screen says there is no calculator for it, or asks for a fact.
    expect(html).not.toMatch(/We do not have a calculator|Project facts needed/);
    expect(calc.pageContext()).toContain("A newer way to work it out exists.");
    expect(mount(r, { onRedo: () => {}, readOnly: true }).html).not.toContain("Redo it");
    // Redone, the agent asks for the first fact.
    expect(mount(redoUnderTodaysRules(r)).calc.asks[0]?.key).toBe("waterSource");
  });
  it("nothing he is told in his chat changes its kind", () => {
    const r = existing("Community water supply", "CWS");
    expect(addCalvinFacts(r, { waterSource: "existing", treatment: "homes" })).toMatchObject({ added: [], onRecordPage: ["waterSource", "treatment"] });
  });
});

describe("what he asks and what he adds", () => {
  it("with nothing known, the source comes first, never a kind", () => {
    const s = seedCalcState({ name: "Invented", standards: [] });
    expect(calvinAsks(s).map((a) => a.key)).toEqual(["waterSource", "country", "population.served", "population.mode"]);
    expect(CALVIN_ASK_KEYS).not.toContain("technology");
    expect(calvinNeeds(record(SUPPLY))).toEqual([]);
    expect(calvinNeeds(record({ waterSource: "new", treatment: "none" }))).toEqual(["sourceSafe"]);
  });
  it("his answer holds the facts, and a fact the visitor changes is changed", () => {
    const a = readCalvinAnswer({ reply: "Thanks.", facts: { waterSource: "existing", treatment: "central", publicPiped: "no", technologyClass: "CWS", homeUse: "yes" } })!;
    expect(a.facts).toEqual({ waterSource: "existing", treatment: "central", homeUse: "yes" });
    const out = addCalvinFacts(record(SUPPLY), a.facts!);
    expect(out.changed).toEqual(["waterSource", "treatment"]);
    expect(calvinProjectFromRecord(out.record).answer).toEqual({ says: "ask", fact: "publicPiped" });
    expect(JSON.stringify(CALVIN_ANSWER_SCHEMA)).not.toMatch(/technologyClass|\bK[1-6]\b/);
  });
  it("he reads the facts as lines, and the block names one question", () => {
    const r = record({ waterSource: "new", treatment: "none" });
    const { calc } = mount(r);
    expect(calvinKnown(calc.state, r.facts)).toEqual(["The source: new", "Treatment: none", "Country: KEN", "People served: 1,200"]);
    const block = calvinChatContext({ place: "free-site", state: calc.state, screen: calc.pageContext(), answer: { says: "ask", fact: "sourceSafe" }, facts: r.facts });
    expect(block).toContain("The one thing to ask now: whether the water at the source is safe to drink.");
    expect(block).not.toContain("Your part is done");
  });
  it("his instructions say the two words and hold no old line", () => {
    const prompt = readFileSync(new URL("../../../agents/calvin/prompt.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    for (const word of ["`facts`", "`values`", "`leftForNow`", '"default"', '"assumed"', "Held for now", "Not set up yet", "Wellington comes next", "Agent Commons", "MCP"]) expect(prompt).toContain(word);
    expect(prompt).not.toMatch(/own words|one question at a time|do not know|what you filled in|experts|not covered yet|new or restored|\bK[1-6]\b/);
  });
});

describe("his tools", () => {
  const input = { version: "paa", countryIso: "KEN", populationMode: "people", populationCount: 1200, litresPerPersonPerDay: 4, operationalDays: 347 };
  const er = async (tool: typeof computeScenarioTool, raw: unknown) => ((await tool.execute(raw)).output as { result: unknown }).result;
  it("with no record, the person's facts decide, and the figure is the engine's own", async () => {
    for (const [f, method] of [[SUPPLY, 1], [CWT, 1], [HOMES, 2]] as const) expect(await er(computeScenarioTool, { ...input, ...f })).toEqual(computeScenario({ ...input, method } as never).result);
  });
  it("a blank fact is asked for, and the rest is refused in the words of the page", () => {
    for (const [f, message] of [
      [{}, /waterSource is a project fact .* it is missing/],
      [{ waterSource: "new" }, /treatment is a project fact/],
      [{ waterSource: "new", treatment: "none" }, /sourceSafe is a project fact/],
      [{ waterSource: "new", treatment: "none", sourceSafe: false }, /needs treatment/],
      [{ waterSource: "existing", treatment: "institution" }, /^Not set up yet\..*hello@waterbots\.ai/],
      [{ waterSource: "existing", treatment: "none" }, /^Held for now\./],
      [{ waterSource: "existing", treatment: "central", publicPiped: true, pipedShownUnsafe: false }, /falls short/],
    ] as const) {
      for (const tool of [computeScenarioTool, transitionWaterfallTool]) expect(() => tool.execute({ ...input, ...f })).toThrow(message);
    }
  });
  it("a technology label does not get round it, nor does a method", () => {
    for (const extra of [{ technology: "CWS" }, { technology: "CWT" }, { method: 1 }, { method: 2 }]) expect(() => computeScenarioTool.execute({ ...input, ...extra })).toThrow(/waterSource is a project fact/);
    expect(() => computeScenarioTool.execute({ ...input, ...SUPPLY, method: 2 })).toThrow(/method follows the project's facts/);
    expect(() => computeScenarioTool.execute({ ...input, ...HOMES, preset: "institutional-wood-iwt" })).toThrow(/not set up yet/);
  });
  it("the version in use: each run is asked for its own conditions, and the transition for both", () => {
    const f = { waterSource: "restored", treatment: "none", sourceSafe: true, outThreeMonths: true, repairPlanned: false };
    expect(typeof computeScenarioTool.execute({ ...input, ...f })).toBe("object");
    for (const tool of [computeScenarioTool, transitionWaterfallTool]) expect(() => tool.execute({ ...input, version: "legacy", fnrbFiledV1: 0.8, ...f })).toThrow(/noRepairThreeMonths is a project fact/);
  });
  it("with a record, the record decides and the model cannot: it is not even asked", async () => {
    const [tool] = calvinToolsFor(record(HOMES).facts);
    expect(JSON.stringify(tool!.inputSchema)).not.toContain("waterSource");
    expect(await er(tool!, { ...input, ...SUPPLY })).toEqual(computeScenario({ ...input, method: 2 } as never).result);
    const [held] = calvinToolsFor(record({ waterSource: "existing", treatment: "none" }).facts);
    expect(() => held!.execute({ ...input, ...SUPPLY })).toThrow(/Held for now/);
  });
  it("a project that already exists keeps its tool's answer", async () => {
    const [tool] = calvinToolsFor(existing("Community water supply", "CWS").facts);
    expect(await er(tool!, input)).toEqual(computeScenario({ ...input, method: 1 } as never).result);
    const [none] = calvinToolsFor(existing("Institutional water treatment technologies").facts);
    expect(() => none!.execute(input)).toThrow(NO_CALCULATOR_YET);
  });
  it("his shape asks for the two facts, and says each is a project fact", () => {
    const s = computeScenarioTool.inputSchema as { required: string[]; properties: Record<string, { description?: string }> };
    expect(s.required).toEqual(expect.arrayContaining(["waterSource", "treatment"]));
    expect(s.properties).not.toHaveProperty("technology");
    expect(s.properties.sourceSafe!.description).toMatch(/^A PROJECT FACT\./);
  });
});

describe("the guards on his numbers", () => {
  const { calc } = mount(record(SUPPLY));
  const reply = (values: CalvinReply["values"], facts: CalvinReply["facts"] = {}): CalvinReply => ({ reply: "Thanks.", handBack: "none", leftForNow: [], facts, values: values ?? {} });
  const guard = (r: CalvinReply, messages: string[], asked?: string) => guardCalvinReply(r, { state: calc.state, messages, ...(asked !== undefined ? { asked } : {}) });
  it("a number the visitor gave stays; one they did not give comes back, then is taken out and said", () => {
    const g = guard(reply({ operationalDays: 300, meteredVolumeL: 5000 }, { population: { served: 900, mode: "people" } }), ["It runs three hundred days a year."]);
    expect(g.reply.values).toEqual({ operationalDays: 300 });
    expect(g.reply.facts?.population).toEqual({ mode: "people" });
    expect(g.returned).toMatch(/Water produced in a year 5000; People served 900/);
    expect(g.told).toBe("Water produced in a year and People served: not filled in, because the number is not in your messages. Please type it again.");
  });
  it("what the screen already holds is dropped with no fault, and a null still clears", () => {
    const g = guard(reply({ populationCount: 1200, litresPerPersonPerDay: 4, meteredVolumeL: null }), ["Yes."]);
    expect([g.reply.values, g.returned, g.told]).toEqual([{ meteredVolumeL: null }, null, null]);
  });
  it("a share said as a percent, and a zero said as none to that question", () => {
    expect(guard(reply({ waterQualityFactor: 0.9 }), ["About 90% pass."]).reply.values).toEqual({ waterQualityFactor: 0.9 });
    expect(guard(reply({ activityEmissions: 0 }), ["None."], "activityEmissions").reply.values).toEqual({ activityEmissions: 0 });
    expect(guard(reply({ activityEmissions: 0 }), ["None."]).returned).not.toBeNull();
  });
  it("the out-of-range message for the fact just asked, whether or not he sent the number", () => {
    const words = "Days of operation must be between 0 and 365.";
    expect(guard(reply({}), ["Around 400 days"], "operationalDays").outOfRange).toBe(words);
    expect(guard(reply({ operationalDays: 400 }), ["Around 400 days"], "operationalDays").outOfRange).toBe(words);
    expect(guard(reply({}), ["minus 5"], "population.served").outOfRange).toBe("People served must be a whole number, 1 or more.");
    expect(guard(reply({}), ["Around 300 days"], "operationalDays").outOfRange).toBeNull();
    expect(guard(reply({}), ["Around 400 days"]).outOfRange).toBeNull();
  });
});

it("today's rules are on the record from the first fact", () => expect(record(SUPPLY).facts.rules).toBe(PROJECT_RULES));

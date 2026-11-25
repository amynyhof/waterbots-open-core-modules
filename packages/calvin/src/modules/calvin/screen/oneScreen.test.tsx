// One calculator screen (J5, ruling 2026-11-23): Calvin's side. Notes on values, his colour, and his notes in the
// Free site's export. No sum changes. Every project here is INVENTED.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { agentNotesLabel, NOTE_WORDS } from "@waterbots/core/notes";
import { ReadOnlySeat } from "@waterbots/core/readOnly";
import CalculatorWork from "./CalculatorWork";
import type { CalvinProject } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";
import { calvinAgentNoteLines, calvinNoteFacts, calvinNoteText } from "../agent/exportNotes";
import { computeScenarioTool, transitionWaterfallTool } from "../agent/tools";
import { computeScenario, type SiteTables } from "../engine";
import EquationStack from "./EquationStack";

const project = (extra: Partial<CalvinProject> = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology: "CWS",
  country: "KEN",
  population: { mode: "people", served: 1200 },
  ...extra,
});

function mount(p: CalvinProject, options: CalculatorOptions = {}, tab = "calculator", readOnly = false): { calc: CalculatorState; html: string } {
  let calc: CalculatorState | undefined;
  function Seat() {
    calc = useCalculatorState(p, { ...options, readOnly });
    return <CalculatorWork calc={calc} project={p} appVersion="0.0.0" tab={tab} />;
  }
  const html = renderToStaticMarkup(
    <ReadOnlySeat readOnly={readOnly}>
      <Seat />
    </ReadOnlySeat>,
  );
  return { calc: calc!, html };
}

const at = "2026-11-23T10:00:00.000Z";
const freeSite: CalculatorOptions = { place: "free-site", exAnteOnly: true, exAnteSliders: true, unpinFigureBlock: true, hideExportButton: true };
const paidSite: CalculatorOptions = { place: "paid-site" };

describe("notes on the Paid site", () => {
  const notes = { "eq:1:EF_b": { text: "From the made-up baseline survey.", changed: at, label: "EF_b, Emissions per litre boiled (baseline)" } };

  it("every value row and equation row takes the person's note", () => {
    const { html } = mount(project(), { ...paidSite, notes });
    expect(html).toContain("From the made-up baseline survey.");
    expect(html).toContain(NOTE_WORDS.add);
    expect(html).toContain('data-row-note="eq:1:EF_b"');
    expect(html).toContain('data-row-note="value:');
  });

  it("the report lists the notes under Notes on values", () => {
    const { html } = mount(project(), { ...paidSite, notes }, "report");
    const report = html.slice(html.indexOf("print-report"));
    expect(report).toContain(NOTE_WORDS.heading);
    expect(report).toContain("EF_b, Emissions per litre boiled (baseline)");
    expect(report).toContain("From the made-up baseline survey.");
  });

  it("a read-only seat sees the notes and cannot write them", () => {
    const { html, calc } = mount(project(), { ...paidSite, notes }, "calculator", true);
    expect(html).toContain("From the made-up baseline survey.");
    expect(html).not.toContain(NOTE_WORDS.add);
    expect(html).not.toContain(NOTE_WORDS.change);
    calc.setValueNote("eq:1:EF_b", "changed", "EF_b");
    expect(calc.valueNotes).toEqual(notes);
  });
});

describe("no note box anywhere else", () => {
  it("the Free site, the Agent Commons, MCP and a site that names no place show no note box", () => {
    for (const options of [freeSite, { place: "agent-commons" as const }, { place: "mcp" as const }, {}]) {
      const { html } = mount(project(), options);
      expect(html).not.toContain("data-row-note");
      expect(html).not.toContain(NOTE_WORDS.add);
    }
  });

  it("the Free site's and the Agent Commons' exports carry notes, and they are Calvin's, under his label", () => {
    for (const options of [freeSite, { ...freeSite, place: "agent-commons" as const }, { place: "agent-commons" as const }]) {
      const html = mount(project(), options, "report").html;
      expect(html).toContain(NOTE_WORDS.heading);
      expect(html).toContain(agentNotesLabel("Calvin"));
      expect(html).not.toContain(NOTE_WORDS.byPerson);
      expect(html).toContain("the credit estimate will likely change");
    }
  });

  it("the Agent Commons' notes are the Free site's", () => {
    expect(mount(project(), { ...freeSite, place: "agent-commons" }).calc.noteLines).toEqual(mount(project(), freeSite).calc.noteLines);
  });

  it("at MCP, and on a site that names no place, the export carries none", () => {
    for (const options of [{ place: "mcp" as const }, {}]) {
      expect(mount(project(), options, "report").html).not.toContain(NOTE_WORDS.heading);
    }
  });
});

describe("Calvin's notes in the Free site's export", () => {
  it("come from the run's facts: each value still assumed or blank, and nothing else", () => {
    const { calc } = mount(project(), freeSite);
    const facts = calvinNoteFacts(calc.state);
    expect(facts.map((f) => [f.key, f.standing])).toEqual([
      ["slider:litres", "assumed"],
      ["slider:days", "assumed"],
      ["slider:testsPass", "assumed"],
      ["production", "blank"],
      ["cBaseline", "assumed"],
      ["xCleanboil", "assumed"],
      ["pump", "assumed"],
      ["embodied", "blank"],
    ]);
  });

  it("a value the person set is no longer noted", () => {
    const { calc } = mount(project({ analysis: { operationalDays: 300, operationalDaysEntered: true } as never }), freeSite);
    expect(calvinNoteFacts(calc.state).map((f) => f.key)).not.toContain("slider:days");
  });

  it("a household device with no count per household is noted as assumed, once a flow rate makes it matter", () => {
    const hwt = (analysis = {}) => mount(project({ technology: "HWT", population: { mode: "households", served: 300 }, analysis }), freeSite).calc;
    const none = calvinNoteFacts(hwt().state);
    expect(none).toContainEqual({ key: "deviceCapacity", label: "Water a device can treat in an hour", standing: "blank" });
    expect(none.map((f) => f.key)).not.toContain("devicesPerPremises");
    const withRate = calvinNoteFacts(hwt({ deviceCapacityLPerHour: 2 }).state);
    expect(withRate).toContainEqual({ key: "devicesPerPremises", label: "Devices per household", standing: "assumed" });
    expect(withRate.map((f) => f.key)).not.toContain("deviceCapacity");
    expect(calvinNoteFacts(hwt({ deviceCapacityLPerHour: 2, devicesPerPremises: 1 }).state).map((f) => f.key)).not.toContain("devicesPerPremises");
  });

  it("state no number (agent rule 7)", () => {
    const { calc } = mount(project({ technology: "HWT", population: { mode: "households", served: 300 } }), freeSite);
    for (const line of calvinAgentNoteLines(calc.state)) {
      expect(line.text).not.toMatch(/\d/);
      expect(line.amount).toBe("");
    }
    expect(calvinNoteText({ key: "x", label: "Something", standing: "blank" })).toBe("Something was left blank. Once it is known, the credit estimate will likely change.");
  });

  it("a value that can only limit the credits says they may change", () => {
    expect(calvinNoteText({ key: "production", label: "Water the system will produce in a year", standing: "blank" })).toBe(
      "Water the system will produce in a year was left blank. Once it is known, the credit estimate may change.",
    );
    expect(calvinNoteText({ key: "pump", label: "Something", standing: "assumed" })).toContain("may change");
  });
});

describe("the Paid site's export shows both kinds of note", () => {
  const notes = { "eq:1:EF_b": { text: "From the made-up baseline survey.", changed: at, label: "EF_b, Emissions per litre boiled (baseline)" } };

  it("the person's under their label, and Calvin's under his, never mixed", () => {
    const { html } = mount(project(), { ...paidSite, notes }, "report");
    const at = html.indexOf('data-notes-by="agent"');
    const person = html.slice(html.indexOf('data-notes-by="person"'), at);
    const agent = html.slice(at, html.indexOf("</section>", at));
    expect(person).toContain(NOTE_WORDS.byPerson);
    expect(person).toContain("From the made-up baseline survey.");
    expect(person).not.toContain("credit estimate");
    expect(agent).toContain(agentNotesLabel("Calvin"));
    expect(agent).toContain("Days of operation a year is assumed for now.");
    expect(agent).not.toContain("From the made-up baseline survey.");
  });

  it("with no note from the person, Calvin's still show, and a read-only seat's export has them too", () => {
    for (const readOnly of [false, true]) {
      const { html } = mount(project(), paidSite, "report", readOnly);
      expect(html).toContain(agentNotesLabel("Calvin"));
      expect(html).not.toContain(NOTE_WORDS.byPerson);
    }
  });

  it("his notes never reach the screen's note boxes or the person's notes", () => {
    const { html, calc } = mount(project(), { ...paidSite, notes });
    expect(calc.valueNotes).toEqual(notes);
    const screen = html.slice(0, html.indexOf("print-report"));
    expect(screen).not.toContain("the credit estimate will likely change");
  });
});

describe("Calvin's notes follow the tags the screen shows", () => {
  const ALL = ["profile", "se", "ef_b", "q_pop", "qpw_hh", "q_y", "q_adj", "be_u", "be_cb", "pe", "le", "er"];
  const tags = (calc: CalculatorState, screening = false) => {
    const html = renderToStaticMarkup(
      <EquationStack result={calc.result!} state={calc.state} patch={() => {}} seed={calc.seed} sliders={calc.sliders} screening={screening} initialOpen={ALL} {...(calc.tables ? { tables: calc.tables } : {})} />,
    );
    return (html.match(/>assumed<\/span>/g) ?? []).length;
  };
  const hwt = { technology: "HWT" as const, population: { mode: "households" as const, served: 300 } };
  const mixTable: SiteTables = {
    baselineMix: {
      source: "invented table",
      countries: {
        KEN: {
          name: "Kenya",
          fuel: { dataYear: 2025, published: "2026-01-01", percent: { biomass: 70, charcoal: 20, gas: 10 } },
          stove: { surveyId: "INVENTED-1", surveyType: "invented", surveyYear: 2025, fieldwork: null, published: null, percent: { "3SO": 60, TSW: 20, MSW: 20 } },
        },
      },
    },
  };
  const cases: [string, CalvinProject, CalculatorOptions][] = [
    ["a community system, Paid site", project(), paidSite],
    ["a community system, Free site", project(), freeSite],
    ["a hand pump", project({ pumpPower: "hand" }), paidSite],
    ["a household device, no flow rate", project(hwt), paidSite],
    ["a household device, with a flow rate", project({ ...hwt, analysis: { deviceCapacityLPerHour: 2 } }), paidSite],
    ["a household device, Free site", project(hwt), freeSite],
    ["values the person entered", project({ analysis: { operationalDays: 300, operationalDaysEntered: true, mQuality: 0.9, mQualityEntered: true, cBaseline: 0.1, xCleanboil: 0.1, xCleanboilEntered: true, activityEmissions: 1 } }), paidSite],
    ["a site with its own stove and fuel table", project(), { ...paidSite, tables: mixTable }],
    ["after the project runs", project({ analysis: { mode: "ex-post", operationalDays: 300, operationalDaysEntered: true, mQuality: 0.9, mQualityEntered: true, xCleanboil: 0.1, xCleanboilEntered: true } }), paidSite],
  ];
  it.each(cases)("%s", (_name, p, options) => {
    const { calc } = mount(p, options);
    const facts = calvinNoteFacts(calc.state, { sliders: calc.sliders, result: calc.result });
    const assumed = facts.filter((f) => f.standing === "assumed");
    // Two rows tag a value the notes say another way: the device's blank flow rate, tagged assumed, and the preset's
    // own line above its stove and fuel rows.
    const extra = (facts.some((f) => f.key === "deviceCapacity") ? 1 : 0) + (calc.result!.baselineMix.stove === "preset" && calc.result!.baselineMix.fuel === "preset" ? 1 : 0);
    expect(tags(calc, options.exAnteOnly === true)).toBe(assumed.length + extra);
  });

  it("the stove and fuel mix is noted only when no source stands behind it", () => {
    const keys = (o: CalculatorOptions) => mount(project(), o).calc.noteLines.map((l) => l.key);
    expect(keys(paidSite)).toEqual(expect.arrayContaining(["stoveMix", "fuelMix"]));
    const cited = keys({ ...paidSite, tables: mixTable });
    expect(cited).not.toContain("stoveMix");
    expect(cited).not.toContain("fuelMix");
  });

  it("with typed boxes the litres are a cited default, so they get no note", () => {
    expect(mount(project(), paidSite).calc.noteLines.map((l) => l.key)).not.toContain("slider:litres");
    expect(mount(project(), freeSite).calc.noteLines.map((l) => l.key)).toContain("slider:litres");
  });

  it("after the project runs, a monitoring value nobody entered is blank, never assumed", () => {
    const { calc } = mount(project({ analysis: { mode: "ex-post" } }), paidSite);
    const monitored = calvinNoteFacts(calc.state).filter((f) => ["slider:days", "slider:testsPass", "xCleanboil"].includes(f.key));
    expect(monitored.map((f) => f.standing)).toEqual(["blank", "blank", "blank"]);
  });
});

describe("at MCP his tools return the facts", () => {
  const input = { version: "paa", method: 1, waterSource: "new", treatment: "none", sourceSafe: true, countryIso: "KEN", populationMode: "people", populationCount: 1200, litresPerPersonPerDay: 4, operationalDays: 347 };
  type Out = { blankOrAssumed: { key: string; standing: string }[] };

  it("the calculator tool says which values are blank or assumed, in no words of his", async () => {
    const run = await computeScenarioTool.execute(input);
    expect((run.output as Out).blankOrAssumed.map((f) => [f.key, f.standing])).toEqual([
      ["stoveMix", "assumed"],
      ["fuelMix", "assumed"],
      ["testsPass", "assumed"],
      ["production", "blank"],
      ["cBaseline", "assumed"],
      ["xCleanboil", "assumed"],
      ["pump", "assumed"],
      ["embodied", "blank"],
    ]);
    expect(JSON.stringify((run.output as Out).blankOrAssumed)).not.toMatch(/likely change|may change/);
  });

  it("a value the person gives is no longer listed", async () => {
    const run = await computeScenarioTool.execute({ ...input, C_b: 0.1, meteredVolumeL: 1_000_000 });
    const keys = (run.output as Out).blankOrAssumed.map((f) => f.key);
    expect(keys).not.toContain("cBaseline");
    expect(keys).not.toContain("production");
  });

  it("the transition tool gives them too, for its V2.0 side", async () => {
    const run = await transitionWaterfallTool.execute({ ...input, version: "legacy", fnrbFiledV1: 0.8 });
    expect((run.output as Out).blankOrAssumed.map((f) => f.key)).toContain("embodied");
  });

  it("every other part of the output is the engine's own", async () => {
    const { blankOrAssumed, ...rest } = (await computeScenarioTool.execute(input)).output as Out & Record<string, unknown>;
    expect(blankOrAssumed.length).toBeGreaterThan(0);
    expect(rest).toEqual(computeScenario(input as never));
  });
});

describe("his colour and his sums", () => {
  it("the header card carries his colour through the one shared name, Tide for now", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.calvin-pin \{[^}]*--agent: var\(--tide, #0e7c86\);[^}]*border-top: 3px solid var\(--agent\);/);
  });

  it("notes change no figure: the same project gives the same credits on every place", () => {
    const figures = [freeSite, paidSite, { ...paidSite, notes: { "eq:1:EF_b": { text: "x", changed: at } } }, {}].map((o) => {
      const { calc } = mount(project(), { ...o, exAnteOnly: true, exAnteSliders: true });
      return calc.paaResult?.result.ER;
    });
    expect(new Set(figures).size).toBe(1);
    expect(figures[0]).toBeGreaterThan(0);
  });
});

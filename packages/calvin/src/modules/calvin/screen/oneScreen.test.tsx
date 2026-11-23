// One calculator screen (J5, ruling 2026-11-23): Calvin's side. Notes on values, his colour, and his notes in the
// Free site's export. No sum changes. Every project here is INVENTED.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NOTE_WORDS } from "@waterbots/core/notes";
import { ReadOnlySeat } from "@waterbots/core/readOnly";
import CalculatorWork from "./CalculatorWork";
import type { CalvinProject } from "./state";
import { useCalculatorState, type CalculatorOptions, type CalculatorState } from "./useCalculatorState";
import { calvinAgentNoteLines, calvinNoteFacts, calvinNoteText } from "../agent/exportNotes";

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

  it("only the Free site's export carries notes, and they are Calvin's", () => {
    const free = mount(project(), freeSite, "report").html;
    expect(free).toContain(NOTE_WORDS.heading);
    expect(free).toContain("the credit estimate will likely change");
    for (const options of [{ place: "agent-commons" as const }, { place: "mcp" as const }, {}]) {
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
      ["cBaseline", "assumed"],
      ["xCleanboil", "assumed"],
      ["embodied", "blank"],
    ]);
  });

  it("a value the person set is no longer noted", () => {
    const { calc } = mount(project({ analysis: { operationalDays: 300, operationalDaysEntered: true } as never }), freeSite);
    expect(calvinNoteFacts(calc.state).map((f) => f.key)).not.toContain("slider:days");
  });

  it("a household device with no count per household is noted as blank", () => {
    const { calc } = mount(project({ technology: "HWT", population: { mode: "households", served: 300 } }), freeSite);
    expect(calvinNoteFacts(calc.state)).toContainEqual({ key: "devicesPerPremises", label: "Devices per household", standing: "blank" });
  });

  it("state no number (agent rule 7)", () => {
    const { calc } = mount(project({ technology: "HWT", population: { mode: "households", served: 300 } }), freeSite);
    for (const line of calvinAgentNoteLines(calc.state)) {
      expect(line.text).not.toMatch(/\d/);
      expect(line.amount).toBe("");
    }
    expect(calvinNoteText({ key: "x", label: "Something", standing: "blank" })).toBe("Something was left blank. Once it is known, the credit estimate will likely change.");
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

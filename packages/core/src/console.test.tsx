/// <reference types="node" />
// Family 4, Console and surfaces: core's shared parts. Every project here is made up.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AGENT_COLOURS, agentColour, agentStyle } from "./agentColours";
import { COMMONS_WORDS, commonsAgents, type AgentCard } from "./commons";
import { BETA_NOTE, CONSOLE_STEPS, EXPORT_WORDS, KEEP_CHATTING, UNSAVED_WARNING, handoffLabel } from "./consoleWords";
import { CREW } from "./crew";
import { PRINTING_ATTRIBUTE, PRINT_ROOT_CLASS, printReport } from "./print";
import { REPORT_FRAME_WORDS, REPORT_SECTIONS, ReportFrame, reportFooterLine, reportStamp } from "./report";
import { TAP_MIN, TAP_MIN_PX } from "./tap";
import type { NoteLine } from "./noteFacts";

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("one colour list (rule 7)", () => {
  it("Calvin is Reef and Violet is Orchid; the other three wait on the maintainer", () => {
    expect(agentColour("calvin")).toEqual({ name: "Reef", hex: "#0E8A94" });
    expect(agentColour("violet")).toEqual({ name: "Orchid", hex: "#A457D4" });
    expect([AGENT_COLOURS.wellington, AGENT_COLOURS.phoebe, AGENT_COLOURS.bridget]).toEqual([null, null, null]);
  });
  it("a screen's root sets --agent from it, and sets nothing while a colour is not ruled", () => {
    expect(agentStyle("calvin")).toEqual({ "--agent": "#0E8A94" });
    expect(agentStyle("phoebe")).toEqual({});
  });
});

describe("one tap size (rule 8)", () => {
  it("is 44 pixels, as a number, as CSS and as the token in both stylesheets", () => {
    expect(TAP_MIN_PX).toBe(44);
    expect(TAP_MIN).toBe("var(--wb-tap, 44px)");
    expect(read("./base.css")).toContain("--wb-tap: 44px;");
    expect(read("./report.css")).toContain("--wb-tap: 44px;");
  });
  it("core's note buttons take it", () => {
    expect(read("./notes.tsx")).toMatch(/const noteButton = \{\n  minHeight: TAP_MIN,\n  minWidth: TAP_MIN,/);
  });
});

describe("the console's words", () => {
  it("the six steps are the crew list's six phases, the shared page's three first", () => {
    expect(CONSOLE_STEPS.slice(0, 3)).toEqual(["Eligibility", "Partners", "Quantify"]);
    const phases = new Set(CREW.map((s) => s.phase).filter((p) => p !== "all"));
    expect(new Set(CONSOLE_STEPS)).toEqual(phases);
  });
  it("a hand-off button reads as the shared page says", () => {
    expect(handoffLabel("Partners", 2, 3, "Bridget")).toBe("Step 2 of 3: Partners. Meet Bridget");
  });
  it("the beta note says beta, can get things wrong, and the status sheet's scope", () => {
    expect(BETA_NOTE).toMatch(/^WaterBots is in beta and can get things wrong\. /);
    expect(BETA_NOTE).toContain("We are currently focused on carbon crediting and water benefits for safe water supply");
  });
  it("the export's words name one button and tell the person to choose Save as PDF", () => {
    expect(EXPORT_WORDS.button).toBe("Export report (PDF)");
    expect(EXPORT_WORDS.hint).toContain('"Save as PDF"');
    expect(EXPORT_WORDS.inTab).toMatch(/^No print window opened, so the report is open in its own tab\./);
    expect(EXPORT_WORDS.failed).toMatch(/^No print window opened, and the report could not open/);
    expect([KEEP_CHATTING, UNSAVED_WARNING.length > 0]).toEqual(["Keep chatting", true]);
  });
  it("no word of the console's has an exclamation mark (agent rule 5)", () => {
    for (const w of [BETA_NOTE, KEEP_CHATTING, UNSAVED_WARNING, ...Object.values(EXPORT_WORDS)]) expect(w).not.toContain("!");
  });
});

describe("the Agent Commons reads the installed agents (F4.3, rule 15)", () => {
  const card = (id: AgentCard["id"], version: string, places: AgentCard["places"]): AgentCard => ({ id, version, places, screen: false });
  it("lists the installed agents first, with their own versions; every other seat is coming", () => {
    const list = commonsAgents([card("violet", "0.10.0", ["free-site", "paid-site", "agent-commons", "mcp"]), card("calvin", "0.10.0", ["free-site", "paid-site", "agent-commons", "mcp"])]);
    expect(list.slice(0, 2).map((a) => [a.id, a.version, a.status, a.opens])).toEqual([
      ["calvin", "0.10.0", "installed", true],
      ["violet", "0.10.0", "installed", true],
    ]);
    expect(list.slice(2).every((a) => a.status === "coming" && a.version === null && !a.opens)).toBe(true);
    expect(list).toHaveLength(CREW.length);
  });
  it("names, role words and jobs come from the crew list; colours from core's list; every card is not yet graded", () => {
    const [calvin] = commonsAgents([card("calvin", "0.10.0", ["agent-commons"])]);
    const seat = CREW.find((s) => s.id === "calvin")!;
    expect(calvin).toMatchObject({ name: seat.name, role: seat.seat, job: seat.job, colour: AGENT_COLOURS.calvin, grade: COMMONS_WORDS.notGraded });
    expect(COMMONS_WORDS.notGraded).toBe("Not yet graded");
  });
  it("an installed agent opens only where its package works; a card given twice counts once", () => {
    const list = commonsAgents([card("bridget", "0.3.0", ["free-site", "paid-site"]), card("bridget", "9.9.9", ["agent-commons"])]);
    expect(list[0]).toMatchObject({ id: "bridget", version: "0.3.0", status: "installed", opens: false });
  });
});

describe("one report frame (rule 14)", () => {
  const lines: NoteLine[] = [{ key: "a", label: "Days a year", amount: "", text: "Assumed for now.", by: "agent" }];
  type FrameProps = Parameters<typeof ReportFrame>[0];
  const frame = (extra: Partial<FrameProps> = {}, omit: readonly ("conditions" | "site")[] = []) => {
    const props: FrameProps = {
      agent: "calvin",
      agentName: "Calvin",
      id: "r1",
      kind: "PAA V2.0 Report",
      stage: "Ex-ante estimate",
      title: "A title",
      projectName: "Invented test project",
      details: <p>details</p>,
      result: { title: "The result", body: <p>result</p> },
      method: { title: "The method", body: <p>method</p> },
      values: { title: "The values", body: <p>values</p> },
      conditions: { title: "What must be true", body: <p>conditions</p> },
      site: <p>site</p>,
      noteLines: lines,
      produced: <p>produced</p>,
      use: <p>use</p>,
      generatedAt: "26 Nov 2026, 19:00 GMT",
      versions: ["engine v1", "Calvin"],
      ...extra,
    };
    for (const k of omit) delete props[k];
    return renderToStaticMarkup(<ReportFrame {...props} />);
  };
  it("has one header, the sections in one order, and one footer", () => {
    const html = frame();
    const order = [...html.matchAll(/data-report-section="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["header", ...REPORT_SECTIONS]);
    expect(html).toContain(`${REPORT_FRAME_WORDS.brand} · PAA V2.0 Report`);
    expect(html).toContain('data-report-stage="">Ex-ante estimate');
    expect(html).toContain("<h2>Project details</h2>");
    expect(html).toContain("<h2>How these figures were produced</h2>");
    expect(html).toContain("<h2>On the use of these figures</h2>");
    expect(html).toContain('data-report-footer="">Generated 26 Nov 2026, 19:00 GMT · engine v1 · Calvin</footer>');
  });
  it("leaves out a section the report does not have, and never changes the order", () => {
    const order = [...frame({}, ["conditions", "site"]).matchAll(/data-report-section="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["header", "details", "result", "method", "values", "notes", "produced", "use"]);
  });
  it("sets the agent's colour on its own root, and can be hidden on screen", () => {
    expect(frame()).toMatch(/^<div id="r1" class="wb-report" data-wb-report="calvin" style="--agent:#0E8A94">/);
    expect(frame({ hidden: true, className: "print-report" })).toMatch(/^<div id="r1" class="wb-report print-report" data-wb-report="calvin" data-wb-report-hidden="" style="--agent:#0E8A94">/);
  });
  it("prints the notes in core's one table, under the agent's label", () => {
    expect(frame()).toContain("Notes added by Calvin, a WaterBots agent");
    expect(frame()).toMatch(/class="wb-notes" data-report-section="notes"/);
  });
  it("one time stamp: the day, the month in words, the year, the time and the zone", () => {
    expect(reportStamp(new Date("2026-11-27T00:25:20Z"), "UTC")).toBe("27 Nov 2026, 00:25 UTC");
    expect(reportFooterLine("", ["v1"])).toBe("Generated — · v1");
  });
  it("its stylesheet keeps the report inside the page, in one font, and prints only the print area", () => {
    const css = read("./report.css");
    expect(css).toMatch(/\.wb-report \{\n  box-sizing: border-box;\n  width: 100%;\n  max-width: 100%;/);
    expect(css).toContain("font-family: var(--font-sans,");
    expect(css).toContain("html[data-wb-printing] body > *:not(.wb-print-root) { display: none !important; }");
    expect(css).not.toMatch(/position: absolute/);
    expect(css).not.toMatch(/visibility: hidden/);
  });
});

// ── The print part, with a small stand-in for the page ───────────────────────────────────────────────────────────

interface FakeElement {
  className: string;
  children: FakeElement[];
  attrs: Map<string, string>;
  outerHTML: string;
  parent: FakeElement | null;
  appendChild(c: FakeElement): FakeElement;
  cloneNode(deep: boolean): FakeElement;
  remove(): void;
  setAttribute(k: string, v: string): void;
  removeAttribute(k: string): void;
  hasAttribute(k: string): boolean;
  querySelector(sel: string): { textContent: string } | null;
}
function el(className = "", html = "<div></div>"): FakeElement {
  const e: FakeElement = {
    className,
    children: [],
    attrs: new Map(),
    outerHTML: html,
    parent: null,
    appendChild(c) { c.parent = e; e.children.push(c); return c; },
    cloneNode() { return el(e.className, e.outerHTML); },
    remove() { if (e.parent) e.parent.children = e.parent.children.filter((c) => c !== e); e.parent = null; },
    setAttribute(k, v) { e.attrs.set(k, v); },
    removeAttribute(k) { e.attrs.delete(k); },
    hasAttribute(k) { return e.attrs.has(k); },
    querySelector(sel) { return sel === "h1" ? { textContent: "A title" } : null; },
  };
  return e;
}
type Listener = () => void;
function page(print: (fire: (type: string) => void) => void, opens = true) {
  const body = el("body");
  const html = el("html");
  const listeners = new Map<string, Set<Listener>>();
  const fire = (type: string) => { for (const l of [...(listeners.get(type) ?? [])]) l(); };
  const opened: string[] = [];
  const g = globalThis as Record<string, unknown>;
  g.document = {
    body,
    documentElement: html,
    title: "Page",
    createElement: () => el(),
    querySelectorAll: (sel: string) => (sel.includes(PRINT_ROOT_CLASS) ? body.children.filter((c) => c.className === PRINT_ROOT_CLASS) : []),
  };
  g.window = {
    addEventListener: (t: string, l: Listener) => { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t)!.add(l); },
    removeEventListener: (t: string, l: Listener) => listeners.get(t)?.delete(l),
    print: () => print(fire),
    open: (url: string) => { opened.push(url); return opens ? {} : null; },
    setTimeout: () => 0,
  };
  g.HTMLLinkElement = class {};
  return { body, html, listeners, opened };
}
const saved = { document: globalThis.document, window: globalThis.window };
afterEach(() => {
  Object.assign(globalThis as Record<string, unknown>, saved);
});

describe("the print part (rule 13)", () => {
  it("prints a copy of the report from its own area under <body>, and empties it after the print", () => {
    let seen: { area: number; printing: boolean } | null = null;
    const p = page((fire) => {
      fire("beforeprint");
      seen = { area: p.body.children.length, printing: p.html.hasAttribute(PRINTING_ATTRIBUTE) };
      fire("afterprint");
    });
    const report = el("wb-report", "<div class=\"wb-report\"><h1>A title</h1></div>");
    expect(printReport(report as unknown as HTMLElement)).toBe("printed");
    expect(seen).toEqual({ area: 1, printing: true });
    expect(p.body.children).toHaveLength(0);
    expect(p.html.hasAttribute(PRINTING_ATTRIBUTE)).toBe(false);
    expect(p.opened).toEqual([]);
  });
  it("when no print window opens, opens the report in its own tab and says so", () => {
    const p = page(() => {});
    expect(printReport(el("wb-report") as unknown as HTMLElement)).toBe("in-tab");
    expect(p.opened).toHaveLength(1);
    expect(p.body.children).toHaveLength(0);
  });
  it("when the tab cannot open either, says that too", () => {
    page(() => {}, false);
    expect(printReport(el("wb-report") as unknown as HTMLElement)).toBe("failed");
  });
});

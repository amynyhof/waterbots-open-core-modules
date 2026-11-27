// One calculator screen (J5, ruling 2026-11-23): Violet's side. Her header card, her parts that fold, notes on
// values, her colour and her report. No sum changes. Every project here is made up.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyRecord, setValueNote, type ProjectRecord } from "@waterbots/core/record";
import { agentNotesLabel, NOTE_WORDS } from "@waterbots/core/notes";
import { ReadOnlySeat } from "@waterbots/core/readOnly";
import D3Screen, { SCREEN_WORDS, type D3ScreenProps } from "./D3Screen.js";
import { REPORT_WORDS } from "./D3Report.js";
import { computeD3 } from "../d3/compute.js";
import { d3InputFromRecord } from "../record.js";
import { violetAgentNoteLines, violetNoteFacts, violetNoteText } from "../exportNotes.js";

const intake = { by: "site intake", note: "made up" } as const;
const at = "2026-11-23T10:00:00.000Z";

function made(): ProjectRecord {
  const r = emptyRecord();
  r.facts.name = "Made-up test project";
  r.facts.population = { value: { mode: "people", served: 1200 }, source: intake };
  r.facts.accessLevel = { value: "full", source: intake };
  r.facts.withoutProjectM3PerYear = { value: 500, source: intake };
  return r;
}

const render = (props: D3ScreenProps, readOnly = false) =>
  renderToStaticMarkup(
    <ReadOnlySeat readOnly={readOnly}>
      <D3Screen {...props} />
    </ReadOnlySeat>,
  );
/** The screen without her hidden report, and the report alone. */
const parts = (html: string) => {
  // Her report's root is core's report frame now (family 4).
  const at = html.lastIndexOf("<div", html.indexOf('data-wb-report="violet"'));
  return { screen: html.slice(0, at), report: html.slice(at) };
};

describe("her header card, like Calvin's", () => {
  const { screen } = parts(render({ record: made(), place: "free-site", lockView: "ex-ante" }));
  const pin = screen.slice(screen.indexOf("data-pinned-header"), screen.indexOf("data-under"));

  it("stays at the top, with her hero number in a tile and her draft label on it", () => {
    expect(pin).toContain('<span data-pill="">Water</span>');
    expect(pin).toContain('<p data-status="">Draft — pending expert review</p>');
    expect(pin).toContain('<span data-tile-name="">VWBA 2.0 D-3</span>');
    const r = computeD3({ ...d3InputFromRecord(made(), "ex-ante") });
    expect(pin).toContain(`<span data-tile-total="">${r.vwbM3PerYear!.toLocaleString("en")} m³/yr</span>`);
  });

  it("holds three smaller figures, each the engine's value with its tag, and a source line", () => {
    expect(pin).toContain('data-figure="withProjectM3PerYear"');
    expect(pin).toContain('data-figure="withoutProjectM3PerYear"');
    expect(pin).toContain('data-figure="peopleServed"');
    expect(pin).toMatch(/VWBA 2\.0 D-3 Volume Provided · \d+ defaults? · \d+ assumed/);
  });

  it("has the sentence under it, and the parts that fold, in Calvin's order", () => {
    expect(screen).toContain(SCREEN_WORDS.under);
    const order = ['data-fold="facts"', 'data-fold="sliders"', 'data-fold="calculation"', 'data-fold="conditions"'].map((f) => screen.indexOf(f));
    expect(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1]!))).toBe(true);
    expect(screen).toMatch(/<details data-fold="conditions">/);
  });

  it("can let the smaller figures scroll, as Calvin's can", () => {
    const html = parts(render({ record: made(), unpinFigureBlock: true })).screen;
    const pinned = html.slice(html.indexOf("data-pinned-header"), html.indexOf("data-under"));
    expect(pinned).not.toContain("data-figure-numbers");
    expect(html).toContain("data-figure-numbers");
  });

  it("each sum folds open to show its formula", () => {
    expect(screen).toMatch(/<ol aria-label="How the benefit is worked out"><li><details><summary>/);
  });
});

describe("sliders and typed boxes, as on Calvin's screens", () => {
  it("the Free site and a site that names no place: sliders", () => {
    for (const place of ["free-site", undefined] as const) expect(render({ record: made(), ...(place ? { place } : {}) })).toMatch(/type="range"/);
  });

  it("the Paid site: typed boxes before the project runs, with the assumed value and its tag", () => {
    const html = render({ record: made(), place: "paid-site" });
    expect(html).not.toMatch(/type="range"/);
    expect(html).toContain('data-slider-box="daysOfAccessPerYear"');
    expect(html).toContain(SCREEN_WORDS.boxes);
  });

  it("a site can still choose", () => {
    expect(render({ record: made(), place: "paid-site", exAnteSliders: true })).toMatch(/type="range"/);
    expect(render({ record: made(), place: "free-site", exAnteSliders: false })).not.toMatch(/type="range"/);
  });
});

describe("notes on values", () => {
  const noted = () => setValueNote(made(), "violet", "peopleServed", "Counted at a made-up site visit.", at, "People with access");

  it("the Paid site: a Your note column on every value, with the person's note from the record", () => {
    const { screen, report } = parts(render({ record: noted(), place: "paid-site" }));
    expect(screen).toContain(`<th scope="col">${NOTE_WORDS.column}</th>`);
    expect(screen).toContain("Counted at a made-up site visit.");
    expect(screen).toContain(NOTE_WORDS.add);
    expect(report).toContain(NOTE_WORDS.heading);
    expect(report).toContain("Counted at a made-up site visit.");
  });

  it("the Paid site's export shows both kinds, the person's under their label and hers under hers", () => {
    const { report } = parts(render({ record: noted(), place: "paid-site" }));
    const at = report.indexOf('data-notes-by="agent"');
    const person = report.slice(report.indexOf('data-notes-by="person"'), at);
    const agent = report.slice(at);
    expect(person).toContain(NOTE_WORDS.byPerson);
    expect(person).toContain("Counted at a made-up site visit.");
    expect(person).not.toContain("will likely change");
    expect(agent).toContain(agentNotesLabel("Violet"));
    expect(agent).toContain("Days of access in a year is an assumed value for now.");
    expect(agent).not.toContain("Counted at a made-up site visit.");
  });

  it("after the project runs, the Paid site's export still notes a value left blank", () => {
    const { report } = parts(render({ record: noted(), place: "paid-site", view: "ex-post", lockView: "ex-post" }));
    expect(report).toContain(agentNotesLabel("Violet"));
    expect(report).toContain("has not been given yet");
  });

  it("a read-only seat sees the notes and cannot write them", () => {
    const { screen } = parts(render({ record: noted(), place: "paid-site" }, true));
    expect(screen).toContain("Counted at a made-up site visit.");
    expect(screen).not.toContain(NOTE_WORDS.add);
    expect(screen).not.toContain(NOTE_WORDS.change);
  });

  it("the Free site: no note box; the export carries her own notes", () => {
    const { screen, report } = parts(render({ record: noted(), place: "free-site", lockView: "ex-ante" }));
    expect(screen).not.toContain(NOTE_WORDS.column);
    expect(screen).not.toContain("data-row-note");
    expect(report).toContain(NOTE_WORDS.heading);
    expect(report).toContain("Days of access in a year is an assumed value for now.");
    expect(report).not.toContain("Counted at a made-up site visit.");
  });

  it("the Agent Commons: no note box, and the export carries her own notes, as on the Free site", () => {
    const notesOf = (place: "agent-commons" | "free-site") => {
      const { screen, report } = parts(render({ record: noted(), place, lockView: "ex-ante" }));
      expect(screen).not.toContain("data-row-note");
      expect(report).not.toContain(NOTE_WORDS.byPerson);
      return report.slice(report.indexOf("data-notes-on-values"), report.indexOf("This is an estimate"));
    };
    expect(notesOf("agent-commons")).toContain(agentNotesLabel("Violet"));
    expect(notesOf("agent-commons")).toBe(notesOf("free-site"));
  });

  it("MCP and a site that names no place: no notes on the screen or in its export", () => {
    for (const place of ["mcp", undefined] as const) {
      const html = render({ record: noted(), ...(place ? { place } : {}) });
      expect(html).not.toContain("data-row-note");
      expect(html).not.toContain(NOTE_WORDS.heading);
    }
  });

  it("her notes come from the engine's values: blank or assumed, never a result, and with no number", () => {
    const blankAccess = emptyRecord();
    blankAccess.facts.population = { value: { mode: "people", served: 1200 }, source: intake };
    const r = computeD3(d3InputFromRecord(blankAccess, "ex-ante"));
    const facts = violetNoteFacts(r);
    expect(facts).toContainEqual({ key: "accessLevel", label: "Full or limited access", standing: "blank" });
    expect(facts.every((f) => r.values.find((v) => v.key === f.key)?.kind !== "result")).toBe(true);
    // A cited default nobody gives is not noted; the access level that chooses it is.
    expect(facts.map((f) => f.key)).not.toContain("litresPerPersonPerDayDefault");
    for (const line of violetAgentNoteLines(r)) expect(line.text).not.toMatch(/\d/);
    expect(violetNoteText({ key: "x", label: "Something", standing: "blank" }, false)).toBe(
      "Something has not been given yet, so the water benefit cannot be worked out. Once it is known, it can be.",
    );
  });
});

describe("the engine's own notes sit under the source", () => {
  it("there is no separate note column for them", () => {
    const html = render({ record: made() });
    expect(html).not.toContain("data-note=");
  });
});

describe("her report", () => {
  // SWITCHED OFF 2026-11-26, never deleted: it expects the title line "Water benefit report — …". Her report is on core's one frame now (family 4), with the kind in the WaterBots line and the method as the title. `family4.test.tsx` holds the new test.
  it.skip("holds the project, the method, her figure, her values, the steps, the conditions and the versions", () => {
    const { report } = parts(render({ record: made(), place: "paid-site", view: "ex-ante" }));
    expect(report).toContain(`${REPORT_WORDS.title} — VWBA 2.0 D-3 Volume Provided`);
    expect(report).toContain("Draft — pending expert review");
    expect(report).toContain("Made-up test project");
    expect(report).toContain(REPORT_WORDS.made);
    expect(report).toMatch(/D-3 engine v\d+\.\d+\.\d+/);
    expect(report).toContain("What must be true for this method");
  });

  it("has an Export button, unless the site hides it", () => {
    expect(render({ record: made() })).toContain(SCREEN_WORDS.export);
    expect(render({ record: made(), hideExportButton: true })).not.toContain(SCREEN_WORDS.export);
  });

  // SWITCHED OFF 2026-11-26, never deleted: it expects her own print rules. Core's print part prints every report now (family 4). `family4.test.tsx` holds the new test.
  it.skip("prints alone, and only while her export marks the page", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.violet-d3 \.violet-report \{ display: none;/);
    expect(css).toMatch(/@media print \{\s*:where\(:root\)\[data-wb-print="violet"\] body \* \{ visibility: hidden !important; \}/);
  });
});

describe("her colour", () => {
  // SWITCHED OFF 2026-11-26, never deleted: it expects her own --orchid token. Her colour comes from core's one list on her screen's root now (family 4). `family4.test.tsx` holds the new test.
  it.skip("Orchid, through the one shared name, on the header card", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    expect(css).toContain(".violet-d3 { --agent: var(--orchid); }");
    expect(css).toMatch(/\.violet-d3 \[data-pinned-header\] \{[^}]*border-top: 3px solid var\(--agent\);[^}]*color-mix\(in oklab, var\(--agent\) 7%, var\(--card\)\)/);
  });
});

describe("no sum changes", () => {
  it("the figure is the same on every place, with or without notes", () => {
    const figures = (["free-site", "paid-site", "agent-commons", "mcp", undefined] as const).map((place) => {
      const html = render({ record: setValueNote(made(), "violet", "peopleServed", "x", at), ...(place ? { place } : {}), exAnteSliders: true });
      return html.match(/<span data-tile-total="">([^<]*)<\/span>/)![1];
    });
    expect(new Set(figures).size).toBe(1);
    expect(figures[0]).toBe(`${computeD3(d3InputFromRecord(made(), "ex-ante")).vwbM3PerYear!.toLocaleString("en")} m³/yr`);
  });
});

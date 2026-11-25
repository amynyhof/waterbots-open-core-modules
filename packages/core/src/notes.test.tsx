// Notes on values (J5, one calculator screen). Every project here is made up.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyRecord, setValueNote, valueNotes, withNote } from "./record";
import { agentNotesLabel, exportNoteLines, labelledNoteLines, NotesOnValues, NOTE_WORDS, notesAt, personNoteLines, RowNote, ValueNotesProvider } from "./notes";
import type { NoteLine } from "./noteFacts";
import { makeCalculatorTool } from "./calculatorTool";
import { ReadOnlySeat } from "./readOnly";

const at = "2026-11-23T10:00:00.000Z";

describe("the person's notes live on the record, in the agent's own part", () => {
  // SWITCHED OFF 2026-11-24, never deleted: it expects a note that does not name its writer. A note names its writer now (agreed 2026-11-23).
  // `core030.test.tsx` holds the new tests.
  it.skip("sets, changes and removes a note, and leaves the record handed in as it was", () => {
    const r0 = emptyRecord();
    const r1 = setValueNote(r0, "violet", "peopleServed", "  Counted at a site visit.  ", at);
    expect(valueNotes(r1, "violet")).toEqual({ peopleServed: { text: "Counted at a site visit.", changed: at } });
    expect(r0.agents.violet).toBeUndefined();
    const r2 = setValueNote(r1, "violet", "peopleServed", " ", at);
    expect(r2.agents.violet?.notes).toBeUndefined();
    expect(valueNotes(r2, "calvin")).toEqual({});
  });

  it("a saved note reads back the same", () => {
    const r = setValueNote(emptyRecord(), "calvin", "eq:EF_b", "From the survey.", at);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  // SWITCHED OFF 2026-11-24, never deleted: it expects a note that does not name its writer. A note names its writer now (agreed 2026-11-23).
  // `core030.test.tsx` holds the new tests.
  it.skip("withNote changes only the notes it returns", () => {
    const notes = { a: { text: "x", changed: at } };
    expect(withNote(notes, "b", "y", at)).toEqual({ a: { text: "x", changed: at }, b: { text: "y", changed: at } });
    expect(notes).toEqual({ a: { text: "x", changed: at } });
  });
});

describe("whose notes each place shows", () => {
  it("a note box on the Paid site; the agent's in the export of the Free site and the Agent Commons; none elsewhere", () => {
    expect(notesAt("paid-site")).toBe("person");
    expect(notesAt("free-site")).toBe("agent");
    expect(notesAt("agent-commons")).toBe("agent");
    for (const p of ["mcp", "lobby-chat", undefined] as const) expect(notesAt(p)).toBeNull();
  });

  it("the Paid site's export carries both kinds; the Free site's and the Agent Commons' only the agent's", () => {
    const person: NoteLine[] = [{ key: "a", label: "A", amount: "1", text: "theirs", by: "person" }];
    const agent: NoteLine[] = [{ key: "a", label: "A", amount: "", text: "the agent's", by: "agent" }];
    expect(exportNoteLines(notesAt("paid-site"), person, agent)).toEqual([...person, ...agent]);
    expect(exportNoteLines(notesAt("free-site"), person, agent)).toEqual(agent);
    expect(exportNoteLines(notesAt("agent-commons"), person, agent)).toEqual(agent);
    expect(exportNoteLines(notesAt("mcp"), person, agent)).toEqual([]);
    expect(exportNoteLines(notesAt(undefined), person, agent)).toEqual([]);
  });
});

describe("the note box", () => {
  const notes = { peopleServed: { text: "Counted at a site visit.", changed: at } };

  it("shows nothing outside a screen that shows notes", () => {
    expect(renderToStaticMarkup(<RowNote noteKey="peopleServed" label="People with access" />)).toBe("");
  });

  it("shows the note and a button to change it, or a button to add one", () => {
    const html = renderToStaticMarkup(
      <ValueNotesProvider notes={notes} onChange={() => {}}>
        <RowNote noteKey="peopleServed" label="People with access" />
        <RowNote noteKey="days" label="Days of access" />
      </ValueNotesProvider>,
    );
    expect(html).toContain("Counted at a site visit.");
    expect(html).toContain(NOTE_WORDS.change);
    expect(html).toContain(NOTE_WORDS.add);
  });

  it("on a read-only seat shows the note, and no button", () => {
    const html = renderToStaticMarkup(
      <ReadOnlySeat readOnly>
        <ValueNotesProvider notes={notes} onChange={() => {}}>
          <RowNote noteKey="peopleServed" label="People with access" />
          <RowNote noteKey="days" label="Days of access" />
        </ValueNotesProvider>
      </ReadOnlySeat>,
    );
    expect(html).toContain("Counted at a site visit.");
    expect(html).not.toContain("<button");
  });
});

describe("the export's table", () => {
  it("lists the noted values in screen order, and nothing when there are none", () => {
    const lines = personNoteLines({ b: { text: "two", changed: at }, a: { text: "one", changed: at } }, [
      { key: "a", label: "A", amount: "1" },
      { key: "c", label: "C", amount: "3" },
      { key: "b", label: "B", amount: "2" },
    ]);
    expect(lines.map((l) => l.key)).toEqual(["a", "b"]);
    const html = renderToStaticMarkup(<NotesOnValues lines={lines} agent="Calvin" />);
    expect(html).toContain(NOTE_WORDS.heading);
    expect(html).toContain("two");
    expect(renderToStaticMarkup(<NotesOnValues lines={[]} agent="Calvin" />)).toBe("");
  });

  it("names a note by the label it keeps, and leaves out the amount column when no line has one", () => {
    const notes = withNote({}, "eq:EF_b", "From the survey.", at, "EF_b, emissions per litre boiled");
    expect(notes["eq:EF_b"]?.label).toBe("EF_b, emissions per litre boiled");
    const lines = labelledNoteLines(notes);
    expect(lines).toEqual([{ key: "eq:EF_b", label: "EF_b, emissions per litre boiled", amount: "", text: "From the survey.", by: "person" }]);
    const html = renderToStaticMarkup(<NotesOnValues lines={lines} agent="Calvin" />);
    expect(html).not.toContain(NOTE_WORDS.amount);
  });
});

describe("each kind of note is labelled, so nobody takes one for the other", () => {
  const lines: NoteLine[] = [
    { key: "a", label: "A", amount: "", text: "written by the agent", by: "agent" },
    { key: "a", label: "A", amount: "12 m³", text: "written by a person", by: "person" },
  ];

  it("the person's notes sit under their label, the agent's under its own name, in two tables", () => {
    const html = renderToStaticMarkup(<NotesOnValues lines={lines} agent="Calvin" />);
    const agentAt = html.indexOf('data-notes-by="agent"');
    const [person, agent] = [html.slice(0, agentAt), html.slice(agentAt)];
    expect(person).toContain('data-notes-by="person"');
    expect(person).toContain(NOTE_WORDS.byPerson);
    expect(person).toContain("written by a person");
    expect(person).not.toContain("written by the agent");
    expect(agent).toContain("Notes added by Calvin, a WaterBots agent");
    expect(agent).toContain("written by the agent");
    expect(agent).not.toContain("12 m³");
  });

  it("a kind with no notes shows no label", () => {
    const html = renderToStaticMarkup(<NotesOnValues lines={lines.slice(0, 1)} agent="Violet" />);
    expect(html).toContain(agentNotesLabel("Violet"));
    expect(html).not.toContain(NOTE_WORDS.byPerson);
  });
});

describe("a calculator tool gives the values a run left blank or assumed, as facts", () => {
  const base = {
    id: "calc/made-up",
    version: "0.0.0",
    description: "made up",
    inputSchema: {},
    compute: (n: number) => ({ twice: n * 2 }),
    parseInput: (raw: unknown) => raw as number,
    extractSources: () => ["made up"],
  };

  it("beside the output, which is otherwise the same", async () => {
    const facts = [{ key: "a", label: "A", standing: "assumed" as const }];
    const run = await makeCalculatorTool({ ...base, blankOrAssumed: () => facts }).execute(2);
    expect(run.output).toEqual({ twice: 4, blankOrAssumed: facts });
    expect(run.sources).toEqual(["made up"]);
  });

  it("a tool that does not give them has the same output as before", async () => {
    expect((await makeCalculatorTool(base).execute(2)).output).toEqual({ twice: 4 });
  });
});

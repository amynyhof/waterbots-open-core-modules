// Notes on values (J5, one calculator screen). Every project here is made up.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyRecord, setValueNote, valueNotes, withNote } from "./record";
import { labelledNoteLines, NotesOnValues, NOTE_WORDS, notesAt, personNoteLines, RowNote, ValueNotesProvider } from "./notes";
import { ReadOnlySeat } from "./readOnly";

const at = "2026-11-23T10:00:00.000Z";

describe("the person's notes live on the record, in the agent's own part", () => {
  it("sets, changes and removes a note, and leaves the record handed in as it was", () => {
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

  it("withNote changes only the notes it returns", () => {
    const notes = { a: { text: "x", changed: at } };
    expect(withNote(notes, "b", "y", at)).toEqual({ a: { text: "x", changed: at }, b: { text: "y", changed: at } });
    expect(notes).toEqual({ a: { text: "x", changed: at } });
  });
});

describe("whose notes each place shows", () => {
  it("the person's on the Paid site, the agent's in the Free site's export, none elsewhere yet", () => {
    expect(notesAt("paid-site")).toBe("person");
    expect(notesAt("free-site")).toBe("agent");
    for (const p of ["agent-commons", "mcp", "lobby-chat", undefined] as const) expect(notesAt(p)).toBeNull();
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
    const html = renderToStaticMarkup(<NotesOnValues lines={lines} />);
    expect(html).toContain(NOTE_WORDS.heading);
    expect(html).toContain("two");
    expect(renderToStaticMarkup(<NotesOnValues lines={[]} />)).toBe("");
  });

  it("names a note by the label it keeps, and leaves out the amount column when no line has one", () => {
    const notes = withNote({}, "eq:EF_b", "From the survey.", at, "EF_b, emissions per litre boiled");
    expect(notes["eq:EF_b"]?.label).toBe("EF_b, emissions per litre boiled");
    const lines = labelledNoteLines(notes);
    expect(lines).toEqual([{ key: "eq:EF_b", label: "EF_b, emissions per litre boiled", amount: "", text: "From the survey." }]);
    const html = renderToStaticMarkup(<NotesOnValues lines={lines} />);
    expect(html).not.toContain(NOTE_WORDS.amount);
  });
});

"use client";

// Notes on values (J5, one calculator screen; ruling 2026-11-23). Every calculator agent uses these parts, so the
// notes work the same on each screen and in each export.
//
// - The Paid site: the person writes a note on a value, to give context to their number. The "Your note" column and
//   the "Notes on values" table show there. A read-only seat sees the notes and cannot write them. An agent never
//   writes in the person's note box.
// - The export on the Paid site, the Free site and the Agent Commons also carries the agent's notes: one for each
//   value that is still blank or assumed. Core gives only the fact; each agent says it in its own words, and states
//   no new number (agent rule 7). The Free site and the Agent Commons have no note box.
// - Each kind of note has its own labelled table, so nobody takes an agent's note for the person's words.
// - MCP: no note box and no export. The agent's tool gives the facts (`calculatorTool.ts`), and the visitor's own AI
//   says them in its own words.

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Place } from "./places.js";
import type { NoteBy, NoteLine } from "./noteFacts.js";
import { NOTE_LIMIT, NOTE_TOO_LONG, type ValueNotes } from "./record.js";
import { useReadOnlySeat } from "./readOnly.js";
import { TAP_MIN } from "./tap.js";

export type { AgentNoteFact, NoteBy, NoteLine, NoteStanding } from "./noteFacts.js";

/** The words the note parts show. The same on every calculator screen. */
export const NOTE_WORDS = {
  /** The column, and the label on a note box. */
  column: "Your note",
  add: "Add a note",
  change: "Change note",
  done: "Done",
  /** The export's table. */
  heading: "Notes on values",
  value: "Value",
  amount: "Amount",
  note: "Note",
  /** The label over the notes a person wrote. The agent's is `agentNotesLabel`. */
  byPerson: "Notes written by a person",
} as const;

/** The label over the agent's notes: the agent's name, so nobody takes them for the person's words. */
export function agentNotesLabel(agent: string): string {
  return `Notes added by ${agent}, a WaterBots agent`;
}

/**
 * Which notes a place shows. "person": the person writes notes on the screen, and the export carries theirs and the
 * agent's. "agent": no note box, and the export carries the agent's. Null: no notes.
 */
export type NotesKind = "person" | "agent" | null;

export function notesAt(place: Place | undefined): NotesKind {
  if (place === "paid-site") return "person";
  if (place === "free-site" || place === "agent-commons") return "agent";
  return null;
}

/** The export's notes at a place: the person's first, then the agent's. Each is left out where the place has none. */
export function exportNoteLines(kind: NotesKind, person: readonly NoteLine[], agent: readonly NoteLine[]): NoteLine[] {
  return [...(kind === "person" ? person : []), ...(kind !== null ? agent : [])];
}

/** The person's notes as lines for the export, in the order of the values given. A value with no note is left out. */
export function personNoteLines(notes: ValueNotes, values: ReadonlyArray<{ key: string; label: string; amount: string }>): NoteLine[] {
  return values.flatMap((v) => {
    const n = notes[v.key];
    return n === undefined ? [] : [{ key: v.key, label: v.label, amount: v.amount, text: n.text, by: "person" as const }];
  });
}

/**
 * The person's notes as lines for the export, named by the label each note keeps, for a screen whose values are not
 * listed in one place. The amount is left empty: the report shows every value's amount in its own tables.
 */
export function labelledNoteLines(notes: ValueNotes): NoteLine[] {
  return Object.entries(notes).map(([key, n]) => ({ key, label: n.label ?? key, amount: "", text: n.text, by: "person" }));
}

// ── The note box on the screen ──────────────────────────────────────────────────────────────────────────────────

interface NotesContextValue {
  notes: ValueNotes;
  /** Writes a note on a value, with the value's name; an empty text removes it. Absent: the notes can be read, not written. */
  onChange?: (key: string, text: string, label: string) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

/**
 * Turns the note boxes on for the screen inside it. A screen puts it in only where notes show: on the Paid site.
 * Without it, `RowNote` shows nothing.
 */
export function ValueNotesProvider({ notes, onChange, children }: NotesContextValue & { children: ReactNode }) {
  return <NotesContext.Provider value={onChange ? { notes, onChange } : { notes }}>{children}</NotesContext.Provider>;
}

/** The notes on this screen, or null when the screen shows none. */
export function useValueNotes(): NotesContextValue | null {
  return useContext(NotesContext);
}

/**
 * The person's note on one value: the note, and a button to add or change it. A read-only seat shows the note and
 * no button. Outside a `ValueNotesProvider` it shows nothing.
 */
export function RowNote({ noteKey, label }: { noteKey: string; label: string }) {
  const ctx = useValueNotes();
  const readOnly = useReadOnlySeat();
  const [draft, setDraft] = useState<string | null>(null);
  if (ctx === null) return null;
  const note = ctx.notes[noteKey];
  const canWrite = ctx.onChange !== undefined && !readOnly;
  const tooLong = draft !== null && draft.trim().length > NOTE_LIMIT;

  if (draft !== null && canWrite) {
    return (
      <div data-row-note={noteKey} data-editing="" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-start", marginTop: 4 }}>
        <textarea
          aria-label={`${NOTE_WORDS.column}: ${label}`}
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          style={{ flex: "1 1 14rem", minWidth: 0, font: "inherit", fontSize: 12, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--fg-1)" }}
        />
        <button
          type="button"
          disabled={tooLong}
          onClick={() => {
            ctx.onChange!(noteKey, draft, label);
            setDraft(null);
          }}
          style={noteButton}
        >
          {NOTE_WORDS.done}
        </button>
        {tooLong ? (
          <span role="alert" data-note-too-long="" style={{ flexBasis: "100%", color: "var(--warn-text, var(--fg-1))", fontSize: 11 }}>
            {NOTE_TOO_LONG}
          </span>
        ) : null}
      </div>
    );
  }

  if (note === undefined && !canWrite) return null;
  return (
    <div data-row-note={noteKey} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline", marginTop: 2 }}>
      {note !== undefined ? (
        <p data-note-text="" style={{ margin: 0, flex: "1 1 12rem", minWidth: 0, paddingLeft: 6, borderLeft: "2px solid var(--agent, var(--line))", color: "var(--fg-2)", fontSize: 11 }}>
          <span style={{ color: "var(--fg-4)" }}>{NOTE_WORDS.column}: </span>
          {note.text}
        </p>
      ) : null}
      {canWrite ? (
        <button type="button" onClick={() => setDraft(note?.text ?? "")} style={noteButton}>
          {note !== undefined ? NOTE_WORDS.change : NOTE_WORDS.add}
        </button>
      ) : null}
    </div>
  );
}

const noteButton = {
  minHeight: TAP_MIN,
  minWidth: TAP_MIN,
  padding: "1px 6px",
  border: "1px dashed var(--line)",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: "var(--fg-3)",
  font: "inherit",
  fontSize: 11,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

// ── The export's table ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * The export's "Notes on values": the person's notes and the agent's, each in its own table under its own label.
 * `agent` is the agent's name. Nothing when there are no lines.
 */
export function NotesOnValues({ lines, agent }: { lines: readonly NoteLine[]; agent: string }) {
  if (lines.length === 0) return null;
  return (
    <section data-notes-on-values="">
      <h2 style={{ fontSize: 13, marginTop: 16, marginBottom: 6 }}>{NOTE_WORDS.heading}</h2>
      <NotesTable by="person" title={NOTE_WORDS.byPerson} lines={lines} />
      <NotesTable by="agent" title={agentNotesLabel(agent)} lines={lines} />
    </section>
  );
}

const noteCell = { padding: "3px 6px", borderBottom: "1px solid var(--line)", verticalAlign: "top" } as const;

function NotesTable({ by, title, lines }: { by: NoteBy; title: string; lines: readonly NoteLine[] }) {
  const own = lines.filter((l) => l.by === by);
  if (own.length === 0) return null;
  const withAmount = own.some((l) => l.amount !== "");
  const heads = withAmount ? [NOTE_WORDS.value, NOTE_WORDS.amount, NOTE_WORDS.note] : [NOTE_WORDS.value, NOTE_WORDS.note];
  return (
    <div data-notes-by={by}>
      <h3 style={{ fontSize: 11.5, fontWeight: 600, marginTop: 8, marginBottom: 4 }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h} scope="col" style={{ textAlign: "left", padding: "3px 6px", borderBottom: "1px solid var(--line)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {own.map((l) => (
            <tr key={l.key} data-note-line={l.key}>
              <td style={noteCell}>{l.label}</td>
              {withAmount ? <td style={{ ...noteCell, whiteSpace: "nowrap" }}>{l.amount}</td> : null}
              <td style={noteCell}>{l.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

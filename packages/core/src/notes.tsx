"use client";

// Notes on values (J5, one calculator screen; ruling 2026-11-23). Every calculator agent uses these parts, so the
// notes work the same on each screen and in each export.
//
// - The Paid site: the person writes a note on a value, to give context to their number. The "Your note" column and
//   the "Notes on values" table show there. A read-only seat sees the notes and cannot write them. An agent never
//   writes in the person's note box.
// - The Free site's screening: there is no note box. The export carries the agent's notes instead: one for each
//   value that is still blank or assumed. Core gives only the fact; each agent says it in its own words, and states
//   no new number (agent rule 7).
// - The Agent Commons and MCP: no note box, and no notes yet. That waits for the maintainer.

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Place } from "./places.js";
import type { ValueNotes } from "./record.js";
import { useReadOnlySeat } from "./readOnly.js";

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
} as const;

/** Whose notes a place shows: the person's on the Paid site, the agent's in the Free site's export, or none. */
export type NotesKind = "person" | "agent" | null;

export function notesAt(place: Place | undefined): NotesKind {
  if (place === "paid-site") return "person";
  if (place === "free-site") return "agent";
  return null;
}

/** A value an agent's note is about: still blank, or assumed. A fact only: the agent words the note itself. */
export type NoteStanding = "blank" | "assumed";

export interface AgentNoteFact {
  key: string;
  label: string;
  standing: NoteStanding;
}

/** One line of the export's "Notes on values" table. */
export interface NoteLine {
  key: string;
  label: string;
  /** The value as the screen shows it; empty when it is blank. */
  amount: string;
  text: string;
}

/** The person's notes as lines for the export, in the order of the values given. A value with no note is left out. */
export function personNoteLines(notes: ValueNotes, values: ReadonlyArray<{ key: string; label: string; amount: string }>): NoteLine[] {
  return values.flatMap((v) => {
    const n = notes[v.key];
    return n === undefined ? [] : [{ key: v.key, label: v.label, amount: v.amount, text: n.text }];
  });
}

/**
 * The person's notes as lines for the export, named by the label each note keeps, for a screen whose values are not
 * listed in one place. The amount is left empty: the report shows every value's amount in its own tables.
 */
export function labelledNoteLines(notes: ValueNotes): NoteLine[] {
  return Object.entries(notes).map(([key, n]) => ({ key, label: n.label ?? key, amount: "", text: n.text }));
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
          onClick={() => {
            ctx.onChange!(noteKey, draft, label);
            setDraft(null);
          }}
          style={noteButton}
        >
          {NOTE_WORDS.done}
        </button>
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

/** The export's "Notes on values" table. Nothing when there are no lines. */
export function NotesOnValues({ lines }: { lines: readonly NoteLine[] }) {
  if (lines.length === 0) return null;
  const withAmount = lines.some((l) => l.amount !== "");
  const heads = withAmount ? [NOTE_WORDS.value, NOTE_WORDS.amount, NOTE_WORDS.note] : [NOTE_WORDS.value, NOTE_WORDS.note];
  return (
    <section data-notes-on-values="">
      <h2 style={{ fontSize: 13, marginTop: 16, marginBottom: 6 }}>{NOTE_WORDS.heading}</h2>
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
          {lines.map((l) => (
            <tr key={l.key} data-note-line={l.key}>
              <td style={{ padding: "3px 6px", borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>{l.label}</td>
              {withAmount ? <td style={{ padding: "3px 6px", borderBottom: "1px solid var(--line)", verticalAlign: "top", whiteSpace: "nowrap" }}>{l.amount}</td> : null}
              <td style={{ padding: "3px 6px", borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>{l.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

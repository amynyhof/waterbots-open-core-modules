// The facts behind an agent's notes on values, and one line of an export's notes (J5). No React here, so an agent's
// tool can give the facts where there is no screen (MCP).

/** A value an agent's note is about: still blank, or assumed. A fact only: the agent words the note itself. */
export type NoteStanding = "blank" | "assumed";

export interface AgentNoteFact {
  key: string;
  label: string;
  standing: NoteStanding;
}

/** Who wrote a note: the person, or the agent. The export labels each kind, so nobody takes one for the other. */
export type NoteBy = "person" | "agent";

/** One line of the export's "Notes on values" tables. */
export interface NoteLine {
  key: string;
  label: string;
  /** The value as the screen shows it; empty when it is blank. */
  amount: string;
  text: string;
  by: NoteBy;
}

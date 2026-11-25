"use client";

// The plain note on a project that already exists, where a newer way of working it out exists (2026-11-25). The project
// keeps its answer. The button is the owner's choice to redo it, and a read-only seat has none.

import { NEWER_WAY_NOTE } from "./record.js";

/** The words on the button. */
export const REDO_WORDS = "Redo it";

export function NewerWay({ onRedo, readOnly = false }: { onRedo?: () => void; readOnly?: boolean }) {
  return (
    <p data-newer-way="" role="note" className="t-caption text-fg-2" style={{ margin: "0 0 8px" }}>
      {NEWER_WAY_NOTE}
      {onRedo !== undefined && !readOnly ? (
        <>
          {" "}
          <button type="button" onClick={onRedo} className="t-caption rounded-md border text-fg-1" style={{ padding: "2px 8px", background: "none", cursor: "pointer" }}>
            {REDO_WORDS}
          </button>
        </>
      ) : null}
    </p>
  );
}

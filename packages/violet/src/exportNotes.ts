// Violet's notes in the Free site's export (J5, one calculator screen; ruling 2026-11-23).
//
// On the Free site's screening there is no note box. The export carries Violet's notes instead: one for each value
// that is still blank or assumed, saying in plain words that the water benefit would likely change once it is
// known. Each note is worked out from the engine's own values (which are blank, which are assumed), never invented,
// and it states no new number (agent rule 7). Core gives only the fact; the words here are Violet's.

import type { AgentNoteFact, NoteLine } from "@waterbots/core/notes";
import type { D3Result } from "./d3/types.js";

/** The values of this run still blank or assumed, in the engine's order. A result left blank is not its own note. */
export function violetNoteFacts(result: D3Result): AgentNoteFact[] {
  return result.values.flatMap((v): AgentNoteFact[] => {
    if (v.kind === "result") return [];
    if (v.value === null) return [{ key: v.key, label: v.label, standing: "blank" }];
    if (v.origin === "assumed") return [{ key: v.key, label: v.label, standing: "assumed" }];
    return [];
  });
}

/** Violet's words for one fact. No number. `hasFigure` is false while the water benefit cannot be worked out. */
export function violetNoteText(fact: AgentNoteFact, hasFigure: boolean): string {
  if (fact.standing === "assumed") return `${fact.label} is an assumed value for now. When the project's own figure is known, the water benefit will likely change.`;
  return hasFigure
    ? `${fact.label} has not been given yet. When it is known, the water benefit will likely change.`
    : `${fact.label} has not been given yet, so the water benefit cannot be worked out. Once it is known, it can be.`;
}

/** Violet's notes for the export's "Notes on values" table. */
export function violetAgentNoteLines(result: D3Result): NoteLine[] {
  const hasFigure = result.vwbM3PerYear !== null;
  return violetNoteFacts(result).map((f) => ({ key: f.key, label: f.label, amount: "", text: violetNoteText(f, hasFigure) }));
}

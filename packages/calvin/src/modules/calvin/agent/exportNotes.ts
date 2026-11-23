// Calvin's notes in the Free site's export (J5, one calculator screen; ruling 2026-11-23).
//
// On the Free site's screening there is no note box. The export carries Calvin's notes instead: one for each value
// that is still blank or assumed, saying in plain words that the estimate would likely change once it is known.
// Each note is worked out from the facts of the run (which values are blank, which are assumed), never invented,
// and it states no new number (agent rule 7). Core gives only the fact; the words here are Calvin's.

import type { AgentNoteFact, NoteLine } from "@waterbots/core/notes";
import type { CalcState } from "../screen/state";
import { sliderLabel, sliderSpecs } from "../screen/exAnte";

/** The values of this run that are still blank or assumed, in the order the screen shows them. */
export function calvinNoteFacts(state: CalcState): AgentNoteFact[] {
  const facts: AgentNoteFact[] = sliderSpecs(state)
    .filter((s) => sliderLabel(state, s.key) === "assumed")
    .map((s) => ({ key: `slider:${s.key}`, label: s.label, standing: "assumed" }));
  // C_b: V2.0 sets no default for it; the screening shows the 0% it uses, locked, until a baseline survey sets it.
  facts.push({ key: "cBaseline", label: "Share of people who already had safe water", standing: "assumed" });
  if (!state.xCleanboilEntered) facts.push({ key: "xCleanboil", label: "Share of people who still boil the safe water", standing: "assumed" });
  // Devices per household: a household device's run counts 1 until it is given (Calvin's rulings).
  if (state.method === 2 && state.devicesPerPremises == null) facts.push({ key: "devicesPerPremises", label: "Devices per household", standing: "blank" });
  // Embodied emissions: the screens have no box for them yet, so a V2.0 run always leaves them blank.
  if (state.version === "paa") facts.push({ key: "embodied", label: "Emissions from making the new devices", standing: "blank" });
  return facts;
}

/** Calvin's words for one fact. No number. */
export function calvinNoteText(fact: AgentNoteFact): string {
  return fact.standing === "blank"
    ? `${fact.label} was left blank. Once it is known, the credit estimate will likely change.`
    : `${fact.label} is assumed for now. Once the project's own figure is known, the credit estimate will likely change.`;
}

/** Calvin's notes for the export's "Notes on values" table. */
export function calvinAgentNoteLines(state: CalcState): NoteLine[] {
  return calvinNoteFacts(state).map((f) => ({ key: f.key, label: f.label, amount: "", text: calvinNoteText(f) }));
}

/**
 * ONE OF BRIDGET'S TURNS: the turns no visitor typed, and the blocks she reads after her instructions. Carried from the
 * open site (`api/bridget.ts` and `api/_bridgetPin.ts`, commit 0f16957). The call to the model, its key, the daily limits,
 * the buttons and saving stay with each site.
 *
 * The order of a turn: her instructions first, the same bytes every time, so they can be cached; then the visit block;
 * then the record block, when there is a record; then, on the same question asked again, core's `FINISH_NOTE`.
 *
 * It calls no model.
 */
import { FINISH_NOTE } from "@waterbots/core/lookUp";
import { knownKindFacts } from "@waterbots/core/projectKinds";
import { stageWords, typeWords } from "@waterbots/core/projectWords";
import type { Population, ProjectRecord } from "@waterbots/core/record";
import type { GpsOutcome, PinnedBasin } from "./pin.js";

/** The turn the site sends when it opens her chat. Never shown as a bubble; her instructions name it. */
export const OPENED_TURN = "(The visitor opened Partners.)";
/** The same, when Wellington's line shows above her first answer, so he has introduced her (agent rule 17). */
export const OPENED_INTRODUCED_TURN = "(The visitor opened Partners. Wellington has introduced you.)";
/** The turn the site sends when the visitor pins a basin. */
export const PINNED_TURN = "(The visitor pinned a basin.)";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** What opened this turn, as the site says it. Exactly `true` counts. */
export interface TurnOpening {
  opened?: boolean;
  introduced?: boolean;
  pinned?: boolean;
}

/**
 * The chat as the model reads it, with the turn no visitor typed where one is needed, and the visitor's last words. Null
 * when there is nothing to answer.
 */
export function chatForTurn(chat: readonly ChatTurn[], opening: TurnOpening = {}): { chat: ChatTurn[]; lastWords: string; typed: boolean } | null {
  const out = chat.filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim() !== "");
  const opened = opening.opened === true;
  const introduced = opened && opening.introduced === true;
  // Her first answer follows a turn the site never keeps as a bubble, so a chat that starts with her opens on it again.
  if (out[0]?.role === "assistant") out.unshift({ role: "user", content: OPENED_TURN });
  const typed = out[out.length - 1]?.role === "user";
  const lastWords = typed ? out[out.length - 1]!.content : "";
  if (opening.pinned === true && !typed) out.push({ role: "user", content: PINNED_TURN });
  else if (opened && out.length === 0) out.push({ role: "user", content: introduced ? OPENED_INTRODUCED_TURN : OPENED_TURN });
  if (out[out.length - 1]?.role !== "user") return null;
  return { chat: out, lastWords, typed };
}

/**
 * The visit block: where Wellington heard the project is, which device, what came of GPS numbers, and what is pinned.
 * `place` is the visitor's own words from the record.
 */
export function visitBlock(place: string, phone: boolean, pin: PinnedBasin | null, gps: GpsOutcome | null = null): string {
  const lines = ["# This visit", ""];
  lines.push(place ? `Where the visitor told Wellington the project is, in their own words: "${place}".` : "Wellington has not heard where the project is.");
  lines.push(phone ? "The visitor is on a phone, so they tap." : "The visitor is on a computer, so they click.");
  if (gps === "found") lines.push("The visitor typed GPS numbers, and the console has pinned the basin they fall in.");
  if (gps === "outside") lines.push("The visitor typed GPS numbers, and they fall in no basin on this map. Say so, and ask them to check the numbers or pin it on the map.");
  if (gps === "failed") lines.push("The visitor typed GPS numbers, and the map could not be read just now, so no basin is pinned from them. Say so, and ask them to pin it on the map.");
  if (!pin) {
    lines.push("No basin is pinned yet.");
    return lines.join("\n");
  }
  const km2 = Math.round(pin.subAreaKm2).toLocaleString("en-GB");
  lines.push(
    `A basin is pinned. Its water stress reading is "${pin.stressLabel}". Its area, to give only if asked: ${km2} km².`,
    // These two lines describe the open site's map data. They go with the data at the map's own step.
    pin.level === 6
      ? "The reading is published: WRI Aqueduct 4.0’s own figure for this basin."
      : "The reading is derived: this site worked it out as the area-weighted majority of the smaller basins inside it, because WRI publishes no figure at this size. Zooming in to pin one of the smaller basins shows the published figure.",
    "Wellington joins this chat next with the next step. Do not name it yourself.",
  );
  return lines.join("\n");
}

/** The heading of the record block, the same one Phoebe reads. */
export const RECORD_HEADING = "What the visitor has already told Wellington";

/** "2,400 households": the count and the unit the visitor used, never converted. */
export function servedWords(p: Population): string | null {
  if (p.served === undefined || p.mode === undefined) return null;
  const unit = p.served === 1 ? (p.mode === "people" ? "person" : "household") : p.mode;
  return `${p.served.toLocaleString("en-US")} ${unit}`;
}

/**
 * The record block as she reads it: the facts on the shared record, the same record Phoebe reads, so she never asks for
 * what it holds. Null when the record holds none of them. Her one question stays the place. The words for a type and a
 * stage are core's one copy.
 */
export function bridgetRecordBlock(record: ProjectRecord): string | null {
  const { facts, place } = record;
  const lines: string[] = [];
  if (facts.does?.value) lines.push(`- What it does: ${facts.does.value}`);
  const type = facts.type ? typeWords(facts.type.value) : undefined;
  if (type) lines.push(`- What type: ${type.name} — ${type.plain}`);
  for (const line of knownKindFacts(facts)) lines.push(`- ${line}`);
  const stage = facts.stage ? stageWords(facts.stage.value) : undefined;
  if (stage) lines.push(`- Stage: ${stage.words} — ${stage.plain}`);
  const served = facts.population ? servedWords(facts.population.value) : null;
  if (served) lines.push(`- People served: ${served}, as the visitor said it`);
  if (place.words?.value) lines.push(`- Where it is: ${place.words.value}`);
  if (facts.name) lines.push(`- What it is called: ${facts.name}`);
  if (lines.length === 0) return null;
  return [`# ${RECORD_HEADING}`, "", "These are the visitor’s own words about their project, from the shared record. They are known, so never ask for them.", "", ...lines].join("\n");
}

/** The blocks after her instructions, in order. `again` is true when the same question goes again (the look-up fix). */
export function turnBlocks(visit: string, record: string | null, again = false): string[] {
  return [visit, ...(record !== null ? [record] : []), ...(again ? [FINISH_NOTE] : [])];
}

/**
 * ONE TURN OF WELLINGTON'S. Carried from the open site (`api/wellington.ts`, `api/_record.ts` and `src/lib/visit.ts`,
 * commit 0f16957), as pure functions a site calls around its own call to the model.
 *
 * The order of a turn: his instructions first, the same bytes every time (`wellingtonInstructions`), then the blocks for
 * this turn (`wellingtonBlocks`): what the record already holds, what Phoebe found, the agent map, where he is speaking,
 * and, on a second call, the note to answer now. After the answer comes back, `checkWellingtonTurn` sets the route a
 * step's end or a hand-off must carry, guards it by the map, and says whether the same question must go again.
 *
 * The site keeps the call to the model and its key, the daily limits, the buttons and chips on screen, saving and logging.
 */
import { FINISH_NOTE, leavesWaiting } from "@waterbots/core/lookUp";
import { knownKindFacts } from "@waterbots/core/projectKinds";
import { stageWords, typeWords } from "@waterbots/core/projectWords";
import { doorBlock, type DoorFacts, type Place } from "@waterbots/core/places";
import { isDegenerateReply } from "@waterbots/core/reply";
import { DRINKING_WATER_TYPE, NEW_SUPPLY_TYPE, type ProjectRecord } from "@waterbots/core/record";
import { readWellingtonAnswer, type Route, type WellingtonAnswer } from "./answer.js";
import { afterHomeUse, asksHomeUse, guardRoute, mapBlock, saysAllDone, stepEndNote, stepEndRoute, type Joined, type MapNote } from "./map.js";

// ── What the record already holds ───────────────────────────────────────────────────────────────────────────────

/** The heading his instructions name, so he knows the block when he sees it. */
export const VISIT_HEADING = "What this visit already holds";

/** "2,400 households": the count and the unit the visitor used, never converted. */
export function servedWords(count: number, unit: "people" | "households"): string {
  const word = count === 1 ? (unit === "people" ? "person" : "household") : unit;
  return `${count.toLocaleString("en-US")} ${word}`;
}

/** The two water supply types: the only ones he asks the source, the treatment and people served of. */
const WATER_TYPES: readonly string[] = [NEW_SUPPLY_TYPE, DRINKING_WATER_TYPE];

/** The facts the screening needs that are still blank. A blank stays blank: never zero, never a guess. */
export function stillBlank(record: ProjectRecord): string[] {
  const { facts, place } = record;
  const type = facts.type?.value;
  const water = type === undefined || WATER_TYPES.includes(type);
  const out: string[] = [];
  if (facts.does === undefined) out.push("what it does");
  if (type === undefined) out.push("what type");
  if (water && facts.waterSource === undefined) out.push("where the water comes from");
  if (water && facts.treatment === undefined) out.push("whether it is treated, and where");
  if (facts.stage === undefined) out.push("stage");
  if (type !== undefined && WATER_TYPES.includes(type) && facts.population?.value.served === undefined) out.push("people served");
  if (place.words === undefined && place.country === undefined) out.push("where it is");
  return out;
}

/** Each fact the record holds, as he reads it: never an id he would have to know. */
function recordLines(record: ProjectRecord): string[] {
  const { facts, place } = record;
  const lines: string[] = [];
  if (facts.does) lines.push(`- What it does: ${facts.does.value}`);
  const type = facts.type ? typeWords(facts.type.value) : undefined;
  if (type) lines.push(`- What type: ${type.name} — ${type.plain}`);
  for (const line of knownKindFacts(facts)) lines.push(`- ${line}`);
  const stage = facts.stage ? stageWords(facts.stage.value) : undefined;
  if (stage) lines.push(`- Stage: ${stage.words} — ${stage.plain}`);
  const pop = facts.population?.value;
  if (pop?.served !== undefined) {
    lines.push(pop.mode ? `- People served: ${servedWords(pop.served, pop.mode)}, as the visitor said it` : `- People served: ${pop.served.toLocaleString("en-US")}, not said whether people or households`);
  }
  const where = place.words?.value ?? place.country?.value;
  if (where) lines.push(`- Where it is: ${where}`);
  if (facts.name) lines.push(`- What it is called: ${facts.name}`);
  return lines;
}

/** The block as he reads it, or null for an empty record. */
export function visitBlock(record: ProjectRecord | null | undefined): string | null {
  if (!record) return null;
  const lines = recordLines(record);
  if (lines.length === 0) return null;
  const blank = stillBlank(record);
  return [
    `# ${VISIT_HEADING}`,
    "",
    "These fields are already on this visit — from the visitor, from a carried link, or from the map pin. If this visit already holds the project, do not introduce yourself as if this were a cold start. One next step.",
    "",
    ...lines,
    ...(blank.length ? ["", `Needed and still blank: ${blank.join("; ")}. Come back to each when its step needs it.`] : []),
  ].join("\n");
}

// ── What Phoebe found ───────────────────────────────────────────────────────────────────────────────────────────

/** The heading his instructions name. */
export const FOUND_HEADING = "What Phoebe found";

/** One pathway as he reads it: its read, and the rows behind it by id and by the title in her tool file. Never her sentences. */
export interface FoundPathway {
  /** The pathway's plain name, such as "Water benefits". */
  name: string;
  read: "likely" | "more to learn" | "unlikely" | "does not apply";
  /** False while none of its rows has been looked at. */
  looked: boolean;
  blocked: readonly { id: string; title: string }[];
  open: readonly { id: string; title: string }[];
}

/** The block, or null when Phoebe has found nothing yet. Her package works the pathways out from her worksheet. */
export function phoebeFoundBlock(found: readonly FoundPathway[] | null | undefined): string | null {
  if (!found || !found.some((p) => p.looked || p.read === "does not apply")) return null;
  const titled = (rows: FoundPathway["blocked"]): string => rows.map((r) => `${r.id} — ${r.title}`).join("; ");
  const lines = found.map((p) => {
    if (p.read === "does not apply") return `- ${p.name}: unlikely — it does not apply to this project.`;
    if (!p.looked) return `- ${p.name}: ${p.read} — not looked at yet.`;
    const parts = [`- ${p.name}: ${p.read}.`];
    if (p.blocked.length) parts.push(`Blocked: ${titled(p.blocked)}.`);
    if (p.open.length) parts.push(`Still open: ${titled(p.open)}.`);
    return parts.join(" ");
  });
  return [
    `# ${FOUND_HEADING}`,
    "",
    "Worked out from Phoebe’s worksheet for this visit, from the same rows the screen shows. Each read is hers, in rule 14’s words; never read out a row id. An unlikely path is never said as more to learn. Do not reopen her questions.",
    "",
    ...lines,
  ].join("\n");
}

// ── Where he is speaking ─────────────────────────────────────────────────────────────────────────────────────────

/** The colleagues he hands a visitor to, by the desk that opens each. */
const HAND_TO: Record<Joined, string> = { eligibility: "Phoebe", map: "Bridget", quantification: "Calvin", water: "Violet" };

/** The turn he answers when nobody typed: he joins a colleague's chat at the end of a step, or opens his own desk. Never shown. */
const AT_TURN: Record<Joined | "open", string> = {
  eligibility: "(Phoebe's step is done. Wellington joins the visitor in her chat.)",
  map: "(Bridget's step is done. Wellington joins the visitor in her chat.)",
  quantification: "(Calvin's part is done. Wellington joins the visitor in his chat.)",
  water: "(Violet's part is done. Wellington joins the visitor in her chat.)",
  open: "(The visitor has just arrived and has not said anything yet.)",
};

/** What he is told when he opens his own desk and speaks first. */
export const OPEN_NOTE =
  "# Where you are speaking\n\nThe visitor has just arrived on your desk and has said nothing yet. Speak first: who you are and what the team does, then one question about their project. If the record already holds something, use it and ask only for what is missing. Set no route.";

/** What he is told when the visitor reached a colleague's page by another way than his hand-off. */
export function handoffNote(to: Joined): string {
  return `# Where you are speaking\n\nThe visitor has just opened ${HAND_TO[to]}'s page, and you have not handed them over yet. Do it now, the way you hand the visitor to any colleague: fill the introduction field, which heads ${HAND_TO[to]}'s page, and set the route to "${to}". Your reply is kept on your own desk: the same hand-off, in one short sentence. Ask nothing.`;
}

/** What opened this turn, when the visitor did not type it. */
export type Opened =
  /** He joins a colleague's chat at the end of a step, or opens his own desk. */
  | { at: Joined | "open" }
  /** The visitor opened a colleague's page before he handed them over. */
  | { handoff: Joined }
  /** The visitor came back from Eligibility to his desk. */
  | { returned: true };

/** The line the model reads as the visitor's turn when nobody typed. Never shown. */
export function openedLine(opened: Opened): string {
  if ("handoff" in opened) return `(The visitor has opened ${HAND_TO[opened.handoff]}'s page. Wellington introduces them there.)`;
  if ("at" in opened) return AT_TURN[opened.at];
  return "(The visitor came back from Eligibility.)";
}

export interface TurnInput {
  place: Place;
  /** The shared record. None in the lobby chat. */
  record?: ProjectRecord | null;
  /** The map, as `mapNote` or `readMap` gives it. */
  map?: MapNote | null;
  /** What Phoebe found, from her package. */
  found?: readonly FoundPathway[] | null;
  /** What opened this turn, when nobody typed. */
  opened?: Opened;
  /** The visitor answered him in a colleague's chat, where he had joined at the end of a step. */
  replyingAt?: Joined;
  /** 1 for the first call, 2 when the same question goes again. */
  pass?: number;
  /** The visitor's own messages in this chat, oldest first. Never his. A fact about the kind is filled only from them. */
  messages?: readonly string[];
  /** The fact his last reply asked for: that answer's `asking`. */
  asked?: string;
  /** The door's plain facts, from the site. */
  door?: DoorFacts;
}

/** The blocks for this turn, in order, after his instructions. */
export function wellingtonBlocks(t: TurnInput): string[] {
  const out: string[] = [];
  const lobby = t.place === "lobby-chat";
  const visit = lobby ? null : visitBlock(t.record);
  if (visit) out.push(visit);
  const door = doorBlock(t.place, t.door);
  if (door) out.push(door);
  const found = lobby ? null : phoebeFoundBlock(t.found);
  if (found) out.push(found);
  const map = lobby ? null : (t.map ?? null);
  if (map) out.push(mapBlock(map, t.place));
  const opened = t.opened;
  if (opened && "handoff" in opened) out.push(handoffNote(opened.handoff));
  else if (opened && "at" in opened) out.push(opened.at === "open" ? OPEN_NOTE : stepEndNote(opened.at, map, false, t.place));
  else if (t.replyingAt) out.push(stepEndNote(t.replyingAt, map, true, t.place));
  // The same question again: this one has to end in an answer.
  if ((t.pass ?? 1) > 1) out.push(map && map.next !== "report or sign-up" ? `${FINISH_NOTE} A step is still ahead, so never say the screening, or every step, is done.` : FINISH_NOTE);
  return out;
}

// ── After his answer ─────────────────────────────────────────────────────────────────────────────────────────────

export type TurnOutcome =
  | { ok: true; answer: WellingtonAnswer }
  /** Ask the same question again at once, with `pass: 2`: the reply promised a look-up, or called the screening done too soon. */
  | { ok: false; again: "look-up" | "done too soon" }
  /** No answer can be shown. The site says so in its own words. */
  | { ok: false; fault: "empty" | "too short" | "no answer" };

function pick(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

/**
 * Checks his answer as it came from the model. On a hand-off the route is that page's; at the end of a step it is the
 * map's next one, so a hand-off never hangs on his remembering it. A desk the map has closed is never routed to, and an
 * introduction goes with its route. He has two calls at most: on the second, a reply that still promises a look-up is a
 * fault, and one that calls the screening done too soon is shown.
 */
export function checkWellingtonTurn(parsed: unknown, t: TurnInput): TurnOutcome {
  const map = t.place === "lobby-chat" ? null : (t.map ?? null);
  const pass = t.pass ?? 1;
  const handTo = t.opened && "handoff" in t.opened ? t.opened.handoff : null;
  const at = t.opened && "at" in t.opened ? t.opened.at : null;
  const answersHomeUse = t.replyingAt !== undefined && map !== null && asksHomeUse(map) && pick(pick(parsed, "context"), "homeUse") !== undefined;
  const set: Route | null =
    handTo ??
    (map && at && at !== "open" ? stepEndRoute(at, map) : map && t.replyingAt ? (answersHomeUse ? afterHomeUse(map) : stepEndRoute(t.replyingAt, map)) : null);
  // The question the visitor's last message answers is the one his last reply asked, never the one the map asks now.
  const checked = readWellingtonAnswer(set !== null && typeof parsed === "object" && parsed !== null ? { ...parsed, route: set } : parsed, {
    place: t.place,
    ...(t.record?.facts.type ? { type: t.record.facts.type.value } : {}),
    ...(t.asked !== undefined ? { asked: t.asked } : {}),
    messages: t.messages ?? [],
  });
  if (!checked) return { ok: false, fault: "empty" };
  const route = map ? guardRoute(checked.route, map) : checked.route;
  const { introduction, ...rest } = checked;
  const answer: WellingtonAnswer = { ...rest, route, ...(introduction !== undefined && route === checked.route ? { introduction } : {}) };
  // On a hand-off his line to the colleague is what is shown; his reply beside it may be one short sentence.
  if (isDegenerateReply(answer.reply) && !(handTo && answer.introduction)) return { ok: false, fault: "too short" };
  const tooSoon = map !== null && map.next !== "report or sign-up" && saysAllDone(answer.reply);
  // A route draws the next step under his message, so the visitor is never left waiting there.
  const waits = answer.route === "none" && leavesWaiting(answer.reply);
  if (!waits && (!tooSoon || pass > 1)) return { ok: true, answer };
  if (pass > 1) return { ok: false, fault: "no answer" };
  return { ok: false, again: waits ? "look-up" : "done too soon" };
}

// ── The country a place names ───────────────────────────────────────────────────────────────────────────────────

/** How a place's words are folded before they are matched. */
export function foldPlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The code of the one country the place names, word for word, or null. The site gives the list of countries. */
export function countryIsoFor(place: string, countries: readonly { iso: string; name: string }[]): string | null {
  const text = ` ${foldPlace(place)} `;
  if (text.trim() === "") return null;
  const hits: { iso: string; start: number; end: number }[] = [];
  for (const country of countries) {
    const name = foldPlace(country.name);
    if (!name) continue;
    for (let at = text.indexOf(` ${name} `); at !== -1; at = text.indexOf(` ${name} `, at + 1)) hits.push({ iso: country.iso, start: at + 1, end: at + 1 + name.length });
  }
  // A name inside a longer name that also matched gives way to it.
  const standing = hits.filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start));
  const found = new Set(standing.map((h) => h.iso));
  return found.size === 1 ? [...found][0]! : null;
}

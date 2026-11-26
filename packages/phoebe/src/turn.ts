/**
 * ONE OF PHOEBE'S TURNS: what she is handed, in what order, and every check on her answer. Carried from the open site
 * (`api/phoebe.ts`, `api/_record.ts`, `api/_door.ts` and `src/lib/phoebeClient.ts`, commit 0f16957), as pure functions a
 * site calls around its own call to the model.
 *
 * A site does this on each turn:
 *   1. `phoebeTurn(...)` gives the blocks after her instructions, in order: the cards, the door, the record, the
 *      worksheet, the visit notes. On a further call for the same question, `again: true` adds core's `FINISH_NOTE`.
 *   2. It reads each answer with `readPhoebeAnswer`. `needs` names a card set: the same question goes again with
 *      `nextSets`. An answer whose reply ends by promising a look-up (core's `leavesWaiting`) goes again too, unless she
 *      hands back. At most `MAX_PASSES` calls; it is one answer to the visitor.
 *   3. On the opened turn, `openedAnswer` drops every row, test and sort: the worksheet waits for message 2.
 * The site keeps the model call and its key, the limits, streaming, buttons, chips on screen and saving.
 *
 * Her output is checked, not trusted. It calls no model.
 */
import { readChips } from "@waterbots/core/chips";
import { knownKindFacts } from "@waterbots/core/projectKinds";
import { BECAUSE_LIMIT, underTodaysRules, type ProjectRecord } from "@waterbots/core/record";
import { readHandBack, type HandBack } from "@waterbots/core/reply";
import { FINISH_NOTE } from "@waterbots/core/lookUp";
import {
  HER_PACKS,
  PATHWAY_STATE_IDS,
  PATHWAY_STATE_LABEL,
  READINESS_LABEL,
  ROW_STATE_IDS,
  ROW_STATE_LABEL,
  TOOL_SECTIONS,
  pathwayStateOf,
  readinessOf,
  rowsFor,
  section,
  verdictRows,
  type RowContext,
} from "./generated/worksheet.generated.js";
import { CARD_SETS, cardsBlock, setsFor, type CardSet, type PhoebeDoor } from "./instructions.js";
import { classFor } from "./reading.js";
import { contextFor, type Sheet } from "./worksheet.js";

// ── Where she is ────────────────────────────────────────────────────────────────────────────────────────────────────

/** The block that says which door she is at, and what that door gives her. */
export function phoebeDoorBlock(door: PhoebeDoor): string {
  switch (door) {
    case "free-site":
      return "# Where you are\n\nYou are at the Free site door of rule 21. Wellington leads, and the project record is what this visit has gathered. You work at the screen level: you use your tools and keep no memory. When your part is done, or a question is not yours, Wellington joins the visitor in this chat with the next step.";
    case "agent-commons":
      return "# Where you are\n\nYou are at the Agent Commons door of rule 21. The visitor opened you alone. There is no project record, no Wellington and no other step here: ask for each fact you need yourself, and never send anyone to Wellington or to a step. What the visitor told you in this chat is all there is. Your hand-back field sends the visitor back to where they opened you.";
    case "paid-site":
      return "# Where you are\n\nYou are at the Paid site door of rule 21. The project record is the Project Record page.";
    case "mcp":
      return "# Where you are\n\nYou are at the MCP door of rule 21. The visitor's own AI is asking. There is no project record: what it gives you, and the visitor confirms, is all there is.";
  }
}

// ── The record, as she reads it ─────────────────────────────────────────────────────────────────────────────────────

/** The heading her instructions name. */
export const RECORD_HEADING = "What the visitor has already told Wellington";

const STAGE_WORDS: Record<string, { words: string; plain: string }> = {
  paper: { words: "on paper", plain: "still a plan — nothing has been spent on building it yet" },
  building: { words: "being built", plain: "work has started and it is not running yet" },
  running: { words: "already running", plain: "it is in use today" },
};

/** How a project type is named, when the site can say it: its name and its plain sentence. */
export type TypeWords = (id: string) => { name: string; plain: string } | undefined;

/** The record's field lines, only those that were said. */
export function recordLines(record: Pick<ProjectRecord, "facts" | "place">, typeWords?: TypeWords): string[] {
  const { facts, place } = record;
  const lines: string[] = [];
  if (facts.does) lines.push(`- What it does: ${facts.does.value}`);
  if (facts.type) {
    const words = typeWords?.(facts.type.value);
    lines.push(`- What type: ${words ? `${words.name} — ${words.plain}` : facts.type.value}`);
  }
  // Under today's rules the source and the treatment are said as the facts they are; a screening made before them keeps its class.
  if (underTodaysRules(facts)) for (const line of knownKindFacts(facts)) lines.push(`- ${line}`);
  else if (facts.technologyClass) {
    const words = typeWords?.(facts.technologyClass.value);
    lines.push(`- Which class of drinking-water project: ${words ? `${words.name} — ${words.plain}` : facts.technologyClass.value}`);
  }
  const stage = facts.stage ? STAGE_WORDS[facts.stage.value] : undefined;
  if (stage) lines.push(`- Stage: ${stage.words} — ${stage.plain}`);
  const served = facts.population?.value;
  if (served?.served !== undefined && served.mode !== undefined) {
    const unit = served.served === 1 ? (served.mode === "people" ? "person" : "household") : served.mode;
    lines.push(`- People served: ${served.served.toLocaleString("en-US")} ${unit}, as the visitor said it`);
  }
  const where = place.words?.value ?? place.country?.value;
  if (where) lines.push(`- Where it is: ${where}`);
  if (facts.name) lines.push(`- What it is called: ${facts.name}`);
  return lines;
}

/** The record block, or null when it holds nothing she reads. */
export function recordBlock(record: Pick<ProjectRecord, "facts" | "place">, typeWords?: TypeWords): string | null {
  const lines = recordLines(record, typeWords);
  if (lines.length === 0) return null;
  return [
    `# ${RECORD_HEADING}`,
    "",
    "These are the visitor’s own words about their project, carried from the desk so they need not say them twice. They are facts about the project and never a verdict on any row of your worksheet; only the cards decide that.",
    "",
    ...lines,
  ].join("\n");
}

/** The visit notes after the record, or null when neither applies. */
export function phoebeNotesBlock(notes: { opened?: boolean; introduced?: boolean; eligibilityDone?: boolean }): string | null {
  const extra: string[] = [];
  if (notes.opened) {
    extra.push(
      notes.introduced
        ? 'The visitor has just opened Eligibility, and Wellington introduced you in this chat. Do not repeat him, and do not say again who you are or what you do. This is your message 1, on its own: a warm hello with some personality, then an invitation to begin. It comes before every other rule: no question about the project, no rows, pathways or sorts, no "in beta", and no read on either pathway.'
        : 'The visitor has just opened Eligibility. This is your message 1, on its own: a warm hello with some personality, one line on what you do, then an invitation to begin. It comes before every other rule: no question about the project, no rows, pathways or sorts, no "in beta", and no read on either pathway.',
    );
  }
  if (notes.eligibilityDone) {
    extra.push(
      'Every row you ask on this site has a verdict for this visit. Give the read for each pathway, show once the rows that are acted on at later phases, say Wellington will join with the next step, and set handBack to "wellington". Never send them back to him.',
    );
  }
  return extra.length ? extra.join("\n\n") : null;
}

/** The line the model reads on the opened turn, where the visitor typed nothing. Never shown as theirs. */
export const OPENED_TURN = "(The visitor opened Eligibility.)";

// ── The worksheet, as she reads it ──────────────────────────────────────────────────────────────────────────────────

/** The heading her instructions name. */
export const WORKSHEET_HEADING = "What the worksheet shows";

/** The worksheet block: each pack's pathway, its rows with what each state carries, and the read those rows give. */
export function worksheetBlock(sheet: Sheet, gsClass: string): string {
  const parts: string[] = [
    `# ${WORKSHEET_HEADING}`,
    "",
    "Your eligibility worksheet as it stands for this visit. Every verdict below is one you set earlier in this conversation, from what the visitor told you; a row not listed has not been looked at. Ask in the order of questions in your rules, do not ask again for what a Met row already settled, and when the visitor asks where a row stands, read it from here. The read at the end of each pathway is worked out from these rows, and it is what the screen shows — never say a different one.",
  ];
  for (const pack of HER_PACKS) {
    const found = section(pack);
    if (!found) continue;
    const context = contextFor(sheet, pack, gsClass);
    const held = sheet.rows[pack] ?? {};
    const states = Object.fromEntries(Object.entries(held).map(([id, row]) => [id, row.state]));
    parts.push("", `## ${found.sectionName} — ${PATHWAY_STATE_LABEL[pathwayStateOf(pack, states, context)]}`, "");
    for (const row of rowsFor(pack, context).filter((r) => r.asked === "eligibility")) {
      const status = held[row.id];
      if (!status) {
        parts.push(`- ${row.id}: ${ROW_STATE_LABEL.unchecked}.`);
        continue;
      }
      const label = ROW_STATE_LABEL[status.state] ?? PATHWAY_STATE_LABEL[status.state] ?? status.state;
      const carried = status.because ? ` — ${status.because}` : "";
      const routes = status.routes?.length ? ` — route${status.routes.length > 1 ? "s" : ""} ${status.routes.join(", ")}` : "";
      parts.push(`- ${row.id}: ${label}${carried}${routes}.`);
    }
    for (const word of sheet.sorts[pack] ?? []) {
      const isVersion = found.versionFlags.some((entry) => entry.id === word);
      parts.push(`- ${isVersion ? "Version" : "Which kind of project"}: ${word}.`);
    }
    parts.push("", `The read from these rows: **${READINESS_LABEL[readinessOf(pack, states, context)]}**.`);
  }
  return parts.join("\n");
}

// ── The cards for this turn ─────────────────────────────────────────────────────────────────────────────────────────

/** Each pack's pathway state, and how many rows she asks there still have no verdict. */
export function pathwaysOf(sheet: Sheet, gsClass: string): { pack: string; state: string; open: number }[] {
  return HER_PACKS.map((pack) => {
    const context = contextFor(sheet, pack, gsClass);
    const held = sheet.rows[pack] ?? {};
    const states = Object.fromEntries(Object.entries(held).map(([id, row]) => [id, row.state]));
    const open = verdictRows(pack, context).filter((row) => (states[row.id] ?? "unchecked") === "unchecked").length;
    return { pack, state: pathwayStateOf(pack, states, context), open };
  });
}

/** True when every row she asks on a pathway is Met: one of the two doors to the considerations. */
export function allMet(sheet: Sheet, gsClass: string): boolean {
  return HER_PACKS.some((pack) => {
    const rows = verdictRows(pack, contextFor(sheet, pack, gsClass));
    return rows.length > 0 && rows.every((row) => sheet.rows[pack]?.[row.id]?.state === "met");
  });
}

// ── One turn ────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PhoebeTurnInput {
  door: PhoebeDoor;
  /** The shared record. None in the Agent Commons or at MCP. */
  record?: Pick<ProjectRecord, "facts" | "place"> | null;
  /** Her worksheet as it stands. */
  sheet: Sheet;
  /** Sets the visit has already been given. */
  loaded?: readonly string[];
  /** The visitor has just opened her chat. */
  opened?: boolean;
  /** Wellington's line shows above her first answer. */
  introduced?: boolean;
  /** Every row she asks has a verdict for this visit. */
  eligibilityDone?: boolean;
  /** A further call for the same question. */
  again?: boolean;
  /** The sets for a further call (`nextSets`). Left out, the turn's own. */
  sets?: readonly CardSet[];
  typeWords?: TypeWords;
}

export interface PhoebeTurn {
  /** The card sets this call has. A site keeps them, and sends them back as `loaded` on the next ask. */
  sets: CardSet[];
  /** The blocks after her instructions, in order. The first is the cards: a site may cache it on its own. */
  blocks: string[];
  /** Each pack's pathway, for `nextSets`. */
  pathways: { pack: string; state: string; open: number }[];
}

/** What she is handed on one call, after her instructions. */
export function phoebeTurn(input: PhoebeTurnInput): PhoebeTurn {
  const record = input.record ?? null;
  const gsClass = record ? classFor(record) : "";
  const pathways = pathwaysOf(input.sheet, gsClass);
  const sets =
    input.sets !== undefined
      ? [...input.sets]
      : setsFor({ pathways, loaded: input.loaded ?? [], allMet: allMet(input.sheet, gsClass), running: record?.facts.stage?.value === "running" });
  const opened = input.opened === true;
  const notes = phoebeNotesBlock({ opened, introduced: opened && input.introduced === true, eligibilityDone: input.eligibilityDone === true });
  const recordText = record ? recordBlock(record, input.typeWords) : null;
  // Not on her first turn: the sheet is empty then, and it pulls against message 1.
  const sheetText = !opened && Object.keys(input.sheet.rows).length + Object.keys(input.sheet.sorts).length > 0 ? worksheetBlock(input.sheet, gsClass) : null;
  const blocks = [cardsBlock(sets), phoebeDoorBlock(input.door), recordText, sheetText, notes, input.again ? FINISH_NOTE : null].filter((b): b is string => b !== null);
  return { sets, blocks, pathways };
}

// ── Her answer, checked ─────────────────────────────────────────────────────────────────────────────────────────────

export interface PhoebeAnswer {
  reply: string;
  /** Chips that answer the question the reply ends with. */
  answers: string[];
  /** Card tokens, `section:set/id`. A site renders each one's citation with `citationFor`. */
  cited: string[];
  rows: { pack: string; id: string; state: string; because?: string; routes?: string[] }[];
  pathways: { pack: string; id: string; state: string; because?: string }[];
  sorts: { pack: string; value: string }[];
  needCards: "none" | CardSet;
  handBack: HandBack;
  showTool: boolean;
  learnMore: string;
  abstained: boolean;
  abstentionTopic?: string;
}

/** The longest "Learn more about …" topic shown; longer is dropped, not cut. */
export const MAX_LEARN_MORE_CHARS = 48;

const TOKEN = /^([a-z][a-z0-9-]*):([a-z]+)\/([A-Za-z0-9-]+)$/;
const CARD_SET_WORDS = ["applies", "eligibility", "feasibility", "routes"];
const SECTION_IDS = TOOL_SECTIONS.map((s) => s.sectionId);
const CARRIES_A_SENTENCE = ["met", "fixable", "unknown", "blocked"];

const field = (o: Record<string, unknown>, key: string): string => (typeof o[key] === "string" ? (o[key] as string) : "");
const objects = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null) : []);

/** The card set an answer asks for, or "none". */
export function needsOf(value: unknown): CardSet | "none" {
  const asked = typeof value === "object" && value !== null ? (value as Record<string, unknown>).needCards : undefined;
  return (CARD_SETS as readonly unknown[]).includes(asked) ? (asked as CardSet) : "none";
}

/**
 * Her answer, held to the tool files. Null when the reply is missing or empty. A row that does not exist in that pack, a
 * state off the list, a Fixable row with no route from its own list, a Blocked row whose card says it can be fixed, a
 * state with no sentence, or a sentence over the limit: each is dropped whole. Every path her reply closes is saved: a
 * test that does not apply, or a Blocked row where the card allows one.
 */
export function readPhoebeAnswer(value: unknown): PhoebeAnswer | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.reply !== "string" || v.reply.trim() === "") return null;

  const cited: string[] = [];
  for (const raw of Array.isArray(v.cited) ? v.cited : []) {
    if (typeof raw !== "string") continue;
    const token = raw.trim();
    const match = token.match(TOKEN);
    if (!match || !SECTION_IDS.includes(match[1] ?? "") || !CARD_SET_WORDS.includes(match[2] ?? "")) continue;
    if (!cited.includes(token)) cited.push(token);
  }

  const rows: PhoebeAnswer["rows"] = [];
  for (const u of objects(v.rows)) {
    const pack = field(u, "pack");
    const id = field(u, "id");
    const state = field(u, "state");
    const row = section(pack)?.rows.find((r) => r.id === id);
    if (!row) continue;
    if (!(ROW_STATE_IDS as readonly string[]).includes(state) || state === "unchecked") continue;
    const because = field(u, "because").trim();
    const routes = Array.isArray(u.routes) ? u.routes.filter((r): r is string => typeof r === "string" && row.routes.includes(r)) : [];
    if (state === "fixable" && routes.length === 0) continue;
    if (state === "blocked" && row.fixable === "yes") continue;
    if (CARRIES_A_SENTENCE.includes(state) && because === "") continue;
    if (because.length > BECAUSE_LIMIT) continue;
    rows.push({ pack, id, state, ...(because ? { because } : {}), ...(routes.length ? { routes } : {}) });
  }

  const pathways: PhoebeAnswer["pathways"] = [];
  for (const u of objects(v.pathways)) {
    const pack = field(u, "pack");
    const id = field(u, "id");
    const state = field(u, "state");
    const row = section(pack)?.rows.find((r) => r.id === id);
    if (!row || row.takes.of !== "pathway-state") continue;
    if (!(PATHWAY_STATE_IDS as readonly string[]).includes(state) || state === "unchecked") continue;
    const because = field(u, "because").trim();
    // A pathway that does not apply says why: that sentence is all a visitor gets from it.
    if (state === "does-not-apply" && because === "") continue;
    if (because.length > BECAUSE_LIMIT) continue;
    pathways.push({ pack, id, state, ...(because ? { because } : {}) });
  }

  // A word that sorts the rows is one of that pack's own. "all" is refused: an absent key already says it.
  const sorts: PhoebeAnswer["sorts"] = [];
  for (const u of objects(v.sorts)) {
    const pack = field(u, "pack");
    const word = field(u, "value");
    const found = section(pack);
    if (!found || word === "all") continue;
    if (!found.appliesTo.some((e) => e.id === word) && !found.versionFlags.some((e) => e.id === word)) continue;
    sorts.push({ pack, value: word });
  }

  // Saying it is saving it (14 Nov 2026): every path the reply closes is saved on the worksheet the same turn.
  for (const u of objects(v.closes)) {
    const pack = field(u, "pack");
    const id = field(u, "id");
    const because = field(u, "because").trim();
    const row = section(pack)?.rows.find((r) => r.id === id);
    if (!row || because === "" || because.length > BECAUSE_LIMIT) continue;
    if (row.takes.of === "pathway-state") {
      const at = pathways.findIndex((p) => p.pack === pack && p.id === id);
      const saved = { pack, id, state: "does-not-apply", because };
      if (at >= 0) pathways[at] = saved;
      else pathways.push(saved);
    } else if (row.fixable !== "yes") {
      const at = rows.findIndex((r) => r.pack === pack && r.id === id);
      const saved = { pack, id, state: "blocked", because };
      if (at >= 0) rows[at] = saved;
      else rows.push(saved);
    }
    // A row whose card says it can always be fixed is never Blocked, and is not saved.
  }

  const abstained = v.abstained === true;
  const topic = field(v, "abstentionTopic").trim();
  const learnRaw = field(v, "learnMore").trim().replace(/[.?!]+$/, "");
  return {
    reply: v.reply.trim(),
    answers: readChips(v.answers, v.reply),
    cited,
    rows,
    pathways,
    sorts,
    needCards: needsOf(v),
    handBack: readHandBack(v.handBack),
    showTool: v.showTool === true,
    learnMore: learnRaw.length <= MAX_LEARN_MORE_CHARS && !/[\n\r]/.test(learnRaw) ? learnRaw : "",
    abstained,
    ...(abstained && topic ? { abstentionTopic: topic } : {}),
  };
}

/** Message 1 sets nothing: on the opened turn every row, test and sort she returns is dropped. */
export function openedAnswer(answer: PhoebeAnswer): PhoebeAnswer {
  return { ...answer, rows: [], pathways: [], sorts: [] };
}

/** The class her rows are sorted by, from the record, for a site that draws her worksheet. */
export function rowContext(sheet: Sheet, pack: string, record: Pick<ProjectRecord, "facts"> | null): RowContext {
  return contextFor(sheet, pack, record ? classFor(record) : "");
}


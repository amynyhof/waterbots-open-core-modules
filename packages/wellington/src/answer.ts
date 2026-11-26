/**
 * WELLINGTON'S ANSWER, CHECKED RATHER THAN TRUSTED. Carried from the open site (`api/_wellingtonAnswer.ts` and the browser's
 * second check, commit 0f16957), with the closed lists from core.
 *
 * A route is a field, never read out of prose. What he learned is a field, kept only from closed lists and short texts.
 * A site acts on the fields and never on his words.
 *
 * NO CLASS, NO KIND (the maintainer, 2026-11-25). His context carries core's kind facts in place of a technology class:
 * where the water comes from, whether it is treated and where, and whether the water at the source is safe to drink.
 * Core works out how the project is counted from them (`@waterbots/core/projectKinds`). Any other yes-or-no fact is kept
 * only when the agent map's one small question asked for it.
 *
 * A FACT IS FILLED ONLY WHEN THE VISITOR GAVE IT (2026-11-26): core's guard on facts (`@waterbots/core/factGuard`) reads
 * every kind fact and home use in his context against the visitor's own messages. A yes-or-no fact and home use are taken
 * only as the answer to the question his last reply asked; the source and the treatment only with the visitor's own words.
 * A fact he asks about in the same reply is never filled. One that fails is dropped quietly, and stays blank: nothing in his
 * answer names it, and the map asks for it again as for any blank fact.
 */
import { ANSWERS_SCHEMA, readChips } from "@waterbots/core/chips";
import { checkAnswerFacts, factFields, readAsking, readHeard, type AnswerFact } from "@waterbots/core/factGuard";
import { FACT_LABEL, KIND_FACTS, KIND_FACT_SCHEMA, YES_NO_FACTS, readKindFacts, type GivenKindFacts, type KindFact } from "@waterbots/core/projectKinds";
import {
  DRINKING_WATER_TYPE,
  HOME_USES,
  NEW_SUPPLY_TYPE,
  PROJECT_STAGES,
  PROJECT_TYPE_IDS,
  TEXT_LIMITS,
  changeFacts,
  checkEntry,
  type ChangedFacts,
  type GivenFacts,
  type HomeUse,
  type ProjectRecord,
  type ProjectStage,
  type ProjectTypeId,
} from "@waterbots/core/record";
import type { Place } from "@waterbots/core/places";

/** Where he sends the visitor this turn. "quantification" is Calvin, "water" is Violet, "map" is Bridget. */
export const ROUTES = ["none", "eligibility", "quantification", "water", "map", "paid"] as const;
export type Route = (typeof ROUTES)[number];

/** People served, as the visitor said it: households are never turned into people. */
export const SERVED_UNITS = ["people", "households"] as const;
export type ServedUnit = (typeof SERVED_UNITS)[number];
export interface Served {
  count: number;
  unit: ServedUnit;
}

/** Ten million: more than any one water supply project, less than a typo's reach. */
export const MAX_SERVED = 10_000_000;

/** A whole count from 1 to ten million and a unit from the list, or nothing. */
export function readServed(value: unknown): Served | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const unit = SERVED_UNITS.find((u) => u === v.unit);
  const count = v.count;
  if (!unit || typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > MAX_SERVED) return undefined;
  return { count, unit };
}

/** The kind facts he gathers in ordinary conversation. The rest are kept only when the map asked for them. */
export const HIS_KIND_FACTS = ["waterSource", "treatment", "sourceSafe"] as const satisfies readonly KindFact[];

/** What the visitor stated, in their own words. Every field optional. */
export interface Learned extends GivenKindFacts {
  does?: string;
  name?: string;
  place?: string;
  type?: ProjectTypeId;
  stage?: ProjectStage;
  served?: Served;
  homeUse?: HomeUse;
}

export interface WellingtonAnswer {
  reply: string;
  /** The key of the one fact this reply asks for. The site passes it back as `asked` on the next turn. */
  asking?: string;
  /** Chips that answer the question the reply ends with (core's `readChips`). */
  answers: string[];
  route: Route;
  /** His one line to a colleague, at the head of their page. Only beside a route to them. */
  introduction?: string;
  context?: Learned;
  abstained: boolean;
  abstentionTopic?: string;
}

/** His line to a colleague is one line; anything longer is not an introduction. */
export const MAX_INTRODUCTION_CHARS = 300;

/** What the record already holds, so a fact returned this turn can be checked against it. */
export interface Known {
  /** The project type already on the record, if any. */
  type?: string;
  /** Where he is speaking. In the lobby chat there is no record: no context, and the route is "none". */
  place?: Place;
  /** The fact his last reply asked for: its `asking`. The visitor's last message answers it. */
  asked?: string;
  /** The visitor's own messages in this chat, oldest first. Never his. Left out: no fact about the kind is filled. */
  messages?: readonly string[];
}

/** The facts the guard reads in his context. */
const GUARDED: readonly (KindFact | "homeUse")[] = [...KIND_FACTS, "homeUse"];

/** The types whose project gives people water: the only ones the source, the treatment and people served are asked of. */
const WATER_TYPES: readonly string[] = [NEW_SUPPLY_TYPE, DRINKING_WATER_TYPE];

/** True when the facts about the source and the treatment can be about this project: a water type, or no type yet. */
function givesWater(type: string | undefined): boolean {
  return type === undefined || WATER_TYPES.includes(type);
}

function text(value: unknown, limit: number): string {
  const t = typeof value === "string" ? value.trim() : "";
  return t.length <= limit ? t : "";
}

/** His answer, checked. Null when it holds no reply. */
export function readWellingtonAnswer(value: unknown, known: Known = {}): WellingtonAnswer | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.reply !== "string" || v.reply.trim() === "") return null;
  const lobby = known.place === "lobby-chat";

  // An unknown route is "none", never an invented destination. The lobby chat has no desk to send anyone to, and on the
  // paid site the visitor is there already.
  let route: Route = ROUTES.find((r) => r === v.route) ?? "none";
  if (lobby || (known.place === "paid-site" && route === "paid")) route = "none";

  let context: Learned | undefined;
  if (!lobby && typeof v.context === "object" && v.context !== null) {
    const c = v.context as Record<string, unknown>;
    const out: Learned = {};
    const does = text(c.does, TEXT_LIMITS.does);
    if (does) out.does = does;
    const name = text(c.name, TEXT_LIMITS.name);
    if (name) out.name = name;
    const place = text(c.place, TEXT_LIMITS.placeWords);
    if (place) out.place = place;
    const type = PROJECT_TYPE_IDS.find((id) => id === c.type);
    if (type) out.type = type;
    const stage = PROJECT_STAGES.find((s) => s === c.stage);
    if (stage) out.stage = stage;
    const served = readServed(c.served);
    if (served) out.served = served;
    const typeInForce = out.type ?? known.type;
    // The source, the treatment and the water's safety: facts about a project that gives people water, and nothing else.
    if (givesWater(typeInForce)) {
      const kind = readKindFacts(c);
      for (const key of [...HIS_KIND_FACTS, ...YES_NO_FACTS]) {
        const allowed = (HIS_KIND_FACTS as readonly string[]).includes(key) || known.asked === key;
        if (allowed && kind[key] !== undefined) (out as Record<string, unknown>)[key] = kind[key];
      }
    }
    // Home use: beside a new or alternative supply, or when the map asked for it.
    const homeUse = HOME_USES.find((h) => h === c.homeUse);
    if (homeUse && (typeInForce === NEW_SUPPLY_TYPE || known.asked === "homeUse")) out.homeUse = homeUse;
    const facts: AnswerFact[] = GUARDED.flatMap((key) => {
      const value = (out as Record<string, string | boolean | undefined>)[key];
      return value === undefined ? [] : [{ key, name: FACT_LABEL[key], value, ...((YES_NO_FACTS as readonly string[]).includes(key) || key === "homeUse" ? { onlyAsAnswer: true } : {}) }];
    });
    const check = checkAnswerFacts(facts, { messages: known.messages ?? [], asked: known.asked, asking: readAsking(v.asking, GUARDED), heard: readHeard(v.heard, GUARDED) });
    for (const r of check.refused) delete (out as Record<string, unknown>)[r.fact.key];
    if (Object.keys(out).length > 0) context = out;
  }

  const abstained = v.abstained === true;
  const topic = typeof v.abstentionTopic === "string" ? v.abstentionTopic.trim() : "";
  // Kept only on a route to a colleague, and only as one line.
  const intro = typeof v.introduction === "string" ? v.introduction.trim() : "";
  const introduction = route !== "none" && route !== "paid" && intro && intro.length <= MAX_INTRODUCTION_CHARS && !intro.includes("\n") ? intro : "";

  const asking = readAsking(v.asking, GUARDED);
  return {
    reply: v.reply.trim(),
    ...(asking !== undefined ? { asking } : {}),
    answers: readChips(v.answers, v.reply),
    route,
    ...(introduction ? { introduction } : {}),
    ...(context ? { context } : {}),
    abstained,
    ...(abstained && topic ? { abstentionTopic: topic } : {}),
  };
}

/** The facts he learned, as core's record takes them. A count stays as said: households are never turned into people. */
export function learnedFacts(learned: Learned): GivenFacts {
  const { does, name, place, type, stage, served, homeUse, ...kind } = learned;
  return {
    ...readKindFacts(kind),
    ...(does !== undefined ? { does } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(place !== undefined ? { placeWords: place } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(stage !== undefined ? { stage } : {}),
    ...(served !== undefined ? { population: { served: served.count, mode: served.unit } } : {}),
    ...(homeUse !== undefined ? { homeUse } : {}),
  };
}

/**
 * Puts what he learned on the record, through core's `changeFacts`: a fact about the source or the treatment the visitor
 * changes is changed and the kind worked out again; a saved project's is changed by its owner, on the Project Record page;
 * a screening made before these rules takes none (`newScreening`). Everything else is added only where blank.
 */
export function addWellingtonFacts(record: ProjectRecord, learned: Learned, options: { saved?: boolean } = {}): ChangedFacts {
  return changeFacts(record, "wellington", learnedFacts(learned), options.saved === true ? { saved: true } : {});
}

/** Why core's fact check refuses the count in his answer, or null. The count is never put on the record then. */
export function refusedCount(value: unknown): "below zero" | "zero" | "not a whole number" | "not a number" | null {
  const served = typeof value === "object" && value !== null ? (value as Record<string, unknown>).served : undefined;
  if (typeof served !== "object" || served === null) return null;
  const check = checkEntry("population.served", (served as Record<string, unknown>).count);
  return check.ok ? null : check.problem;
}

/** What the visitor is told beside a refused count. It says why, and that nothing was kept. */
export const REFUSED_LINE = {
  "below zero": "That count was not kept: a count can’t be below zero.",
  zero: "That count was not kept: it has to be at least 1.",
  "not a whole number": "That count was not kept: it has to be a whole number.",
  "not a number": "That count was not kept: it is not a number.",
} as const;

const kindProperty = (key: (typeof HIS_KIND_FACTS)[number]): Record<string, unknown> => ({
  ...KIND_FACT_SCHEMA[key],
  description: `${String(KIND_FACT_SCHEMA[key].description)} Only as the visitor said it, in ordinary conversation; never asked as a list.`,
});

/** The shape he returns. */
export const WELLINGTON_RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    reply: { type: "string", description: "Wellington's message. Prose only — no headings, no citation text, no markers." },
    answers: ANSWERS_SCHEMA,
    route: {
      type: "string",
      enum: [...ROUTES],
      description: 'Where the visitor is being sent this turn, or "none". "quantification" is Calvin, carbon; "water" is Violet, water benefits; "map" is Bridget.',
    },
    context: {
      type: "object",
      description: "What the visitor stated about the project in this conversation, in their own words. Include only fields they actually said.",
      properties: {
        does: { type: "string", description: "What the project does, in a sentence or two of the visitor’s own words." },
        name: { type: "string", description: "What the visitor calls the project." },
        place: { type: "string", description: "Where the visitor said it is." },
        type: {
          type: "string",
          enum: [...PROJECT_TYPE_IDS],
          description: "The project type, as an id from the list, when the visitor's words plainly settle it or on their yes. NONE when nothing fits and they agreed.",
        },
        waterSource: kindProperty("waterSource"),
        treatment: kindProperty("treatment"),
        sourceSafe: kindProperty("sourceSafe"),
        stage: {
          type: "string",
          enum: [...PROJECT_STAGES],
          description: "Whether the project is still on paper, being built, or already running, when the visitor's words settle it or they confirmed it.",
        },
        served: {
          type: "object",
          description: 'How many people a water supply project serves, as the visitor said it: a whole number, and "people" or "households". Never converted.',
          properties: { count: { type: "integer" }, unit: { type: "string", enum: [...SERVED_UNITS] } },
          required: ["count", "unit"],
          additionalProperties: false,
        },
        homeUse: {
          type: "string",
          enum: [...HOME_USES],
          description: "Once the agent map asks: whether people use the water at home, as the visitor said it.",
        },
      },
      additionalProperties: false,
    },
    introduction: {
      type: "string",
      description:
        'On a handoff to Phoebe (route "eligibility"), Bridget ("map"), Calvin ("quantification") or Violet ("water"): one line Wellington says to that colleague at the top of their page, by name, summing up the project in one natural line — place, size, stage, as far as known — and, the first time, telling the visitor what that colleague will help them with. "" on every other turn.',
    },
    ...factFields(GUARDED),
    abstained: { type: "boolean", description: "True only when the question falls outside every lane." },
    abstentionTopic: { type: "string", description: "A few words naming what was asked about, when abstaining." },
  },
  required: ["reply", "answers", "route", "introduction", "abstained"],
  additionalProperties: false,
};

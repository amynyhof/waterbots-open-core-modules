/**
 * BRIDGET'S ANSWER: its shape, and the checks on every field. Carried from the open site (`api/_bridgetPrompt.ts`,
 * `api/bridget.ts` and `src/lib/bridgetClient.ts`, commit 0f16957). Her output is checked, not trusted. A site acts on the
 * checked fields and never on her words.
 *
 * It calls no model.
 */
import { ANSWERS_SCHEMA, answersFrom, readChips } from "@waterbots/core/chips";
import { leavesWaiting } from "@waterbots/core/lookUp";
import { HAND_BACKS, isDegenerateReply, readHandBack, type HandBack } from "@waterbots/core/reply";
import { MAX_PLACE_CHARS, readHeardPlace, type PinnedBasin } from "./pin.js";

/** The shape she returns. */
export const BRIDGET_ANSWER_SCHEMA = {
  type: "object" as const,
  properties: {
    reply: { type: "string", description: "Bridget's message. Prose only — no headings, no citation text, no markers." },
    answers: ANSWERS_SCHEMA,
    showMap: { type: "boolean", description: "True when this reply asks the visitor to open the Map tab." },
    place: {
      type: "string",
      description: 'The city, district, village or other place the visitor typed this turn, exactly as they wrote it. "" on every other turn, and never GPS numbers.',
    },
    handBack: {
      type: "string",
      enum: [...HAND_BACKS],
      description: '"wellington" after a pin, or when the question is not hers: the console brings Wellington into her chat with the next step. "none" otherwise.',
    },
    abstained: { type: "boolean", description: "True only when the question is outside her one job." },
    abstentionTopic: { type: "string", description: "A few words naming what was asked about, when abstaining." },
  },
  required: ["reply", "answers", "showMap", "place", "handBack", "abstained"],
  additionalProperties: false,
};

export interface BridgetAnswer {
  reply: string;
  /** Chips that answer the question her reply ends with (core's `readChips`). */
  answers: string[];
  /** Her reply asks the visitor to open the Map tab. */
  showMap: boolean;
  /** The more exact place the visitor typed, or "". */
  place: string;
  handBack: HandBack;
  abstained: boolean;
  abstentionTopic?: string;
}

/** Her answer as the model gave it, each field checked. Null when there is no reply at all. */
export function readBridgetAnswer(value: unknown): BridgetAnswer | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.reply !== "string" || v.reply.trim() === "") return null;
  const abstained = v.abstained === true;
  const topic = typeof v.abstentionTopic === "string" ? v.abstentionTopic.trim() : "";
  return {
    reply: v.reply.trim(),
    answers: readChips(v.answers, v.reply),
    showMap: v.showMap === true,
    place: typeof v.place === "string" ? v.place : "",
    handBack: readHandBack(v.handBack),
    abstained,
    ...(abstained && topic ? { abstentionTopic: topic } : {}),
  };
}

/** What the site does with a reply it has read: send it, ask the same question again, or say it could not be answered. */
export type ReplyVerdict = "send" | "again" | "fault";

/**
 * Whether a reply can be sent. One with almost nothing in it is a fault. One that ends by promising a look-up goes again
 * once (core's `leavesWaiting`), unless a pin or a hand-back brings Wellington next, so the visitor is never left waiting.
 * She has two calls at most.
 */
export function replyVerdict(answer: BridgetAnswer | null, turn: { pinned: boolean; call: number }): ReplyVerdict {
  if (answer === null || isDegenerateReply(answer.reply)) return "fault";
  if (turn.pinned || answer.handBack === "wellington" || !leavesWaiting(answer.reply)) return "send";
  return turn.call > 1 ? "fault" : "again";
}

/** The hand-back as the site acts on it: a pin always ends her part, and Wellington joins her chat with the next step. */
export function settleHandBack(handBack: HandBack, turn: { pinned: boolean }): HandBack {
  return turn.pinned ? "wellington" : handBack;
}

/**
 * Her answer, settled in code. The place is kept only in the visitor's own words from this turn. Her first message with
 * no pin always asks for the Map tab, whatever the field says. A pin always hands back to Wellington.
 */
export function settleBridgetAnswer(
  answer: BridgetAnswer,
  turn: { typed: boolean; lastWords: string; opened: boolean; pinned: boolean; pin: PinnedBasin | null },
): BridgetAnswer {
  return {
    ...answer,
    place: turn.typed ? readHeardPlace(answer.place, turn.lastWords) : "",
    showMap: !turn.pinned && (answer.showMap || (turn.opened && turn.pin === null)),
    handBack: settleHandBack(answer.handBack, turn),
  };
}

/** The second check, where the answer is shown: each field read again. Null when the shape cannot be read. */
export function readBridgetAnswerAgain(value: unknown): Pick<BridgetAnswer, "reply" | "handBack" | "abstained" | "answers" | "showMap" | "place"> | null {
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  if (typeof data.reply !== "string") return null;
  return {
    reply: data.reply,
    handBack: readHandBack(data.handBack),
    abstained: data.abstained === true,
    answers: answersFrom(data.answers),
    showMap: data.showMap === true,
    place: typeof data.place === "string" ? data.place.trim().slice(0, MAX_PLACE_CHARS) : "",
  };
}

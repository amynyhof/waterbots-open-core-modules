// Violet's chat (J5). What she asks for, in order; what she leaves at its default or its assumed start; how an answer
// fills her calculator; and what she can see of her screen. The rule and the parts she shares with Calvin are core's
// (`@waterbots/core/chat`). Nothing here does a sum or calls a model: every figure is the engine's.

import { ANSWER_FIELDS, CHAT_REPLY, chatContext, openAsks, openedTurn, readLeft, type Ask, type ChatSettings, type Kept } from "@waterbots/core/chat";
import { checkAnswerFacts, factFields, factsReturnedToAgent, joinGuards, readAsking, readHeard, type AnswerFact, type Heard } from "@waterbots/core/factGuard";
import { askedOutOfRange, checkAnswerNumbers, returnToAgent, takenOut, type AnswerNumber } from "@waterbots/core/numberGuard";
import { KIND_ASKS, KIND_FACTS, KIND_FACT_SCHEMA, NO_CALCULATOR_YET, YES_NO_FACTS, askFor, kindFactsOf, knownKindFacts, FACT_LABEL } from "@waterbots/core/projectKinds";
import { RANGES, rangeRefusal, type RangeKey, type RangeWords } from "@waterbots/core/ranges";
import { readHandBack, type HandBack } from "@waterbots/core/reply";
import { hasProjectRecord, type DoorFacts, type Place } from "@waterbots/core/places";
import { HOME_USES, addGivenFacts, needsHomeUse, setAgentResults, underTodaysRules, waterAnswer, type AddedFacts, type GivenFacts, type ProjectFacts, type ProjectRecord } from "@waterbots/core/record";
import { computeD3 } from "../d3/compute.js";
import { D3_STATUS, type AccessLevel, type D3Input, type D3Option, type D3Result, type D3Value } from "../d3/types.js";
import { D3_RANGES, d3Refusals, refuseD3, type D3NumberKey, type D3Refusal } from "../ranges.js";
import { addVioletResults, violetGivenFacts } from "../record.js";
import { d3Stop, d3Waits, readKind } from "../supply.js";

/** The settings her chat runs on. The same as in `config.yaml`; a test keeps them so. */
export const VIOLET_CHAT: ChatSettings = { model: "claude-opus-5", effort: "medium", maxOutputTokens: 16000, reply: CHAT_REPLY };

/** The turn the site sends when it opens her chat, so she speaks first. */
export const VIOLET_OPENED = openedTurn("Violet");

// ── What she asks for ────────────────────────────────────────────────────────────────────────────────────────────

/** Everything she may ask for. A project fact each time, or a monitored figure once the project runs. */
const ASKS = {
  option: {
    key: "option",
    about: "how the water can be counted: from what the system can supply, or from the people it serves (after the project runs, from meter readings too)",
    why: "it picks which way of counting the method uses",
    from: "what the project builds: a motor pump or a treatment plant has a known flow; a handpump or a household system is counted by its people",
    needed: true,
  },
  served: {
    key: "population.served",
    about: "how many people or households the project serves",
    why: "the water is worked out from it",
    from: "the project's plan, or a count of the homes it serves",
    needed: true,
  },
  mode: { key: "population.mode", about: "whether that count is of people or of households", why: "the method counts people", from: "the same plan or count", needed: true },
  householdSize: { key: "population.householdSize", about: "how many people live in a household", why: "it turns households into people", from: "the project's own survey", needed: true },
  accessLevel: {
    key: "accessLevel",
    about: "whether people have full access (at home or nearby, all year) or limited access (somewhere such as a school)",
    why: "it picks the default litres per person a day (VWBA 2.0, Appendix D, Table D3.3, p.46)",
    from: "where people get the water",
    needed: true,
  },
  without: {
    key: "withoutProjectM3PerYear",
    about: "how much water this supply gave in a year before the project, in cubic metres (0 for a brand-new supply)",
    why: "only the water the project adds is counted (VWBA 2.0, Appendix D, D-3, p.45)",
    from: "the supply's own records",
    needed: true,
  },
  flow: { key: "flowM3PerHour", about: "the flow of the system, in cubic metres an hour", why: "what the system can supply is worked out from it", from: "the pump's or the plant's design", needed: true },
  metered: { key: "meteredM3PerYear", about: "the metered water for the year, in cubic metres", why: "meter readings are the method's first choice", from: "the meter readings", needed: true },
  hours: { key: "operatingHoursPerYear", about: "the hours the system ran in the year", why: "what it supplied is worked out from them", from: "the operating logs", needed: true },
  days: { key: "daysOfAccessPerYear", about: "the days of access in the year", why: "the water is worked out from them", from: "monitoring", needed: true },
  plannedDays: {
    key: "daysOfAccessPerYear",
    about: "how many days a year people will have access",
    why: "the method gives no starting value for limited access",
    from: "the project's plan, such as a school's days",
    needed: true,
  },
} as const satisfies Record<string, Ask>;

/** Every key she may ask for, for reading an answer. */
export const VIOLET_ASK_KEYS: readonly string[] = [...new Set([...KIND_FACTS, "homeUse", ...Object.values(ASKS).map((a) => a.key)])];

/**
 * What is still missing, in the order she asks. The first one is her one question. `chosen` is true once the visitor has
 * said how the water can be counted; before that the screen only shows where it starts. With the project's facts, the
 * source and the treatment come first, and she asks for nothing when D-3 does not count it. Nobody is asked for a kind.
 */
export function violetAsks(input: D3Input, chosen = false, facts?: ProjectFacts): Ask[] {
  const stop = facts === undefined ? null : d3Stop(facts);
  if (stop !== null && !d3Waits(stop)) return [];
  const out: Ask[] = [];
  const pop = input.population;
  const ask = (blank: boolean, a: Ask): void => {
    if (blank) out.push(a);
  };
  if (facts !== undefined && underTodaysRules(facts)) {
    const a = waterAnswer(facts);
    if (a.says === "ask") out.push(askFor(a));
  } else if (facts !== undefined) {
    ask(facts.technology === undefined && facts.type === undefined, KIND_ASKS.waterSource);
    ask(needsHomeUse(facts), KIND_ASKS.homeUse);
  }
  ask(!chosen, ASKS.option);
  if (input.option === "beneficiaries") {
    ask(pop?.served === undefined, ASKS.served);
    ask(pop?.served !== undefined && pop.mode === undefined, ASKS.mode);
    ask(pop?.mode === "households" && pop.householdSize === undefined, ASKS.householdSize);
    ask(input.accessLevel === undefined, ASKS.accessLevel);
  }
  if (input.option === "capacity") ask(input.flowM3PerHour === undefined, ASKS.flow);
  if (input.option === "metered") ask(input.meteredM3PerYear === undefined, ASKS.metered);
  if (input.view === "ex-post" && input.option === "capacity") ask(input.operatingHoursPerYear === undefined, ASKS.hours);
  if (input.option === "beneficiaries") {
    if (input.view === "ex-post") ask(input.daysOfAccessPerYear === undefined, ASKS.days);
    else ask(input.accessLevel === "limited" && input.daysOfAccessPerYear === undefined, ASKS.plannedDays);
  }
  ask(input.withoutProjectM3PerYear === undefined, ASKS.without);
  return out;
}

function shown(v: D3Value): string {
  return `${typeof v.used === "number" ? v.used.toLocaleString("en", { maximumFractionDigits: 2 }) : String(v.used)} ${v.unit}`.trim();
}

/** The values she does not ask for: each at its cited default, or its assumed start, as the engine tags it. */
export function violetKept(result: D3Result): Kept[] {
  return result.values.flatMap((v) =>
    (v.origin === "default" || v.origin === "assumed") && v.used !== null && v.key !== "litresPerPersonPerDayDefault"
      ? [{ key: v.key, label: v.label, called: v.origin, shown: shown(v), source: v.source }]
      : [],
  );
}

// ── Filling her calculator from an answer ────────────────────────────────────────────────────────────────────────

/** What an answer may set. A null clears a value, back to its default, its assumed start or a blank. */
export interface VioletAnswer {
  /** Her way of counting. */
  option?: D3Option;
  accessLevel?: AccessLevel;
  population?: { served?: number; mode?: "people" | "households"; householdSize?: number };
  withoutProjectM3PerYear?: number | null;
  flowM3PerHour?: number | null;
  operatingHoursPerYear?: number | null;
  daysOfAccessPerYear?: number | null;
  meteredM3PerYear?: number | null;
  /** The visitor's own litres a person a day, with where the figure comes from. */
  litresPerPersonPerDay?: { value: number; source: string } | null;
}

export interface VioletFill {
  input: D3Input;
  /** The fields set. */
  filled: string[];
  /** Numbers outside their range, each with its message. They are not set. */
  refused: D3Refusal[];
}

const OPTIONS: readonly D3Option[] = ["metered", "capacity", "beneficiaries"];

/** Fills her input from an answer. A number outside its range is refused and never set. The input handed in is not changed. */
export function fillViolet(input: D3Input, answer: VioletAnswer): VioletFill {
  let next: D3Input = { ...input };
  const filled: string[] = [];
  const refused: D3Refusal[] = [];
  if (answer.option !== undefined && OPTIONS.includes(answer.option) && !(answer.option === "metered" && input.view === "ex-ante")) {
    next.option = answer.option;
    filled.push("option");
  }
  if (answer.accessLevel === "full" || answer.accessLevel === "limited") {
    next.accessLevel = answer.accessLevel;
    filled.push("accessLevel");
  }
  if (answer.population !== undefined) {
    const population = { ...next.population };
    const { served, mode, householdSize } = answer.population;
    const bad = d3Refusals({ ...input, population: { ...answer.population, ...(mode === undefined && population.mode !== undefined ? { mode: population.mode } : {}) } }).filter((r) => r.field.startsWith("population."));
    refused.push(...bad);
    const ok = (f: D3Refusal["field"]): boolean => !bad.some((r) => r.field === f);
    if (served !== undefined && ok("population.served")) {
      population.served = served;
      filled.push("population.served");
    }
    if (mode === "people" || mode === "households") {
      population.mode = mode;
      filled.push("population.mode");
    }
    if (householdSize !== undefined && ok("population.householdSize")) {
      population.householdSize = householdSize;
      filled.push("population.householdSize");
    }
    if (Object.keys(population).length > 0) next.population = population;
  }
  for (const key of Object.keys(D3_RANGES) as D3NumberKey[]) {
    const v = answer[key];
    if (v === undefined) continue;
    const message = v === null ? null : refuseD3(key, v);
    if (message !== null) {
      refused.push({ field: key, message });
      continue;
    }
    if (v === null) delete next[key];
    else next[key] = v;
    filled.push(key);
  }
  const litres = answer.litresPerPersonPerDay;
  if (litres === null) {
    delete next.litresPerPersonPerDay;
    filled.push("litresPerPersonPerDay");
  } else if (litres !== undefined && typeof litres.source === "string" && litres.source.trim() !== "") {
    const message = rangeRefusal("lpcd", litres.value);
    if (message !== null) refused.push({ field: "litresPerPersonPerDay", message });
    else {
      next.litresPerPersonPerDay = { value: litres.value, source: litres.source.trim() };
      filled.push("litresPerPersonPerDay");
    }
  }
  // The engine has the last word on an input. One it cannot take changes nothing.
  try {
    computeD3(next);
  } catch {
    next = input;
    filled.length = 0;
  }
  return { input: next, filled, refused };
}

/** The facts her answer may fill, by the key of the question that asks for each, with what each is, as a visitor reads it. */
export const VIOLET_FACTS: Record<string, string> = {
  ...FACT_LABEL,
  "population.mode": "Whether the count is of people or of households",
  accessLevel: "Whether people have full or limited access to the water",
};

/** The shape her answer takes, for the site's call to the model. */
export const VIOLET_ANSWER_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "handBack"],
  properties: {
    ...ANSWER_FIELDS,
    ...factFields(Object.keys(VIOLET_FACTS)),
    facts: {
      type: "object",
      additionalProperties: false,
      description: "Project facts for the record, only what the visitor has just said or changed.",
      properties: {
        ...KIND_FACT_SCHEMA,
        homeUse: { type: "string", enum: [...HOME_USES], description: "Whether people use the water at home." },
      },
    },
    values: {
      type: "object",
      additionalProperties: false,
      description: "Only what the visitor has just said, in their own numbers. Leave out everything else. Null clears a value.",
      properties: {
        option: { type: "string", enum: [...OPTIONS] },
        accessLevel: { type: "string", enum: ["full", "limited"] },
        population: {
          type: "object",
          additionalProperties: false,
          properties: { served: { type: "number" }, mode: { type: "string", enum: ["people", "households"] }, householdSize: { type: "number" } },
        },
        ...Object.fromEntries((Object.keys(D3_RANGES) as D3NumberKey[]).map((k) => [k, { type: ["number", "null"] }])),
        litresPerPersonPerDay: {
          type: ["object", "null"],
          additionalProperties: false,
          required: ["value", "source"],
          properties: { value: { type: "number" }, source: { type: "string" } },
        },
      },
    },
  },
};

export interface VioletReply {
  reply: string;
  handBack: HandBack;
  leftForNow: string[];
  /** The source, the treatment, the facts about them and home use, for the record (`addVioletFacts`). In the Agent Commons, for her temporary record. */
  facts: GivenFacts;
  values: VioletAnswer;
  /** The key of the one thing this reply asks for. The site passes it back as `asked` on the next turn. */
  asking?: string;
  /** The visitor's own words each fact she fills rests on. */
  heard?: Heard[];
}

/** Reads her answer as the model gave it. Null when there is no reply. The numbers are checked by `fillViolet`. */
export function readVioletAnswer(raw: unknown): VioletReply | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as { reply?: unknown; handBack?: unknown; leftForNow?: unknown; facts?: unknown; values?: unknown; asking?: unknown; heard?: unknown };
  if (typeof o.reply !== "string" || o.reply.trim() === "") return null;
  const asking = readAsking(o.asking, VIOLET_ASK_KEYS);
  const heard = readHeard(o.heard, Object.keys(VIOLET_FACTS));
  return {
    reply: o.reply.trim(),
    handBack: readHandBack(o.handBack),
    leftForNow: readLeft(o.leftForNow, VIOLET_ASK_KEYS),
    facts: readKind(o.facts),
    values: typeof o.values === "object" && o.values !== null ? (o.values as VioletAnswer) : {},
    ...(asking !== undefined ? { asking } : {}),
    ...(heard.length > 0 ? { heard } : {}),
  };
}

/**
 * Adds what an answer gave to the project record: the project facts it lacked, her inputs and her figure. Returns a new
 * record. A count that failed the fact check is in `refused`. For a project D-3 does not count, only the facts are added.
 */
export function addVioletAnswer(record: ProjectRecord, fill: VioletFill, done?: boolean): AddedFacts {
  const facts = addGivenFacts(record, "violet", violetGivenFacts(fill.input));
  if (d3Stop(record.facts) !== null) return facts;
  return { ...facts, record: addVioletResults(facts.record, { input: fill.input, result: computeD3(fill.input), ...(done !== undefined ? { done } : {}) }) };
}

/** Marks her part done on the record, or not done. */
export function setVioletDone(record: ProjectRecord, done: boolean): ProjectRecord {
  return setAgentResults(record, "violet", { done });
}

// ── The guards on her numbers (2026-11-25) ───────────────────────────────────────────────────────────────────────

export interface VioletGuardInput {
  input: D3Input;
  /** The visitor's own messages in this chat, oldest first. */
  messages: readonly string[];
  /** The key of the question just asked: her last reply's `asking`. */
  asked?: string;
  /** The project's facts on the record now. In the Agent Commons, her temporary record's. */
  facts?: ProjectFacts;
}

export interface GuardedVioletReply {
  /** Her answer, with every number and every fact that did not pass taken out. */
  reply: VioletReply;
  /** Send this back to her once, in the same turn. Null: nothing to send. On the second answer, show `told` instead. */
  returned: string | null;
  /** What the visitor is told when a number is taken out. */
  told: string | null;
  /** The out-of-range message for the fact just asked, whether or not she sent the number. */
  outOfRange: string | null;
}

/** Her facts, as core's guard on facts reads them. A yes-or-no fact and home use are taken only as an answer. */
function answerFacts(reply: VioletReply, input: D3Input, facts?: ProjectFacts): AnswerFact[] {
  const held: Record<string, string | boolean | undefined> = {
    ...(facts !== undefined ? kindFactsOf(facts) : {}),
    homeUse: facts?.homeUse?.value,
    "population.mode": input.population?.mode,
    accessLevel: input.accessLevel,
  };
  const out: AnswerFact[] = [];
  const add = (key: string, value: string | boolean | undefined): void => {
    if (value === undefined) return;
    out.push({ key, name: VIOLET_FACTS[key] ?? key, value, held: held[key], ...((YES_NO_FACTS as readonly string[]).includes(key) || key === "homeUse" ? { onlyAsAnswer: true } : {}) });
  };
  for (const key of KIND_FACTS) add(key, reply.facts[key]);
  add("homeUse", reply.facts.homeUse);
  add("population.mode", reply.values.population?.mode);
  add("accessLevel", reply.values.accessLevel);
  return out;
}

/**
 * Core's guards on her answer: on her numbers, and on every other fact she fills (2026-11-26). A fact the visitor did not
 * give is dropped quietly, and stays blank: `told` never names it, and she is told once, in `returned`, that it is blank. The site calls it on each answer, and sends `returned` back once.
 */
export function guardVioletReply(reply: VioletReply, { input, messages, asked, facts: onRecord }: VioletGuardInput): GuardedVioletReply {
  const households: RangeWords = (reply.values.population?.mode ?? input.population?.mode) === "households" ? { name: "Households served" } : {};
  const ranges: Record<string, { key: RangeKey; words?: RangeWords; value: number | null | undefined; held: number | undefined }> = {
    ...Object.fromEntries((Object.keys(D3_RANGES) as D3NumberKey[]).map((k) => [k, { key: D3_RANGES[k], value: reply.values[k], held: input[k] }])),
    "population.served": { key: "population.served", words: households, value: reply.values.population?.served, held: input.population?.served },
    "population.householdSize": { key: "population.householdSize", value: reply.values.population?.householdSize, held: input.population?.householdSize },
    litresPerPersonPerDay: { key: "lpcd", value: reply.values.litresPerPersonPerDay?.value, held: input.litresPerPersonPerDay?.value },
  };
  const numbers: AnswerNumber[] = Object.entries(ranges).flatMap(([id, r]) =>
    typeof r.value === "number" ? [{ id, name: r.words?.name ?? RANGES[r.key].name, value: r.value, held: r.held, ask: id }] : [],
  );
  const { kept, faults } = checkAnswerNumbers(numbers, { messages, asked });
  const out = new Set(numbers.map((n) => n.id).filter((id) => !kept.includes(id)));
  const values: VioletAnswer = { ...reply.values };
  for (const k of Object.keys(D3_RANGES) as D3NumberKey[]) if (out.has(k)) delete values[k];
  if (out.has("litresPerPersonPerDay")) delete values.litresPerPersonPerDay;
  if (values.population !== undefined) {
    const population = { ...values.population };
    if (out.has("population.served")) delete population.served;
    if (out.has("population.householdSize")) delete population.householdSize;
    if (Object.keys(population).length > 0) values.population = population;
    else delete values.population;
  }
  const factCheck = checkAnswerFacts(answerFacts(reply, input, onRecord), { messages, asked, asking: reply.asking, heard: reply.heard });
  const refused = new Set(factCheck.refused.map((r) => r.fact.key));
  const facts: GivenFacts = { ...reply.facts };
  for (const key of refused) delete (facts as Record<string, unknown>)[key];
  if (refused.has("accessLevel")) delete values.accessLevel;
  if (refused.has("population.mode") && values.population !== undefined) {
    const { mode: _mode, ...population } = values.population;
    if (Object.keys(population).length > 0) values.population = population;
    else delete values.population;
  }
  const target = asked === undefined ? undefined : ranges[asked];
  return {
    reply: { ...reply, facts, values },
    returned: joinGuards(returnToAgent(faults), factsReturnedToAgent(factCheck.refused)),
    told: takenOut(faults),
    outOfRange: target === undefined ? null : askedOutOfRange(target.key, messages.at(-1) ?? "", target.words ?? {}),
  };
}

// ── What she can see of her screen ───────────────────────────────────────────────────────────────────────────────

export interface VioletScreen {
  projectName: string;
  input: D3Input;
  result: D3Result;
  /** Left out: a site with a project record. */
  place?: Place;
  /** The messages for numbers on the record that are outside their range. */
  refusals?: readonly string[];
  /** The project's facts. In the Agent Commons, her temporary record's. Left out, she does not look at the kind of project. */
  facts?: ProjectFacts;
}

/**
 * What Violet can see of her own screen: the same figures the visitor is looking at, from the engine's result, never
 * worked out here. The site reads it when it sends a turn.
 */
export function violetPageContext({ projectName, input, result, place, refusals = [], facts }: VioletScreen): string {
  // A PROJECT D-3 DOES NOT COUNT IS SAID, NOT ASKED FOR AGAIN.
  const stop = facts === undefined ? null : d3Stop(facts);
  if (stop !== null) {
    const why =
      stop.because === "not covered yet"
        ? `It is held for now${stop.label === null ? "" : ` ("${stop.label}")`}: WaterBots shows no figure until an open question is answered. The visitor reads: "${NO_CALCULATOR_YET}"`
        : stop.because === "another kind of project"
          ? `It is another kind of project. Rainwater, reuse, irrigation supply, leak repair and stream work are not set up yet: the guidebook has methods for them, and WaterBots has not built those types of project. Its water pathway stays in play. The visitor reads: "${NO_CALCULATOR_YET}"`
          : `Still to be said: ${FACT_LABEL[stop.because === "fact not given" ? stop.fact : "homeUse"]}.`;
    return `The user is on the water-benefit calculator (VWBA 2.0, D-3) for project "${projectName}". ${why} There are NO figures on this screen${d3Waits(stop) ? "." : ", and the tool does not count it."}`;
  }
  const ways: Record<D3Option, string> = { metered: "meter readings", capacity: "what the system can supply", beneficiaries: "the people served" };
  const lines = [
    `The user is on the water-benefit calculator (VWBA 2.0, D-3) for project "${projectName}", ${input.view === "ex-ante" ? "before the project runs" : "after the project runs"}, counted from ${ways[input.option]}. Its status is "${D3_STATUS}".`,
  ];
  if (refusals.length > 0) lines.push(`Numbers on the record that cannot be used: ${refusals.join(" ")}`);
  const held = result.values.filter((v) => v.used !== null);
  if (held.length > 0) lines.push(`On the screen: ${held.map((v) => `${v.label} ${shown(v)} (${v.origin ?? "calculated"})`).join("; ")}.`);
  if (result.vwbM3PerYear === null) {
    lines.push(`Still blank: ${result.awaiting.join("; ")}. There is NO figure on this screen yet.`);
    if (place !== undefined && !hasProjectRecord(place)) lines.push("There is no project record here: the person gives each fact.");
  } else lines.push("If the user asks what changes when a value differs from these, call the calculator tool.");
  if (result.notes.length > 0) lines.push(`Notes on the screen: ${result.notes.join(" ")}`);
  return lines.join(" ");
}

// ── The block for a turn ─────────────────────────────────────────────────────────────────────────────────────────

/** What the record already holds that she reads, as lines. */
export function violetKnown(input: D3Input, facts?: ProjectFacts): string[] {
  const out: string[] = [];
  if (facts !== undefined && underTodaysRules(facts)) out.push(...knownKindFacts(facts));
  else if (facts?.technology !== undefined) out.push(`Kind of project: ${facts.technology.label}`);
  if (facts?.homeUse !== undefined) out.push(`People use the water at home: ${facts.homeUse.value}`);
  const pop = input.population;
  if (pop?.served !== undefined) out.push(`${pop.mode === "households" ? "Households" : pop.mode === "people" ? "People" : "People or households, not said which,"} served: ${pop.served.toLocaleString("en")}`);
  if (pop?.householdSize !== undefined) out.push(`People per household: ${pop.householdSize}`);
  if (input.accessLevel !== undefined) out.push(`Access: ${input.accessLevel}`);
  if (input.withoutProjectM3PerYear !== undefined) out.push(`Water this supply gave before the project: ${input.withoutProjectM3PerYear.toLocaleString("en")} m³ a year`);
  return out;
}

export interface VioletTurn extends VioletScreen {
  place: Place;
  saved?: boolean;
  opened?: boolean;
  introduce?: boolean;
  /** The visitor has said how the water can be counted. */
  chosen?: boolean;
  leftForNow?: readonly string[];
  /** Messages for numbers the visitor gave that were refused since the last turn. */
  refused?: readonly string[];
  /** The door's plain facts, from the site. Its own values are read instead of hers. */
  door?: DoorFacts;
  /** The visitor has talked with her before in this visit. */
  talkedBefore?: boolean;
}

/** The block a site adds after her instructions, for one turn. */
export function violetChatContext(t: VioletTurn): string {
  const stopped = t.facts !== undefined && d3Stop(t.facts) !== null;
  return chatContext({
    place: t.place,
    ...(t.saved !== undefined ? { saved: t.saved } : {}),
    ...(t.opened !== undefined ? { opened: t.opened } : {}),
    ...(t.introduce !== undefined ? { introduce: t.introduce } : {}),
    ...(t.door !== undefined ? { door: t.door } : {}),
    ...(t.talkedBefore !== undefined ? { talkedBefore: t.talkedBefore } : {}),
    known: violetKnown(t.input, t.facts),
    asks: openAsks(violetAsks(t.input, t.chosen, t.facts), t.leftForNow),
    kept: stopped ? [] : violetKept(t.result),
    figureShows: !stopped && t.result.vwbM3PerYear !== null,
    refused: t.refused ?? [],
    screen: violetPageContext(t),
  });
}

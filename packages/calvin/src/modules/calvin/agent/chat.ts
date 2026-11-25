/**
 * CALVIN'S CHAT (J5). Added by this repo, not part of the seed. What he asks for, in order; what he leaves at its default
 * or its assumed start; and how an answer fills his calculator. The rule and the parts he shares with Violet are core's
 * (`@waterbots/core/chat`). What he can see of his screen is `pageContext.ts`.
 *
 * Nothing here does a sum or calls a model: every figure is the engine's.
 */
import { ANSWER_FIELDS, CHAT_REPLY, chatContext, openAsks, openedTurn, readLeft, type Ask, type ChatSettings, type Kept } from "@waterbots/core/chat";
import type { Place } from "@waterbots/core/places";
import { askedOutOfRange, checkAnswerNumbers, isShare, returnToAgent, takenOut, type AnswerNumber } from "@waterbots/core/numberGuard";
import { KIND_ASKS, KIND_FACTS, KIND_FACT_SCHEMA, askFor, knownKindFacts, readKindFacts, type Answer } from "@waterbots/core/projectKinds";
import { RANGES, checkRange } from "@waterbots/core/ranges";
import { readHandBack, type HandBack } from "@waterbots/core/reply";
import { HOME_USES, setAgentResults, underTodaysRules, type GivenFacts, type ProjectFacts, type ProjectRecord } from "@waterbots/core/record";
import type { ScenarioResult, SiteTables } from "../engine";
import { sliderSpecs, shownValue, sliderLabel, storedValue } from "../screen/exAnte";
import { isEntered, missingMonitoring, monitoringValues, MONITORING_FIELD } from "../screen/monitoring";
import { activityEmissionsAsk, missingProjectFacts, type CalcState } from "../screen/state";
import { stateValues } from "../screen/valueRanges";

/** The settings his chat runs on. The same as in `config.yaml`; a test keeps them so. */
export const CALVIN_CHAT: ChatSettings = { model: "claude-opus-5", effort: "medium", maxOutputTokens: 16000, reply: CHAT_REPLY };

/** The turn the site sends when it opens his chat, so he speaks first. */
export const CALVIN_OPENED = openedTurn("Calvin");

// ── What he asks for ─────────────────────────────────────────────────────────────────────────────────────────────

const ASKS = {
  country: { key: "country", about: "which country the project is in", why: "it picks the country's default values, such as its fNRB", from: "where the project is", needed: true },
  served: { key: "population.served", about: "how many people or households the project serves", why: "the water the project gives is worked out from it", from: "the project's plan, or a count of the homes it serves", needed: true },
  mode: { key: "population.mode", about: "whether that count is of people or of households", why: "the two are counted in different ways", from: "the same plan or count", needed: true },
  householdSize: { key: "population.householdSize", about: "how many people live in a household", why: "there is no UN figure for this country, and it ties households to people", from: "the project's own survey", needed: true },
  pumpPower: {
    key: "pumpPower",
    about: "what powers the pump: hand, gravity, solar, diesel or grid power",
    why: "a pump on diesel or grid power gives off greenhouse gas, which is taken off the credits",
    from: "the pump the project plans or uses",
    needed: false,
  },
  pumpEmissions: {
    key: "activityEmissions",
    about: "how much greenhouse gas the pump gives off in a year, in tonnes of CO₂e",
    why: "the pump runs on diesel or grid power, and its emissions are taken off the credits",
    from: "the pump's fuel or electricity records",
    needed: true,
  },
  production: {
    key: "meteredVolumeL",
    about: "how much water the system will produce in a year, in litres",
    why: "credits follow the smaller of what people need and what the system supplies",
    from: "the system's design, or the meter once it runs",
    needed: false,
  },
  filedFnrb: {
    key: "fnrbFiledV1",
    about: "the fNRB the project filed under V1.0",
    why: "the old rules' side of the comparison has to use the project's own filed number",
    from: "the project's V1.0 filing",
    needed: true,
  },
  devices: {
    key: "devicesPerPremises",
    about: "how many devices each household has",
    why: "a device flow rate was given, and the limit on it is worked out for all of a household's devices",
    from: "sales or distribution records",
    needed: false,
  },
} as const satisfies Record<string, Ask>;

/** Every key he may ask for, for reading an answer. The monitored values are asked only once the project runs. */
export const CALVIN_ASK_KEYS: readonly string[] = [...KIND_FACTS, "homeUse", ...Object.values(ASKS).map((a) => a.key), ...Object.values(MONITORING_FIELD).map((f) => f.value)];

/**
 * What is still missing, in the order he asks. The first one is his one question. `transition` is true for a project
 * already credited under V1.0, which alone is asked for its filing. `answer` is what the one table says: while one fact
 * decides it, that fact comes first, and where no figure can show he asks for nothing. `notCoveredYet` is the label of a
 * project that already exists and is not covered yet: then he asks for nothing too. Nobody is asked for a kind.
 */
export function calvinAsks(state: CalcState, options: { tables?: SiteTables; transition?: boolean; notCoveredYet?: string; answer?: Answer } = {}): Ask[] {
  const { answer } = options;
  if (options.notCoveredYet !== undefined || (answer !== undefined && answer.says !== "counted" && answer.says !== "ask")) return [];
  const out: Ask[] = [];
  const missing = new Set(missingProjectFacts(state, options.tables).map((f) => f.key));
  if (missing.has("technology")) out.push(answer?.says === "ask" ? askFor(answer) : KIND_ASKS.waterSource);
  if (missing.has("country")) out.push(ASKS.country);
  if (missing.has("peopleServed")) out.push(ASKS.served);
  if (missing.has("peopleServed") ? state.populationMode == null : missing.has("countedAs")) out.push(ASKS.mode);
  if (missing.has("householdSize")) out.push(ASKS.householdSize);
  if (activityEmissionsAsk(state)) out.push(ASKS.pumpEmissions);
  if (options.transition && state.fnrbFiledV1 == null) out.push(ASKS.filedFnrb);
  for (const m of missingMonitoring(state)) {
    out.push({ key: MONITORING_FIELD[m.key].value, about: m.label, why: `every figure depends on it after the project runs (${m.sdws})`, from: m.record, needed: true });
  }
  if (state.method === 1) {
    if (state.pumpPower == null && state.activityEmissions == null) out.push(ASKS.pumpPower);
    if (state.meteredVolumeL == null) out.push(ASKS.production);
  }
  // Asked only with a flow rate, which he never asks for: it matters only through the device limit.
  if (state.method === 2 && state.deviceCapacityLPerHour != null && state.devicesPerPremises == null) out.push(ASKS.devices);
  return out;
}

/**
 * The values he does not ask for: each at its cited default, or its assumed start, called what its tag on the screen
 * says. Before the project runs only; after it, the monitored values are asked for.
 */
export function calvinKept(state: CalcState, options: { sliders?: boolean; result?: ScenarioResult | null } = {}): Kept[] {
  if (state.method == null) return [];
  const out: Kept[] = [];
  const exAnte = state.mode === "ex-ante";
  for (const spec of sliderSpecs(state)) {
    if (sliderLabel(state, spec.key) === "entered") continue;
    if (spec.key === "litres") {
      out.push({ key: "litresPerPersonPerDay", label: spec.label, called: options.sliders ? "assumed" : "default", shown: shownValue(spec, storedValue(state, "litres")), source: spec.start.source ?? "no source yet" });
    } else if (exAnte) {
      out.push({ key: MONITORING_FIELD[spec.key].value, label: spec.label, called: "assumed", shown: shownValue(spec, storedValue(state, spec.key)), source: spec.start.source ?? "no source yet" });
    }
  }
  if (exAnte && !isEntered(state, "cleanBoil")) {
    const m = monitoringValues(state).find((v) => v.key === "cleanBoil")!;
    out.push({ key: "xCleanboil", label: "Share still boiling the safe water", called: "assumed", shown: String(state.xCleanboil), source: `not yet surveyed (${m.sdws})` });
  }
  if (state.cBaseline === 0) out.push({ key: "cBaseline", label: "Already-safe share", called: "assumed", shown: "0", source: "V2.0 sets no default (V2.0 SDWS 12, p.53); a baseline survey sets it" });
  const fnrb = options.result?.provenance.find((p) => p.field === "fNRB");
  if (options.result && state.fnrbOverride == null && fnrb) out.push({ key: "fnrbOverride", label: "fNRB", called: "default", shown: String(options.result.fNRB), source: fnrb.label });
  if (state.method === 2 && state.deviceCapacityLPerHour != null && state.usageHoursPerDay == null) {
    out.push({ key: "usageHoursPerDay", label: "Hours the device is used a day", called: "default", shown: "5", source: "V2.0 SDWS 35, Option 1" });
  }
  return out;
}

// ── Filling his calculator from an answer ────────────────────────────────────────────────────────────────────────

/** What an answer may set on his screen, by the state's own names. A null clears a value that may be blank. */
export const CALVIN_ANSWER_VALUES = [
  "populationCount",
  "householdSizeOverride",
  "litresPerPersonPerDay",
  "operationalDays",
  "waterQualityFactor",
  "usageRate",
  "xCleanboil",
  "cBaseline",
  "meteredVolumeL",
  "activityEmissions",
  "premises",
  "deviceCapacityLPerHour",
  "usageHoursPerDay",
  "devicesPerPremises",
  "etaOverride",
  "fnrbOverride",
  "fnrbFiledV1",
] as const;
export type CalvinAnswerValue = (typeof CALVIN_ANSWER_VALUES)[number];

export interface CalvinAnswer {
  /** Project facts, for the record (`addCalvinFacts`). The screen follows the record. */
  facts?: GivenFacts;
  /** Values for his screen. */
  values?: Partial<Record<CalvinAnswerValue, number | null>>;
}

export interface CalvinFill {
  /** Hand it to the seat's `patch`. */
  patch: Partial<CalcState>;
  filled: CalvinAnswerValue[];
  /** Numbers outside their range, each with its message. They are not in the patch. */
  refused: { field: CalvinAnswerValue; message: string }[];
}

/**
 * Turns an answer into a change for his screen. Shares are fractions, from 0 to 1. A number outside its range is refused
 * and left out. A value this run does not use is left out too.
 */
export function fillCalvin(state: CalcState, answer: CalvinAnswer): CalvinFill {
  const out: CalvinFill = { patch: {}, filled: [], refused: [] };
  const values = new Map(stateValues(state).map((v) => [v.id, v]));
  for (const field of CALVIN_ANSWER_VALUES) {
    const v = answer.values?.[field];
    const target = values.get(field);
    if (v === undefined || target === undefined) continue;
    if (v === null) {
      if (!target.clear) continue;
      Object.assign(out.patch, target.clear(state));
      out.filled.push(field);
      continue;
    }
    const check = checkRange(target.key, v, target.words ?? {});
    if (!check.ok) out.refused.push({ field, message: check.message });
    else {
      Object.assign(out.patch, target.set(state, v));
      out.filled.push(field);
    }
  }
  return out;
}

/** The shape his answer takes, for the site's call to the model. */
export const CALVIN_ANSWER_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "handBack"],
  properties: {
    ...ANSWER_FIELDS,
    facts: {
      type: "object",
      additionalProperties: false,
      description: "Project facts the visitor has just given or changed, for the record. Leave out everything else.",
      properties: {
        country: { type: "string", description: "ISO 3166-1 alpha-3." },
        population: {
          type: "object",
          additionalProperties: false,
          properties: { served: { type: "number" }, mode: { type: "string", enum: ["people", "households"] }, householdSize: { type: "number" } },
        },
        pumpPower: { type: "string", enum: ["hand", "gravity", "solar", "diesel", "grid"] },
        ...KIND_FACT_SCHEMA,
        homeUse: { type: "string", enum: [...HOME_USES], description: "Whether people use the water at home." },
      },
    },
    values: {
      type: "object",
      additionalProperties: false,
      description: "Values for the screen, only what the visitor has just said, in their own numbers. Shares are fractions from 0 to 1. Null clears a value.",
      properties: Object.fromEntries(CALVIN_ANSWER_VALUES.map((k) => [k, { type: ["number", "null"] }])),
    },
  },
};

export interface CalvinReply extends CalvinAnswer {
  reply: string;
  handBack: HandBack;
  leftForNow: string[];
}

const PUMPS = ["hand", "gravity", "solar", "diesel", "grid"] as const;

/** The project facts in an answer, kept only where they hold. */
function readFacts(raw: unknown): GivenFacts {
  if (typeof raw !== "object" || raw === null) return {};
  const o = raw as Record<string, unknown>;
  const out: GivenFacts = { ...readKindFacts(o) };
  const homeUse = HOME_USES.find((h) => h === o.homeUse);
  if (homeUse !== undefined) out.homeUse = homeUse;
  if (typeof o.country === "string" && /^[A-Za-z]{3}$/.test(o.country)) out.country = o.country.toUpperCase();
  if (typeof o.population === "object" && o.population !== null) out.population = o.population as NonNullable<GivenFacts["population"]>;
  const pump = PUMPS.find((p) => p === o.pumpPower);
  if (pump !== undefined) out.pumpPower = pump;
  return out;
}

/** Reads his answer as the model gave it. Null when there is no reply. `fillCalvin` and the record check the numbers. */
export function readCalvinAnswer(raw: unknown): CalvinReply | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as { reply?: unknown; handBack?: unknown; leftForNow?: unknown; facts?: unknown; values?: unknown };
  if (typeof o.reply !== "string" || o.reply.trim() === "") return null;
  return {
    reply: o.reply.trim(),
    handBack: readHandBack(o.handBack),
    leftForNow: readLeft(o.leftForNow, CALVIN_ASK_KEYS),
    facts: readFacts(o.facts),
    values: typeof o.values === "object" && o.values !== null ? (o.values as NonNullable<CalvinAnswer["values"]>) : {},
  };
}

// ── The guards on his numbers (2026-11-25) ───────────────────────────────────────────────────────────────────────

export interface CalvinGuardInput {
  state: CalcState;
  /** The visitor's own messages in this chat, oldest first. */
  messages: readonly string[];
  /** The key of the question just asked. */
  asked?: string;
}

export interface GuardedCalvinReply {
  /** His answer, with every number that did not pass taken out. */
  reply: CalvinReply;
  /** Send this back to him once, in the same turn. Null: nothing to send. On the second answer, show `told` instead. */
  returned: string | null;
  /** What the visitor is told when a number is taken out. */
  told: string | null;
  /** The out-of-range message for the fact just asked, whether or not he sent the number. */
  outOfRange: string | null;
}

/** The question a number on his screen answers. */
const ASK_OF: Partial<Record<CalvinAnswerValue, string>> = { populationCount: "population.served", householdSizeOverride: "population.householdSize" };

/** Core's guards on his answer. The site calls it on each answer, and sends `returned` back once. */
export function guardCalvinReply(reply: CalvinReply, { state, messages, asked }: CalvinGuardInput): GuardedCalvinReply {
  const fields = new Map(stateValues(state).map((v) => [v.id, v]));
  const nameOf = (id: string, fallback: string): string => {
    const v = fields.get(id);
    return v === undefined ? fallback : (v.words?.name ?? RANGES[v.key].name);
  };
  const numbers: AnswerNumber[] = [];
  for (const id of CALVIN_ANSWER_VALUES) {
    const value = reply.values?.[id];
    if (typeof value !== "number") continue;
    const v = fields.get(id);
    numbers.push({ id: `values.${id}`, name: nameOf(id, id), value, held: v?.get(state), ask: ASK_OF[id] ?? id, share: v !== undefined && isShare(v.key) });
  }
  const pop = reply.facts?.population;
  if (typeof pop?.served === "number") numbers.push({ id: "facts.served", name: nameOf("populationCount", "People served"), value: pop.served, held: state.populationCount, ask: "population.served" });
  if (typeof pop?.householdSize === "number") numbers.push({ id: "facts.householdSize", name: "People per household", value: pop.householdSize, held: state.householdSizeOverride, ask: "population.householdSize" });

  const { kept, faults } = checkAnswerNumbers(numbers, { messages, asked });
  const keeps = (id: string): boolean => kept.includes(id);
  const values = Object.fromEntries(Object.entries(reply.values ?? {}).filter(([id, v]) => typeof v !== "number" || keeps(`values.${id}`)));
  const facts: GivenFacts = { ...reply.facts };
  if (pop !== undefined) {
    const { served, householdSize, ...rest } = pop;
    const next = { ...rest, ...(served !== undefined && keeps("facts.served") ? { served } : {}), ...(householdSize !== undefined && keeps("facts.householdSize") ? { householdSize } : {}) };
    if (Object.keys(next).length > 0) facts.population = next;
    else delete facts.population;
  }
  const target = stateValues(state).find((v) => (ASK_OF[v.id as CalvinAnswerValue] ?? v.id) === asked);
  return {
    reply: { ...reply, facts, values },
    returned: returnToAgent(faults),
    told: takenOut(faults),
    outOfRange: target === undefined ? null : askedOutOfRange(target.key, messages.at(-1) ?? "", target.words ?? {}),
  };
}

/** Marks his part done on the record, or not done. */
export function setCalvinDone(record: ProjectRecord, done: boolean): ProjectRecord {
  return setAgentResults(record, "calvin", { done });
}

// ── The block for a turn ─────────────────────────────────────────────────────────────────────────────────────────

/** What the record already holds that he reads, as lines. */
export function calvinKnown(state: CalcState, facts?: ProjectFacts): string[] {
  const out: string[] = facts !== undefined && underTodaysRules(facts) ? knownKindFacts(facts) : [];
  if (facts?.homeUse !== undefined) out.push(`People use the water at home: ${facts.homeUse.value}`);
  if (out.length === 0 && state.method !== null) out.push(`Technology: ${state.method === 1 ? "a community water supply" : "household water treatment"}`);
  if (state.countryIso !== null) out.push(`Country: ${state.countryIso}`);
  if (state.populationCount !== null) out.push(`${state.populationMode === "households" ? "Households" : state.populationMode === "people" ? "People" : "People or households, not said which,"} served: ${state.populationCount.toLocaleString("en")}`);
  if (state.householdSizeOverride != null) out.push(`People per household: ${state.householdSizeOverride}`);
  if (state.pumpPower !== null) out.push(`The pump runs on: ${state.pumpPower}`);
  return out;
}

export interface CalvinTurn {
  place: Place;
  state: CalcState;
  /** The seat's `pageContext()`, read when the turn is sent. */
  screen: string;
  /** The V2.0 result, when there is one. */
  result?: ScenarioResult | null;
  saved?: boolean;
  opened?: boolean;
  introduce?: boolean;
  sliders?: boolean;
  transition?: boolean;
  notCoveredYet?: string;
  /** What the one table says (`CalvinProject.answer`). */
  answer?: Answer;
  /** The project's facts. In the Agent Commons, his temporary record's. */
  facts?: ProjectFacts;
  tables?: SiteTables;
  leftForNow?: readonly string[];
  refused?: readonly string[];
}

/** The block a site adds after his instructions, for one turn. */
export function calvinChatContext(t: CalvinTurn): string {
  return chatContext({
    place: t.place,
    saved: t.saved ?? false,
    opened: t.opened ?? false,
    introduce: t.introduce ?? false,
    known: calvinKnown(t.state, t.facts),
    asks: openAsks(calvinAsks(t.state, { tables: t.tables, transition: t.transition, notCoveredYet: t.notCoveredYet, answer: t.answer }), t.leftForNow),
    kept: calvinKept(t.state, { sliders: t.sliders, result: t.result }),
    figureShows: t.result != null,
    refused: t.refused ?? [],
    screen: t.screen,
  });
}

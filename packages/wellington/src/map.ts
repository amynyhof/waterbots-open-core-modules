/**
 * THE AGENT MAP, AS WELLINGTON READS IT. Carried from the open site (`api/_agentMap.ts` and `mapForWellington` in
 * `src/lib/projectRecord.ts`, commit 0f16957).
 *
 * Core's map, run on the shared record, says who is called and the one next step. `mapNote` reads it into codes for him;
 * a site that sends the map from the browser checks them again with `readMap`. Everything is checked against closed
 * lists and capped; the one free text is "what would change it", made from the reading on the record, never from
 * Phoebe's own sentences.
 *
 * HE LEADS FROM IT. He hosts by step: he says which step is done, names the next step and what it helps decide, and
 * introduces who helps there. He never calls the screening done while a step is ahead (`saysAllDone`). The route at a
 * step's end is the map's (`stepEndRoute`), and a route to an agent the map has closed is "none" (`guardRoute`). An agent
 * whose turn has not come yet is not closed.
 *
 * NO KIND (2026-11-25). The facts the map gathers first are where the water comes from and whether it is treated, and the
 * one small question about them is core's (`KIND_ASKS`). Nobody is asked for a kind or a class.
 */
import type { AgentMap } from "@waterbots/core/agentMap";
import { KIND_ASKS } from "@waterbots/core/projectKinds";
import type { Place } from "@waterbots/core/places";
import { needsHomeUse, recordTechnology, type AgentId, type ProjectRecord } from "@waterbots/core/record";
import type { StandardId } from "@waterbots/core/standards";
import { technologyCoverage } from "@waterbots/core/technologyLabels";
import type { Route } from "./answer.js";


const AGENTS = ["wellington", "phoebe", "bridget", "calvin", "violet"] as const satisfies readonly AgentId[];
type Agent = (typeof AGENTS)[number];
const NEXTS = ["gather facts", "call", "point to the WaterBots team", "report or sign-up"] as const;
/** The facts the map may ask him to gather. "technology" only for a screening made before the kinds were worked out. */
export const MAP_FACTS = ["waterSource", "treatment", "technology", "country", "homeUse"] as const;
type MapFact = (typeof MAP_FACTS)[number];
const READINGS = ["likely", "more to learn", "unlikely"] as const;
const PATHWAYS = { vwba: "Water benefits", carbon: "Carbon credits" } as const;
type Pathway = keyof typeof PATHWAYS;

/** The three steps, by the journey's names. The journey is told by step, not by agent. */
export const STEP_NAMES = ["Eligibility", "Partners", "Quantify"] as const;
const STEP_KEYS = ["eligibility", "partners", "quantify"] as const;
type StepKey = (typeof STEP_KEYS)[number];
const STEP_OF: Partial<Record<Agent, number>> = { phoebe: 1, bridget: 2, calvin: 3, violet: 3 };

/** The step's own words, numbered as this project has them: one with no calculator ahead has two. */
const stepWords = (n: number, steps?: readonly StepKey[]): string => {
  const own = steps?.length ? steps : STEP_KEYS;
  const at = own.indexOf(STEP_KEYS[n - 1]!);
  return `Step ${at < 0 ? n : at + 1} of ${at < 0 ? STEP_NAMES.length : own.length}, ${STEP_NAMES[n - 1]}`;
};

/** The desks he may join, the agent and step behind each, and the desk's route. */
export const JOINED = ["eligibility", "map", "quantification", "water"] as const;
export type Joined = (typeof JOINED)[number];
const AT: Record<Joined, { agent: Agent; step: number }> = {
  eligibility: { agent: "phoebe", step: 1 },
  map: { agent: "bridget", step: 2 },
  quantification: { agent: "calvin", step: 3 },
  water: { agent: "violet", step: 3 },
};

/** Long enough for a few card titles, short enough to refuse an essay. */
const MAX_CHANGE_CHARS = 600;

export interface MapNote {
  next: (typeof NEXTS)[number];
  agent?: Agent;
  facts: MapFact[];
  called: Agent[];
  closed: Agent[];
  readings: { pathway: Pathway; reading: (typeof READINGS)[number]; wouldChange: string }[];
  transitioning: boolean;
  /** The steps that are done, and every agent who helps with the next one. */
  done: StepKey[];
  agents: Agent[];
  /** Calvin is called, and his calculator does not count this screening's label. */
  uncovered: boolean;
  /** Water benefits stay in play and no calculator counts this kind of project yet. */
  noWaterCalculator: boolean;
  /** The steps this project has, in order. Empty: all three. */
  steps: StepKey[];
}

/** The map off a request, or null when none came or it does not hold. */
export function readMap(value: unknown): MapNote | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const next = NEXTS.find((s) => s === v.next);
  if (!next) return null;
  const agents = (list: unknown): Agent[] => (Array.isArray(list) ? AGENTS.filter((a) => list.includes(a)) : []);
  const agent = AGENTS.find((a) => a === v.agent);
  if (next === "call" && !agent) return null;
  const readings: MapNote["readings"] = [];
  for (const raw of Array.isArray(v.readings) ? v.readings : []) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const reading = READINGS.find((x) => x === r.reading);
    const pathway = (Object.keys(PATHWAYS) as Pathway[]).find((p) => p === r.pathway);
    if (!reading || !pathway || readings.some((x) => x.pathway === pathway)) continue;
    const change = typeof r.wouldChange === "string" ? r.wouldChange.replace(/\s+/g, " ").trim() : "";
    readings.push({ pathway, reading, wouldChange: change.length <= MAX_CHANGE_CHARS ? change : "" });
  }
  const list = <T extends string>(raw: unknown, from: readonly T[]): T[] => (Array.isArray(raw) ? from.filter((k) => (raw as unknown[]).includes(k)) : []);
  return {
    next,
    ...((next === "call" || next === "gather facts") && agent ? { agent } : {}),
    facts: list(v.facts, MAP_FACTS),
    called: agents(v.called),
    closed: agents(v.closed),
    readings,
    transitioning: v.transitioning === true,
    done: list(v.done, STEP_KEYS),
    agents: agents(v.agents),
    uncovered: v.uncovered === true,
    noWaterCalculator: v.noWaterCalculator === true,
    steps: list(v.steps, STEP_KEYS),
  };
}

// ── From core's map to his note ──────────────────────────────────────────────────────────────────────────────────

/** The desk of each agent he hands to. */
const DESK_OF: Record<Exclude<Agent, "wellington">, Joined> = { phoebe: "eligibility", bridget: "map", calvin: "quantification", violet: "water" };

function callOf(map: AgentMap, agent: AgentId) {
  return map.agents.find((c) => c.agent === agent);
}

/** Whether an agent's pathway stays in play and its calculator does not count this kind of project. */
function noCalculatorFor(map: AgentMap, agent: AgentId): boolean {
  const call = callOf(map, agent);
  return call !== undefined && !call.called && (call.because === "not covered yet" || call.because === "not set up yet" || call.because === "another kind of project");
}

/** Whether the map closes an agent's desk. An agent whose turn has not come yet is not closed. */
function closedBy(map: AgentMap, agent: AgentId): boolean {
  const call = callOf(map, agent);
  return call !== undefined && !call.called && (call.because === "pathway unlikely" || call.because === "no pathway forward" || noCalculatorFor(map, agent));
}

/** The map's own rule for asking home use, read where a missing country would otherwise stand in front of it. */
function homeUseAsked(record: ProjectRecord, map: AgentMap): boolean {
  if (map.next.step === "gather facts" && map.next.facts.includes("homeUse")) return true;
  return record.agents.phoebe?.done === true && needsHomeUse(record.facts) && map.pathways.some((p) => p.pathway === "vwba" && p.inPlay);
}

/**
 * His note, from core's map on the shared record. It is the map's own one next step, with two things added, as on the
 * open site: Step 3 names every calculator the map calls that is not done, and once Phoebe's part is ended a missing
 * country no longer holds the visitor at "gather facts". `reads` are the pathways this site reads.
 */
export function mapNote(record: ProjectRecord, map: AgentMap, options: { reads?: readonly StandardId[] } = {}): MapNote | null {
  if (map.place === "lobby-chat") return null;
  const reads = options.reads ?? (["vwba", "carbon"] as const);
  const called = (agent: AgentId) => callOf(map, agent)?.called === true;
  const ahead = (agent: AgentId) => called(agent) && record.agents[agent]?.done !== true;
  const phoebeDone = record.agents.phoebe?.done === true;
  const askHome = homeUseAsked(record, map);
  let next: MapNote["next"];
  let agents: Agent[] = [];
  if (!phoebeDone) {
    const read = reads.every((p) => record.pathways[p] !== undefined);
    if (read || called("phoebe")) {
      next = "call";
      agents = ["phoebe"];
    } else next = "gather facts";
  } else if (reads.every((p) => record.pathways[p]?.reading === "unlikely")) next = "point to the WaterBots team";
  else {
    const calculators = (["calvin", "violet"] as const).filter(ahead);
    agents = ahead("bridget") ? ["bridget"] : [...calculators];
    next = askHome ? "gather facts" : agents.length ? "call" : "report or sign-up";
  }
  const facts: MapFact[] = [...(map.next.step === "gather facts" ? map.next.facts.filter((f) => f !== "homeUse") : []), ...(askHome && phoebeDone ? (["homeUse"] as const) : [])];
  const done: StepKey[] = [
    ...(phoebeDone ? (["eligibility"] as const) : []),
    ...(phoebeDone && record.agents.bridget?.done === true ? (["partners"] as const) : []),
    ...(next === "report or sign-up" && (record.agents.calvin?.estimate || record.agents.violet?.estimate) ? (["quantify"] as const) : []),
  ];
  const label = record.facts.technology?.label;
  return {
    next,
    ...(agents[0] ? { agent: agents[0] } : {}),
    facts,
    called: map.agents.filter((c) => c.called).map((c) => c.agent),
    closed: map.agents.filter((c) => closedBy(map, c.agent)).map((c) => c.agent),
    readings: map.pathways.flatMap((p) =>
      p.reading === null || !(p.pathway in PATHWAYS)
        ? []
        : [{ pathway: p.pathway as Pathway, reading: p.reading, wouldChange: (record.pathways[p.pathway]?.wouldChange ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHANGE_CHARS) }],
    ),
    transitioning: record.facts.creditedUnderV1?.value === true,
    done,
    agents,
    uncovered: called("calvin") && recordTechnology(record) === undefined && label !== undefined && technologyCoverage(label) === "not covered yet",
    noWaterCalculator: noCalculatorFor(map, "violet"),
    steps: map.steps.map((s) => s.id),
  };
}

// ── The block he reads ───────────────────────────────────────────────────────────────────────────────────────────

const NAME: Record<Agent, string> = { wellington: "Wellington", phoebe: "Phoebe", bridget: "Bridget", calvin: "Calvin", violet: "Violet" };
const ROUTE_OF: Partial<Record<Agent, Route>> = { phoebe: "eligibility", bridget: "map", calvin: "quantification", violet: "water" };
const FACT_WORDS: Record<MapFact, string> = {
  waterSource: "where the water comes from",
  treatment: "whether the project treats the water, and where",
  technology: "what type of project it is",
  country: "which country it is in",
  homeUse: "whether people use the water at home",
};

/** The map's one more question, and why it matters. */
const HOME_USE_WHY = "a new or alternative supply can also be for reuse or for fields, and the water count covers only water people use at home";
/** True when the one thing the next step waits for is home use. */
export const asksHomeUse = (map: MapNote): boolean => map.next === "gather facts" && map.facts.includes("homeUse");
const helpersOf = (map: MapNote): Agent[] => (map.agents.length ? map.agents : map.agent ? [map.agent] : []);

/** The heading his instructions name, so he knows the block when he sees it. */
export const MAP_HEADING = "What the agent map says";

/** The one small question about the source or the treatment, from core: what it is about, what it is for, where it comes from. */
function smallQuestion(fact: MapFact | undefined): string | null {
  if (fact !== "waterSource" && fact !== "treatment") return null;
  const ask = KIND_ASKS[fact];
  return `The one small question: ${ask.about}. It matters because ${ask.why}. The answer usually comes from ${ask.from}. Ask about that fact only, in plain words, never as a list of kinds.`;
}

/** The end of the walk where he stands: the free site's own report and sign-up, or nothing more to offer. */
function endOffer(place: Place): string {
  return place === "free-site" ? ' Offer the screening report and "Save and sign up". The site draws both under your message.' : "";
}

export function mapBlock(map: MapNote, place: Place = "free-site"): string {
  const lines = [`# ${MAP_HEADING}`, "", "Worked out from this project's facts as they stand. You lead from it.", ""];
  for (const r of map.readings) {
    lines.push(`- ${PATHWAYS[r.pathway]}: ${r.reading}.${r.reading === "unlikely" && r.wouldChange ? ` What would change it: ${r.wouldChange}` : ""}`);
  }
  for (const key of map.done) lines.push(`- ${stepWords(STEP_KEYS.indexOf(key) + 1, map.steps)}: done.`);
  if (asksHomeUse(map)) {
    const helpers = helpersOf(map);
    const after = helpers.length
      ? `${stepWords(STEP_OF[helpers[0]!] ?? 2, map.steps)}, with ${helpers.map((a) => NAME[a]).join(" and ")} (route "${ROUTE_OF[helpers[0]!] ?? "none"}")`
      : place === "free-site"
        ? 'the screening report and "Save and sign up"'
        : "the end of the walk";
    lines.push(`The one next step: ask whether people use the water at home. Why it matters: ${HOME_USE_WHY}. "Not sure" is an answer. Ask it, with route "none". When they answer, return it in context.homeUse; what comes next is ${after}. The screening is not done while this is open.`);
    if (map.facts.length > 1) lines.push(`Still missing, and worth asking for after it: ${map.facts.filter((f) => f !== "homeUse").map((f) => FACT_WORDS[f]).join(" and ")}.`);
  } else if (map.next === "gather facts") {
    lines.push(`The one next step: gather ${map.facts.map((f) => FACT_WORDS[f]).join(" and ") || "the basics"}. Phoebe comes after that.`);
    const question = smallQuestion(map.facts[0]);
    if (question) lines.push(question);
  } else if (map.next === "call" && map.agent) {
    const helpers = map.agents.length ? map.agents : [map.agent];
    lines.push(`The one next step: ${stepWords(STEP_OF[map.agent] ?? 1, map.steps)}, with ${helpers.map((a) => NAME[a]).join(" and ")}. Set the route to "${ROUTE_OF[map.agent] ?? "none"}". The screening is not done while this step is ahead, so never say it is.`);
    if (map.facts.length) lines.push(`Still missing, and worth asking for: ${map.facts.map((f) => FACT_WORDS[f]).join(" and ")}.`);
    const question = smallQuestion(map.facts[0]);
    if (question) lines.push(question);
  } else if (map.next === "point to the WaterBots team") {
    lines.push(`The one next step: no funding path goes forward for now.${place === "free-site" ? " The box under the save button sends the project to the WaterBots team." : ""} Set the route to "none". Do not invite Bridget, Calvin or Violet.`);
  } else {
    lines.push(`Every step this project calls for is done.${endOffer(place)}`);
  }
  const closed = map.closed.filter((a) => ROUTE_OF[a]);
  if (closed.length) lines.push(`Not called for this project: ${closed.map((a) => NAME[a]).join(", ")}. Never route there. The calculator can be read about in the Agent Commons; it does not open there yet.`);
  if (map.noWaterCalculator) lines.push("Water benefits stay in play, and there is no calculator for this kind of project yet, so Violet is not a next step. The site shows whom to write to.");
  if (map.uncovered) lines.push("Calvin is not the next step here: his calculator does not count this kind of project yet.");
  if (map.transitioning) lines.push("This project already earns credits under the older carbon rules, so Calvin also shows the older calculator and what changes.");
  return lines.join("\n");
}

/**
 * The note he gets when a step has ended: which one, what comes next, and how to hand over. The same for every step and
 * every agent. `replying`: the visitor answered his question there.
 */
export function stepEndNote(at: Joined, map: MapNote | null, replying = false, place: Place = "free-site"): string {
  const { agent, step } = AT[at];
  const who = NAME[agent];
  const done = map ? partDone(at, map) : false;
  // Calvin and Violet share a step: one of them may be done while it is not.
  const stepDone = map?.done.includes(STEP_KEYS[step - 1]!) ?? false;
  const ended = stepDone || step < 3 ? stepWords(step, map?.steps) : `${who}'s part of ${stepWords(step, map?.steps)}`;
  const where = `# Where you are speaking\n\nYou have joined the visitor in ${who}'s chat. Never tell the visitor to come back to you.`;
  if (map && asksHomeUse(map) && done) {
    const helpers = helpersOf(map);
    const after = helpers.length
      ? `name ${stepWords(STEP_OF[helpers[0]!] ?? 2, map.steps)}, and what it helps them decide, introduce ${helpers.map((a) => NAME[a]).join(" and ")}, set the route to "${ROUTE_OF[helpers[0]!] ?? "none"}" and fill the introduction field for ${NAME[helpers[0]!]}`
      : place === "free-site"
        ? 'offer the screening report and "Save and sign up", with the route "none"'
        : 'say that every step is done, with the route "none"';
    return replying
      ? `${where} You asked whether people use the water at home, and this is their reply. If it answers, return it in context.homeUse, thank them by using it, then ${after}. If it does not, answer them and ask once more, with the route "none".`
      : `${where} Say that ${ended}, is done and, in a line, what came of it. Then ask one thing before the next step: whether people use the water at home (${HOME_USE_WHY}). Set the route to "none" and name no next step yet.`;
  }
  if (map && !done) {
    return `${where} ${stepWords(step, map.steps)}, is not done yet: they asked something ${who} does not cover. Answer it, then leave them with ${who}. Set the route to "none".`;
  }
  const says = `Say that ${ended}${ended.startsWith(who) ? " is done" : ", is done"} and, in a line, what came of it.`;
  if (!map || (map.next === "call" && map.agent)) {
    const helpers = map?.agents.length ? map.agents : map?.agent ? [map.agent] : [];
    const next = helpers.length
      ? `${STEP_OF[helpers[0]!] === step ? "Then say the same step goes on, and what it helps them decide." : `Then name ${stepWords(STEP_OF[helpers[0]!] ?? step + 1, map?.steps)}, and what it helps them decide.`} Then introduce ${helpers.map((a) => NAME[a]).join(" and ")} and what each does for them, the way you introduced Phoebe. Set the route to "${ROUTE_OF[helpers[0]!] ?? "none"}" and fill the introduction field for ${NAME[helpers[0]!]}.`
      : "Then name the next step and what it helps them decide, introduce who helps there, set the route and fill the introduction field.";
    return `${where} ${says} ${next} The site draws the button.`;
  }
  if (map.next === "point to the WaterBots team") {
    return `${where} ${says} No funding path goes forward for now, so say why and what would change it.${place === "free-site" ? ' The box under the save button sends the project to the WaterBots team. Offer the screening report and "Save and sign up". The site draws both.' : ""} Set the route to "none".`;
  }
  return `${where} ${says} No step is left. ${map.noWaterCalculator ? "Water benefits stay in play with no calculator for this kind of project yet; the site shows whom to write to. " : ""}${map.uncovered ? "Say why no calculator comes next: Calvin does not count this kind of project yet. " : ""}${endOffer(place).trim()}${endOffer(place) ? " " : ""}Set the route to "none".`;
}

/** The route a step's end has to carry: the map's next agent, whatever his field says. Null where the step is not done. */
export function stepEndRoute(at: Joined, map: MapNote): Route | null {
  if (!partDone(at, map)) return null;
  // Home use is asked first, and nobody is sent on until it is answered.
  if (asksHomeUse(map)) return "none";
  return map.next === "call" && map.agent ? (ROUTE_OF[map.agent] ?? "none") : "none";
}

/** Whether the part of the agent whose chat he has joined is done. Calvin and Violet share a step, so theirs is read apart. */
export function partDone(at: Joined, map: MapNote): boolean {
  const { agent, step } = AT[at];
  if (step < 3) return map.done.includes(STEP_KEYS[step - 1]!);
  return !(map.next !== "report or sign-up" && map.agents.includes(agent));
}

/** The route once home use is answered: the next agent the map named for after it. */
export function afterHomeUse(map: MapNote): Route {
  const [first] = helpersOf(map);
  return first ? (ROUTE_OF[first] ?? "none") : "none";
}

/** True when a reply says the whole screening, or every step, is done. Never said while a step is ahead. */
export function saysAllDone(reply: string): boolean {
  return /\b(?:every|all)\b(?:\s+\w+){0,3}\s+steps?\b[^.?!]{0,40}\b(?:done|finished|complete|completed)\b|\b(?:the|this|your|our)\s+(?:\w+\s+)?screening\b[^.?!]{0,25}\b(?:is|are|'s|’s)\s+(?:now\s+|all\s+)*(?:done|finished|complete|completed)\b|\b(?:that|this)(?:'s|’s| is) the end of (?:the|your) screening\b/i.test(
    reply,
  );
}

/** A route to an agent the map has closed is "none". A site acts on the field, so the guard is here. */
export function guardRoute(route: Route, map: MapNote): Route {
  const agent = (Object.keys(ROUTE_OF) as Agent[]).find((a) => ROUTE_OF[a] === route);
  return agent && map.closed.includes(agent) ? "none" : route;
}

/** The desk of an agent he may hand to. */
export function deskOf(agent: Exclude<Agent, "wellington">): Joined {
  return DESK_OF[agent];
}

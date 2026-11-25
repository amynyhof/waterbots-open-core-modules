/**
 * THE AGENT MAP (J4). One map, kept in the core. It reads the project record and the place the host names, and says
 * which agents are called, which method applies to each pathway, what to tell the visitor, and the one next step.
 * Wellington leads from it on both sites. It replaces one-off rules, such as Violet's "water always shows".
 *
 * It is worked out from facts: the same record and the same place always give the same answer. It reads no clock,
 * draws no chance and changes nothing it is handed. It does no sums. It gives codes, never words: each agent says
 * things in its own words.
 *
 * When a fact changes, the host runs the map again on the record as it stands. Nothing is kept from before.
 *
 * Design approved by the maintainer on 2026-11-22, with the lobby chat added.
 */
import type { StandardId } from "./standards.js";
import type { Door, Place } from "./places.js";
// The ".js" lets the built file load in plain Node, such as a host serving an agent's tool through MCP.
import { type AgentId, type ProjectFacts, type ProjectRecord, type Reading, AGENTS, emptyRecord, recordTechnology } from "./record.js";

/** The map's version. A record notes the version it was last mapped with. */
export const AGENT_MAP_VERSION = 1 as const;

/** The four funding pathways, the four standards `core` lists. */
export const PATHWAYS = ["carbon", "vwba", "wqba", "wash-ba"] as const satisfies readonly StandardId[];

// ── The method table ─────────────────────────────────────────────────────────────────────────────────────────────

export type MethodId = "carbon-v2.0" | "carbon-v1.0" | "carbon-transition" | "vwba-d3";

export interface MethodEntry {
  id: MethodId;
  pathway: StandardId;
  /** The calculator agent who runs it. */
  agent: AgentId;
  /** True when only a transitioning project (credited under V1.0) gets it. */
  transitioningOnly: boolean;
  what: string;
}

/** One entry for each carbon method (was V6 and M3), and the water method. */
export const METHODS: readonly MethodEntry[] = [
  {
    id: "carbon-v2.0",
    pathway: "carbon",
    agent: "calvin",
    transitioningOnly: false,
    what: "The carbon method, V2.0: Method 1 for a community water supply, Method 2 for household water treatment.",
  },
  {
    id: "carbon-v1.0",
    pathway: "carbon",
    agent: "calvin",
    transitioningOnly: true,
    what: "The legacy calculator: the carbon method, V1.0, for a project already credited under it.",
  },
  {
    id: "carbon-transition",
    pathway: "carbon",
    agent: "calvin",
    transitioningOnly: true,
    what: "The transition: how a project's credits move from V1.0 to V2.0.",
  },
  {
    id: "vwba-d3",
    pathway: "vwba",
    agent: "violet",
    transitioningOnly: false,
    what: "VWBA 2.0, D-3, the Volume Provided method.",
  },
];

/** The calculator agent for a pathway, or null when no agent covers it yet. */
export function calculatorAgent(pathway: StandardId): AgentId | null {
  return METHODS.find((m) => m.pathway === pathway)?.agent ?? null;
}

/** A transitioning project: already credited under the carbon method's V1.0. */
export function isTransitioning(facts: ProjectFacts): boolean {
  return facts.creditedUnderV1?.value === true;
}

/** The methods that apply to a pathway in play. A transitioning project also gets the legacy calculator. */
export function methodsFor(pathway: StandardId, transitioning: boolean): MethodId[] {
  return METHODS.filter((m) => m.pathway === pathway && (transitioning || !m.transitioningOnly)).map((m) => m.id);
}

// ── Facts that point to a pathway ────────────────────────────────────────────────────────────────────────────────
// Only the rules this repo can cite. Four more have no source yet (see `docs/proposals/shared-project-record.md`);
// none of them is guessed here. A pathway's reading always wins over these.

export interface FactRule {
  pathway: StandardId;
  applies: (facts: ProjectFacts) => boolean;
  source: string;
}

export const FACT_RULES: readonly FactRule[] = [
  {
    pathway: "vwba",
    applies: (facts) => recordTechnology({ facts }) === "CWS",
    source:
      "VWBA 2.0, Appendix C, Table C-1, p.39: a WASH activity that gives household or community water supply is " +
      "counted by the Volume Provided method, D-3.",
  },
  {
    pathway: "carbon",
    applies: (facts) => isTransitioning(facts),
    source: "The fact itself: the project already holds carbon credits under V1.0, as the person reports.",
  },
];

// ── The basic facts ──────────────────────────────────────────────────────────────────────────────────────────────

/** The facts Wellington gathers before the eligibility agent reads the pathways. */
export const BASIC_FACTS = ["technology", "country"] as const;
export type BasicFact = (typeof BASIC_FACTS)[number];

function missingBasicFacts(record: ProjectRecord): BasicFact[] {
  return BASIC_FACTS.filter((f) => (f === "technology" ? record.facts.technology === undefined : record.place.country === undefined));
}

// ── What the map gives back ──────────────────────────────────────────────────────────────────────────────────────

export interface MapInput {
  place: Place;
  /** The site's record. In the Agent Commons, the agent's temporary record, if it keeps one. Ignored in the lobby chat. */
  record?: ProjectRecord;
  /**
   * The pathways this site reads. The map asks only about these: a site that reads two never waits for a reading of
   * the other two. Left out, all four.
   */
  reads?: readonly StandardId[];
  /** Agent Commons and MCP: the agent the user opened. */
  opened?: AgentId;
  /** The agents the user has already met. */
  met?: readonly AgentId[];
  /** Paid site: the project is saved, so the user is familiar and nobody is introduced again. */
  saved?: boolean;
}

/** Why an agent is not called. */
export type NotCalled =
  | "not at this place"
  | "waiting for basic facts"
  | "every pathway has a reading"
  | "no pathway in play yet"
  | "pathway not in play yet"
  | "pathway unlikely"
  | "no pathway forward";

export type AgentCall = { agent: AgentId; called: true; introduce: boolean } | { agent: AgentId; called: false; because: NotCalled };

export interface PathwayPlan {
  pathway: StandardId;
  /** The eligibility reading, or null when there is none yet. */
  reading: Reading | null;
  inPlay: boolean;
  /** In play while some information is missing. */
  moreToLearn: boolean;
  /** What put the pathway in play, or kept it out. */
  because: "reading" | "project facts" | "no reading" | "opened by the user";
  /** The pathway's calculator agent, or null when none covers it yet. */
  agent: AgentId | null;
  /** The methods that apply. Empty when the pathway is not in play. */
  methods: MethodId[];
}

/** An unlikely pathway: what the visitor is told. The words come from the reading. */
export interface TellVisitor {
  pathway: StandardId;
  reason: string;
  wouldChange: string;
  /** The agent the visitor may still open in the Agent Commons. */
  inAgentCommons: AgentId | null;
}

export type NextStep =
  /**
   * Lobby chat: Wellington answers the visitor's questions as helpfully and truthfully as he can, from what he has
   * sources for. He points to one of `doors` only when that helps the visitor; he judges when.
   */
  | { step: "answer questions"; doors: Door[] }
  | { step: "choose an agent" }
  | { step: "work alone"; agent: AgentId }
  | { step: "gather facts"; facts: BasicFact[] }
  | { step: "call"; agent: AgentId }
  | { step: "point to the WaterBots team" }
  | { step: "report or sign-up" };

export interface AgentMap {
  mapVersion: typeof AGENT_MAP_VERSION;
  place: Place;
  /** Every agent, in the same order each time, called or not. */
  agents: AgentCall[];
  pathways: PathwayPlan[];
  tellVisitor: TellVisitor[];
  /** The one next step, for Wellington on the sites, or for the one agent working alone. */
  next: NextStep;
}

// ── The map ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The doors Wellington may point to from the lobby chat. */
const LOBBY_DOORS: Door[] = ["free-site", "paid-site", "agent-commons"];

/** Reads the record and the place, and says who is called, which method applies and what comes next. */
export function agentMap(input: MapInput): AgentMap {
  if (input.place === "lobby-chat") return lobbyChat(input);
  if (input.place === "agent-commons" || input.place === "mcp") return alone(input, input.place);
  return site(input, input.place);
}

function notHere(agent: AgentId): AgentCall {
  return { agent, called: false, because: "not at this place" };
}

/**
 * Lobby chat: only Wellington, no record, nothing calculated. He answers questions, and points to a door only when
 * that helps the visitor.
 */
function lobbyChat(input: MapInput): AgentMap {
  const met = input.met ?? [];
  return {
    mapVersion: AGENT_MAP_VERSION,
    place: "lobby-chat",
    agents: AGENTS.map((a) => (a === "wellington" ? { agent: a, called: true, introduce: !met.includes(a) } : notHere(a))),
    pathways: [],
    tellVisitor: [],
    next: { step: "answer questions", doors: [...LOBBY_DOORS] },
  };
}

/** Agent Commons and MCP: the one agent the user opened works alone. Nothing is hidden by a reading. */
function alone(input: MapInput, place: "agent-commons" | "mcp"): AgentMap {
  // There is no Wellington at MCP: the user's own AI calls one agent's tool.
  const opened = input.opened === "wellington" && place === "mcp" ? undefined : input.opened;
  const record = input.record ?? emptyRecord();
  const transitioning = isTransitioning(record.facts);
  const pathways: PathwayPlan[] = PATHWAYS.filter((p) => opened !== undefined && calculatorAgent(p) === opened).map((p) => {
    const reading = record.pathways[p]?.reading ?? null;
    return {
      pathway: p,
      reading,
      inPlay: true,
      moreToLearn: reading === "more to learn",
      because: "opened by the user",
      agent: opened ?? null,
      methods: methodsFor(p, transitioning),
    };
  });
  return {
    mapVersion: AGENT_MAP_VERSION,
    place,
    // In the Agent Commons an agent introduces itself; a tool called through MCP does not.
    agents: AGENTS.map((a) => (a === opened ? { agent: a, called: true, introduce: place === "agent-commons" } : notHere(a))),
    pathways,
    tellVisitor: [],
    next: opened === undefined ? { step: "choose an agent" } : { step: "work alone", agent: opened },
  };
}

/** Free site and Paid site: Wellington leads, and the facts say who else is called. */
function site(input: MapInput, place: "free-site" | "paid-site"): AgentMap {
  const record = input.record ?? emptyRecord();
  const met = input.met ?? [];
  const transitioning = isTransitioning(record.facts);
  const reads = PATHWAYS.filter((p) => input.reads === undefined || input.reads.includes(p));

  const pathways: PathwayPlan[] = reads.map((p) => {
    const agent = calculatorAgent(p);
    const read = record.pathways[p];
    if (read !== undefined) {
      const inPlay = read.reading !== "unlikely";
      return {
        pathway: p,
        reading: read.reading,
        inPlay,
        moreToLearn: read.reading === "more to learn",
        because: "reading",
        agent,
        methods: inPlay ? methodsFor(p, transitioning) : [],
      };
    }
    const pointed = FACT_RULES.some((r) => r.pathway === p && r.applies(record.facts));
    return {
      pathway: p,
      reading: null,
      inPlay: pointed,
      moreToLearn: pointed,
      because: pointed ? "project facts" : "no reading",
      agent,
      methods: pointed ? methodsFor(p, transitioning) : [],
    };
  });

  const missing = missingBasicFacts(record);
  const everyRead = reads.length > 0 && reads.every((p) => record.pathways[p] !== undefined);
  const anyInPlay = pathways.some((p) => p.inPlay);
  const noPathwayForward = everyRead && !anyInPlay;
  const introduce = (a: AgentId): boolean => !(place === "paid-site" && input.saved === true) && !met.includes(a);

  const call = (agent: AgentId): AgentCall => {
    const yes = (): AgentCall => ({ agent, called: true, introduce: introduce(agent) });
    const no = (because: NotCalled): AgentCall => ({ agent, called: false, because });
    if (agent === "wellington") return yes();
    if (agent === "phoebe") {
      if (missing.length > 0) return no("waiting for basic facts");
      return everyRead ? no("every pathway has a reading") : yes();
    }
    if (noPathwayForward) return no("no pathway forward");
    if (agent === "bridget") return anyInPlay ? yes() : no("no pathway in play yet");
    const own = pathways.filter((p) => p.agent === agent);
    if (own.some((p) => p.inPlay)) return yes();
    return own.some((p) => p.reading === "unlikely") ? no("pathway unlikely") : no("pathway not in play yet");
  };
  const agents = AGENTS.map(call);

  const tellVisitor: TellVisitor[] = reads.flatMap((p) => {
    const read = record.pathways[p];
    return read?.reading === "unlikely"
      ? [{ pathway: p, reason: read.reason, wouldChange: read.wouldChange, inAgentCommons: calculatorAgent(p) }]
      : [];
  });

  const isCalled = (a: AgentId): boolean => agents.some((c) => c.agent === a && c.called);
  const nextAgent = (["bridget", "calvin", "violet"] as const).find((a) => isCalled(a) && record.agents[a]?.done !== true);
  const next: NextStep =
    missing.length > 0
      ? { step: "gather facts", facts: missing }
      : isCalled("phoebe")
        ? { step: "call", agent: "phoebe" }
        : noPathwayForward
          ? { step: "point to the WaterBots team" }
          : nextAgent !== undefined
            ? { step: "call", agent: nextAgent }
            : { step: "report or sign-up" };

  return { mapVersion: AGENT_MAP_VERSION, place, agents, pathways, tellVisitor, next };
}

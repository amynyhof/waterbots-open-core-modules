/**
 * THE AGENT COMMONS READER (F4.3; shared console page, family 4, rule 15). The Commons lists the agents a site has
 * really installed, from each package's own card, and each one opens there. A seat on the crew list with no installed
 * package is "coming" (agent rule 16): it is listed, and never shown as if it works.
 *
 * Name, role word and job come from the crew list (`roster.yaml`); the colour from `AGENT_COLOURS`; the version and the
 * places it works from the package's card. No package is graded yet, so every card says so (rule 15).
 *
 * Whether a door is "built" waits on the maintainer (one source: the crew list or the status sheet). Until then the
 * Commons goes by what is installed.
 */
import { AGENT_COLOURS, type AgentColour } from "./agentColours.js";
import { CREW, type CrewSeat } from "./crew.js";
import type { Place } from "./places.js";
import { AGENTS, type AgentId } from "./record.js";

/** What an agent package says about itself: its id, its exact version, and the places it works. */
export interface AgentCard {
  id: AgentId;
  /** The package's own version, the same as its `package.json`. */
  version: string;
  /** The places its chat or screen runs. */
  places: readonly Place[];
  /** True when the package ships a screen a site mounts. */
  screen: boolean;
}

/** The Commons' words. */
export const COMMONS_WORDS = {
  notGraded: "Not yet graded",
  coming: "Coming",
  opens: "Open",
} as const;

/** One agent as the Commons shows it. */
export interface CommonsAgent {
  id: string;
  name: string;
  /** The role word, the crew list's seat. */
  role: string;
  job: string;
  helpsWith: readonly string[];
  /** Null while the maintainer has not ruled the colour; the site's current colour stands. */
  colour: AgentColour | null;
  /** The installed package's version, or null when none is installed. */
  version: string | null;
  /** "installed": its package is installed and it opens in the Commons. "coming": not built yet. */
  status: "installed" | "coming";
  /** True when it opens in the Commons. */
  opens: boolean;
  /** The trust card's grade. No grades exist yet. */
  grade: typeof COMMONS_WORDS.notGraded;
}

const isAgent = (id: string): id is AgentId => (AGENTS as readonly string[]).includes(id);

/**
 * The Commons' list: every installed agent first, in the crew list's order, then every other seat as "coming". A card
 * for an id the crew list does not hold is left out. A card given twice counts once.
 */
export function commonsAgents(installed: readonly AgentCard[]): CommonsAgent[] {
  const cards = new Map<string, AgentCard>();
  for (const c of installed) if (!cards.has(c.id)) cards.set(c.id, c);
  const entry = (seat: CrewSeat): CommonsAgent => {
    const card = cards.get(seat.id);
    const opens = card !== undefined && card.places.includes("agent-commons");
    return {
      id: seat.id,
      name: seat.name,
      role: seat.seat,
      job: seat.job,
      helpsWith: seat.helpsWith,
      colour: isAgent(seat.id) ? AGENT_COLOURS[seat.id] : null,
      version: card?.version ?? null,
      status: card !== undefined ? "installed" : "coming",
      opens,
      grade: COMMONS_WORDS.notGraded,
    };
  };
  const all = CREW.map(entry);
  return [...all.filter((a) => a.status === "installed"), ...all.filter((a) => a.status === "coming")];
}

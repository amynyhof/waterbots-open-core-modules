/**
 * WHERE AN AGENT IS WORKING: the four doors of agent rule 21, and the lobby chat, which is not a door.
 *
 * The host names the place and hands it to every agent beside the project record. A place is where the agent is
 * working, never a fact about the project, so it is not stored in the record.
 *
 * - Free site: the record is what Wellington and the other agents have gathered in this visit.
 * - Paid site: the record is the Project Record page.
 * - Agent Commons: no project record and no memory. The agent asks for each fact it needs.
 * - MCP: the user's own AI calls the agent's tool. No project record; the user confirms each fact.
 * - Lobby chat: Wellington's open chat on the paid site's front page. No record, and nothing is calculated. He
 *   answers questions from what he has sources for, and points the visitor to a door when that helps.
 */

/** The four doors (agent rule 21). */
export const DOORS = ["free-site", "paid-site", "agent-commons", "mcp"] as const;
export type Door = (typeof DOORS)[number];

/** The lobby chat. Not a door. */
export const LOBBY_CHAT = "lobby-chat" as const;

/** Every place a host can name: the four doors and the lobby chat. */
export type Place = Door | typeof LOBBY_CHAT;
export const PLACES: readonly Place[] = [...DOORS, LOBBY_CHAT];

/** True for the four doors, false for the lobby chat. */
export function isDoor(place: Place): place is Door {
  return (DOORS as readonly string[]).includes(place);
}

/** True where the host keeps a project record: the two sites. */
export function hasProjectRecord(place: Place): boolean {
  return place === "free-site" || place === "paid-site";
}

// ── What a door means, as facts (2026-11-26) ─────────────────────────────────────────────────────────────────────

/** A value the site passes, which the agent reads instead of the package's own. */
export interface SiteValue {
  /** The same key as the package's own value, such as "operationalDays". */
  key: string;
  label: string;
  /** The value as the screen shows it. */
  shown: string;
  /** Where the site's value comes from. */
  source: string;
}

/**
 * The plain facts of a door, which the site passes beside the place. The agent uses its own words for them: nothing here
 * is a line to say. Where a site passes none, the agent is told not to say what it does not know.
 */
export interface DoorFacts {
  /** The project is saved to the person's own account. */
  savedProject: boolean;
  /** When a change the person makes is kept: only when they press Save, at once, or not at all. */
  changesKept: "on save" | "at once" | "never";
  /** The site has a Project Record page the agent may point to. */
  recordPage: boolean;
  /** Values the site passes, which the agent reads instead of the package's own. */
  siteValues?: readonly SiteValue[];
}

/** The facts the package knows itself: the two places with no project record and no save. */
export const DOOR_FACTS: Partial<Record<Place, DoorFacts>> = {
  "agent-commons": { savedProject: false, changesKept: "never", recordPage: false },
  mcp: { savedProject: false, changesKept: "never", recordPage: false },
};

/** A door's facts: the site's, or the package's own for a place with no record. Null when nobody has said. */
export function doorFacts(place: Place, given?: DoorFacts): DoorFacts | null {
  return given ?? DOOR_FACTS[place] ?? null;
}

/** A door's facts as lines an agent reads: facts and instructions, never lines to say. */
export function doorFactLines(place: Place, given?: DoorFacts): string[] {
  if (place === LOBBY_CHAT) return [];
  const f = doorFacts(place, given);
  if (f === null) return ["The site has not said when a change is kept, or whether it has a Project Record page. Say neither."];
  const out = [
    f.savedProject ? "The project is saved to the person's own account." : "The project is not saved.",
    {
      "on save": "A change the person makes is kept only when they press Save. Until then it shows on the screen, and any figure shows before Save.",
      "at once": "A change the person makes is kept at once.",
      never: "Nothing here is kept after the visit.",
    }[f.changesKept],
    f.recordPage
      ? "This site has a Project Record page, where the person sees and changes the project's facts."
      : "This site has no Project Record page. Never point the person to one: they give each fact here.",
  ];
  if (f.siteValues !== undefined && f.siteValues.length > 0) {
    out.push("This site passes its own values. Read these instead of the package's own:", ...f.siteValues.map((v) => `  - ${v.label}: ${v.shown} (${v.source}).`));
  }
  return out;
}

/** A door's facts as a block for a turn, under its own heading. Null in the lobby chat. */
export function doorBlock(place: Place, given?: DoorFacts, heading = "# This door"): string | null {
  const lines = doorFactLines(place, given);
  return lines.length === 0 ? null : [heading, "", ...lines.map((l) => (l.startsWith("  - ") ? l : `- ${l}`))].join("\n");
}

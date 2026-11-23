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
 * - Lobby chat: Wellington's open chat on the paid site's front page. No record, nothing is calculated, and he
 *   points the visitor to a door.
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

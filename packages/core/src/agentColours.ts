/**
 * THE AGENTS' COLOURS: one list, read by every screen core ships and by both sites (shared console page, family 4,
 * rule 7). Each agent has one name, one role word and one colour, the same everywhere.
 *
 * Calvin is Reef and Violet is Orchid (the maintainer). Wellington, Phoebe and Bridget keep the colours the sites give
 * them today until the maintainer rules; here they are `null`, and a site uses its own current colour for them.
 *
 * A screen sets `--agent` from this list on its own root (`agentStyle`), so the colour is right on both sites, with or
 * without `@waterbots/core/base.css`.
 */
import type { AgentId } from "./record.js";

export interface AgentColour {
  /** The colour's name, as the maintainer named it. */
  name: string;
  /** Its value, as a six-digit hex colour. */
  hex: `#${string}`;
}

export const AGENT_COLOURS: Readonly<Record<AgentId, AgentColour | null>> = {
  wellington: null,
  phoebe: null,
  bridget: null,
  calvin: { name: "Reef", hex: "#0E8A94" },
  violet: { name: "Orchid", hex: "#A457D4" },
};

/** The agent's colour, or null while the maintainer has not ruled it (the site's current colour stands). */
export function agentColour(id: AgentId): AgentColour | null {
  return AGENT_COLOURS[id];
}

/**
 * The style that sets `--agent` to the agent's colour, for the root of that agent's screen. Empty while the colour is
 * not ruled, so the site's own `--agent` stands. A React screen passes it as its root's `style`.
 */
export function agentStyle(id: AgentId): Readonly<Record<string, string>> {
  const c = AGENT_COLOURS[id];
  return c === null ? {} : { "--agent": c.hex };
}

// Violet's card for the Agent Commons (family 4, F4.3): what this package says about itself, so the
// Commons lists the agents a site really installed. Core's `commonsAgents` reads it. `VERSION` is this package's own
// version; a test keeps it the same as `package.json` and `config.yaml`.
// The places: her chat and her screen run at all four doors.
import type { AgentCard } from "@waterbots/core/commons";

export const VERSION = "0.10.0";

export const AGENT_CARD: AgentCard = {
  id: "violet",
  version: VERSION,
  places: ["free-site", "paid-site", "agent-commons", "mcp"],
  screen: true,
};

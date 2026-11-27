// Phoebe's card for the Agent Commons (family 4, F4.3): what this package says about itself, so the
// Commons lists the agents a site really installed. Core's `commonsAgents` reads it. `VERSION` is this package's own
// version; a test keeps it the same as `package.json` and `config.yaml`.
// The places: she has a block for each of the four doors, and her worksheet is a screen.
import type { AgentCard } from "@waterbots/core/commons";

export const VERSION = "0.3.0";

export const AGENT_CARD: AgentCard = {
  id: "phoebe",
  version: VERSION,
  places: ["free-site", "paid-site", "agent-commons", "mcp"],
  screen: true,
};

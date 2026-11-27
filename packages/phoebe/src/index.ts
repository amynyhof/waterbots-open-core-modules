/**
 * @waterbots/phoebe — the eligibility and feasibility agent (J5). What she is told, the shape of her answer, the checks
 * on that answer, and her tool: the eligibility worksheet, how a reading is worked out, and her cards. Her Tool tab is in
 * `@waterbots/phoebe/screen`. The site keeps the call to the model and its key, the limits, streaming, the buttons and
 * chips on screen, and saving.
 */
export const moduleName = "phoebe" as const;
// Its card for the Agent Commons (family 4): its own version and the places it works.
export { AGENT_CARD, VERSION } from "./card.js";

export * from "./instructions.js";
export * from "./turn.js";
export * from "./worksheet.js";
export * from "./reading.js";
export * from "./evidence.js";
export * from "./stream.js";
export * from "./words.js";
export {
  APPROVED_ON,
  CARBON_APPLIES,
  CARBON_ELIGIBILITY,
  CARBON_ELIGIBILITY_PARTS,
  CARBON_PACK,
  CARBON_ROUTES,
  CONSIDERATIONS,
  CONSIDERATION_GROUPS,
  CRITERIA,
  WATER_APPLIES,
  WATER_PACK,
  WATER_ROUTES,
  cardFor,
  routeFor,
  type AppliesCard,
  type CarbonCard,
  type Consideration,
  type Criterion,
  type Fixable,
  type PackInfo,
  type Phase,
  type RouteCard,
  type RowCard,
} from "./cards.js";
export type { Citation } from "./citation.js";
export {
  HER_PACKS,
  PATHWAY_STATE_IDS,
  READINESS_IDS,
  ROW_STATE_IDS,
  TOOL,
  TOOL_SECTIONS,
  askedRows,
  canBlock,
  isPathwayRow,
  pathwayRows,
  routesOf,
  rowsFor,
  section,
  shownGroups,
  verdictRows,
  type ToolRow,
  type ToolSection,
  type ToolWord,
} from "./generated/worksheet.generated.js";

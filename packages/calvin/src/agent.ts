// The agent entry: `@waterbots/calvin/agent`. Added by this repo, not part of the seed.
//
// What a host needs to run Calvin as an agent, at any of the four doors, with no React: his tools, the way he reads
// and writes the shared project record, his two choices in the Agent Commons, and what he can see of his screen.
// Re-exports only; this file computes nothing. The build bundles it into one file, `dist/agent.js`.
// `@waterbots/core` stays outside the bundle: the site installs it, and there is only ever one copy.
export { computeScenarioTool, transitionWaterfallTool, GS4GG_CARBON_TOOLS, GS4GG_CALCULATOR_VERSION } from "./modules/calvin/agent/tools.js";
export {
  CALVIN_NEEDS,
  addCalvinFacts,
  addCalvinResults,
  calvinGivenFacts,
  calvinNeeds,
  calvinProjectFromRecord,
  calvinRecordProblems,
} from "./modules/calvin/agent/record.js";
export { CALVIN_COMMONS_CHOICES, commonsChoiceFacts, showsCommonsChoices } from "./modules/calvin/agent/commons.js";
export type { CommonsChoice, CommonsChoiceId } from "./modules/calvin/agent/commons.js";
export { calculatorPageContext } from "./modules/calvin/agent/pageContext.js";
export { calvinAgentNoteLines, calvinNoteFacts, calvinNoteText } from "./modules/calvin/agent/exportNotes.js";
export type { PageContextInput } from "./modules/calvin/agent/pageContext.js";
export type { CalvinProject } from "./modules/calvin/screen/state.js";
export type { SavedAnalysis } from "./modules/calvin/screen/analysis.js";

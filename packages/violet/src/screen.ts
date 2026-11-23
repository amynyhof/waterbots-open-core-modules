// The screen entry: `@waterbots/violet/screen`. Needs React. A site mounts Violet's D-3 screen from here.
export { default as D3Screen, followRecord, missingPopulationFacts, recordPopulation, seedD3Input, type D3ScreenProps } from "./screen/D3Screen.js";
export { SCREEN_WORDS } from "./screen/D3Screen.js";
export { default as D3Report, REPORT_WORDS, type D3ReportProps } from "./screen/D3Report.js";
export { violetAgentNoteLines } from "./exportNotes.js";

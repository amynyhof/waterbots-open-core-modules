import testCases from "../../../expected-outputs.json" with { type: "json" };

/**
 * HOW MANY MADE-UP TEST CASES EVERY BUILD CHECKS (ruling 2026-10-31). Read from the committed test-case
 * file, never typed, so the report cannot state a count the file does not hold. `prove-expected-outputs.test.ts`
 * re-runs every one of them on every build.
 */
export const TEST_CASE_COUNT = testCases.cases.length + testCases.fnrbCases.length;

/**
 * HOW MANY OF THEM ARE GOLD STANDARD'S OFFICIAL V1.0 CALCULATOR OUTPUT, UNCHANGED. Read from each case's
 * `workedOut` tag, never typed. A case that began as the calculator's output and was later recalculated by this
 * engine does not count.
 */
export const OFFICIAL_CALCULATOR_COUNT = [...testCases.cases, ...testCases.fnrbCases].filter(
  (c) => c.workedOut === "v1-official-calculator",
).length;

/** The report's sentence on how the calculator is checked. Its wording is pinned by a test. */
export function buildCheckSentence(count: number = TEST_CASE_COUNT, official: number = OFFICIAL_CALCULATOR_COUNT): string {
  return `Every build checks it against ${count} made-up test cases. ${official} of them match Gold Standard’s official V1.0 calculator on made-up inputs.`;
}

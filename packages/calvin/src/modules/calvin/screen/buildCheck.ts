import testCases from "../../../expected-outputs.json" with { type: "json" };

/**
 * HOW MANY MADE-UP TEST CASES EVERY BUILD CHECKS (ruling 2026-10-31). Read from the committed test-case
 * file, never typed, so the report cannot state a count the file does not hold. `prove-expected-outputs.test.ts`
 * re-runs every one of them on every build.
 */
export const TEST_CASE_COUNT = testCases.cases.length + testCases.fnrbCases.length;

/** The report's sentence on how the calculator is checked. Its wording is pinned by a test. */
export function buildCheckSentence(count: number = TEST_CASE_COUNT): string {
  return `Every build checks it against ${count} made-up test cases, including results from Gold Standard’s official V1.0 tools on made-up inputs.`;
}

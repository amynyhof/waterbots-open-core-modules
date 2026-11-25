// The one technology label list (W3).
import { expect, test } from "vitest";
import { agentMap } from "./agentMap";
import { addGivenFacts, emptyRecord, recordTechnology } from "./record";
import { NO_CALCULATOR_YET, SAVED_WATER_FIGURE_STAYS, TECHNOLOGY_CLASSES, TECHNOLOGY_LABELS, notCoveredYet, technologyCode, technologyCoverage, technologyOfClass } from "./technologyLabels";

// SWITCHED OFF 2026-11-24, never deleted: the maintainer ruled on 2026-11-23 that community level treatment is not
// counted until the experts answer. The tests after it hold the new rule.
test.skip("the site walk's label is read as a community water supply, not as other (W3)", () => {
  expect(technologyCode("Community level water treatment technologies")).toBe("CWS");
});

test("upper or lower case and extra spaces do not matter", () => {
  expect(technologyCode("  household   WATER treatment ")).toBe("HWT");
});

test("a label the list does not know gets no code, never a guessed one", () => {
  expect(technologyCode("A label nobody has sent yet")).toBeUndefined();
});

test("each label appears once, and says why it gets its code", () => {
  const labels = TECHNOLOGY_LABELS.map((t) => t.label.toLowerCase());
  expect(new Set(labels).size).toBe(labels.length);
  for (const t of TECHNOLOGY_LABELS) expect(t.why.length).toBeGreaterThan(0);
});

// ── Not covered yet (ruled 2026-11-23) ──
const WAITING = ["Community level water treatment technologies", "Institutional water treatment technologies", "New or alternative water supply"];

test.each(WAITING)("%s gets no technology code, and is not covered yet", (label) => {
  expect(technologyCode(label)).toBeUndefined();
  expect(technologyCoverage(label)).toBe("not covered yet");
  expect(notCoveredYet(label)).toBe(`“${label}” is not covered yet.`);
});

test("a label with a code is covered, and one the list does not know is neither", () => {
  expect(technologyCoverage("Community water supply technologies")).toBe("covered");
  expect(technologyCoverage("A label nobody has sent yet")).toBe("not known");
});

test("the maintainer's words for a project no calculator covers, and for a saved treatment project", () => {
  expect(NO_CALCULATOR_YET).toBe("We do not have a calculator for this kind of project yet. To ask for it to be added, contact WaterBots at hello@waterbots.ai.");
  expect(SAVED_WATER_FIGURE_STAYS).toBe("Your saved water figure stays on your record. We do not have a calculator for this kind of project yet. To ask for it to be added, contact WaterBots at hello@waterbots.ai.");
});

test("the open site's four class names, word for word, each with its class", () => {
  expect(TECHNOLOGY_CLASSES.map((c) => [c, technologyOfClass(c).label, technologyOfClass(c).code ?? null])).toEqual([
    ["HWT", "Household water treatment technologies", "HWT"],
    ["IWT", "Institutional water treatment technologies", null],
    ["CWT", "Community level water treatment technologies", null],
    ["CWS", "Community water supply technologies", "CWS"],
  ]);
});

// SWITCHED OFF 2026-11-24, never deleted: it expects a new or alternative water supply to stay out of the water pathway.
// The maintainer ruled on 2026-11-24 that it is covered there. The test after it, and `waterSupply.test.ts`, hold the rule.
test.skip.each(WAITING)("%s: a code handed in, or saved before this rule, is not used", (label) => {
  const { record } = addGivenFacts(emptyRecord(), "wellington", { technology: { label, code: "CWS" } });
  expect(record.facts.technology).toEqual({ label, source: { by: "person", note: "given to wellington" } });
  const saved = emptyRecord();
  saved.facts.technology = { label, code: "CWS", source: { by: "site intake", note: "made up" } };
  expect(recordTechnology(saved)).toBeUndefined();
  // So the saved code no longer points the project to the water pathway.
  expect(agentMap({ place: "free-site", record: saved }).pathways.every((p) => !p.inPlay)).toBe(true);
});

test.each(WAITING)("%s: a code handed in, or saved before the rule, is still not used (2026-11-24)", (label) => {
  const { record } = addGivenFacts(emptyRecord(), "wellington", { technology: { label, code: "CWS" } });
  expect(record.facts.technology).toEqual({ label, source: { by: "person", note: "given to wellington" } });
  const saved = emptyRecord();
  saved.facts.technology = { label, code: "CWS", source: { by: "site intake", note: "made up" } };
  expect(recordTechnology(saved)).toBeUndefined();
  // The code points the project to no pathway. `waterSupply.test.ts` holds what the label says about water.
  expect(agentMap({ place: "free-site", record: saved }).pathways.every((p) => !p.inPlay)).toBe(true);
});

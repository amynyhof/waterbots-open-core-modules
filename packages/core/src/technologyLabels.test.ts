// The one technology label list (W3).
import { expect, test } from "vitest";
import { TECHNOLOGY_LABELS, technologyCode } from "./technologyLabels";

test("the site walk's label is read as a community water supply, not as other (W3)", () => {
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

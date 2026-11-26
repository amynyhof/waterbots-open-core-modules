import { describe, expect, test } from "vitest";
import { CLASS_WORDS, PROJECT_TYPE_WORDS, STAGE_WORDS, classWords, stageWords, typeWords } from "./projectWords";
import { PROJECT_STAGES, PROJECT_TYPE_IDS } from "./record";
import { TECHNOLOGY_CLASSES } from "./technologyLabels";

describe("the words for a project's type and stage, one copy", () => {
  test("the ids are the record's, in its order, each with a name and one plain sentence", () => {
    expect(PROJECT_TYPE_WORDS.map((t) => t.id)).toEqual([...PROJECT_TYPE_IDS]);
    expect(STAGE_WORDS.map((s) => s.id)).toEqual([...PROJECT_STAGES]);
    expect(CLASS_WORDS.map((c) => c.id)).toEqual([...TECHNOLOGY_CLASSES]);
    for (const t of [...PROJECT_TYPE_WORDS, ...CLASS_WORDS]) expect([t.name !== "", t.plain !== ""]).toEqual([true, true]);
  });
  test("no type asks for a class", () => {
    expect(PROJECT_TYPE_WORDS.map((t) => t.plain).join("\n")).not.toMatch(/class/);
  });
  test("each look-up finds its words, and an unknown id finds none", () => {
    expect(typeWords("C-19")?.name).toBe("Access to potable water supply");
    expect(classWords("HWT")?.name).toBe("Household water treatment technologies");
    expect(stageWords("paper")?.words).toBe("on paper");
    expect([typeWords("HWT"), classWords("C-19"), stageWords("planned")]).toEqual([undefined, undefined, undefined]);
  });
});

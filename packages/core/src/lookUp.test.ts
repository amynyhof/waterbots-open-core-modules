// The look-up fix and the answer chips, with the open site's own made-up cases (scripts/check-phoebe.mjs, commit 0f16957).
import { describe, expect, test } from "vitest";
import { ANSWERS_SCHEMA, MAX_CHIPS, MAX_CHIP_CHARS, answersFrom, readChips } from "./chips";
import { FINISH_NOTE, FINISH_RULE, leavesWaiting, showable, waitingFrom } from "./lookUp";

const waits = [
  "Let me pull up the detail on how funding affects the carbon side before I answer that properly.",
  "Good question. I’ll check the cards on that.",
  "I'm fetching the carbon rules now.",
  "Let me look into that for you. One moment.",
  "I will get back to you on that.",
];
const answers = [
  "Having the money in hand does not by itself close the carbon side. Could the borehole go ahead without it?",
  "Let me check one thing: is the borehole new?",
  "Let me look at that with you. Having the money in hand does not by itself close carbon credits, because the rule asks more.",
  "Wellington will join you here with the next step.",
  "I'll introduce you to Phoebe, who can check which funding might suit your project.",
  "I'll get you to Bridget next, and she will find your river basin on the map.",
  "I will ask about one thing at a time. When did it start running?",
];

describe("an answer comes in the same turn", () => {
  test("a reply that ends by promising a look-up is not an answer, and a real answer is one", () => {
    expect(waits.filter((w) => !leavesWaiting(w))).toEqual([]);
    expect(answers.filter(leavesWaiting)).toEqual([]);
    expect(waitingFrom(answers[0]!)).toBe(-1);
  });
  test("while a reply is written, a promise is held back until an answer follows it", () => {
    for (const w of waits) {
      for (let i = 0; i < w.length; i += 1) {
        const s = showable(w.slice(0, i + 1));
        expect(leavesWaiting(s)).toBe(false);
        expect(s).not.toMatch(/pull|check|fetch|look|get back/i);
      }
    }
    for (const a of answers) expect(showable(a)).toBe(a);
    expect(showable("Good question. Let me")).toBe("Good question.");
  });
  test("the rule and the note say never to come back later", () => {
    for (const words of [FINISH_RULE, FINISH_NOTE]) expect(words).toMatch(/never say you will look something up, check or come back/);
  });
});

describe("chips answer the question just asked", () => {
  test("none where nothing was asked, no number the reply did not say, no question, three at most", () => {
    expect(readChips(["Yes.", "Not yet", "yes", "I’m not sure", "Maybe"], "Is it built?")).toEqual(["Yes", "Not yet", "I’m not sure"]);
    expect(readChips(["Yes"], "Thank you for that.")).toEqual([]);
    expect(readChips(["1,600 people", "2,000 people", "Why?"], "Is it 1,600 people or households?")).toEqual(["1,600 people"]);
    expect(readChips(["A chip that is far too long to be a few words on one line"], "Is it built?")).toEqual([]);
    expect(readChips("Yes", "Is it built?")).toEqual([]);
  });
  test("the second check where they are shown", () => {
    expect(answersFrom(["Yes", "", 3, "x".repeat(MAX_CHIP_CHARS + 1), "No", "Maybe", "Later"])).toEqual(["Yes", "No", "Maybe"]);
    expect(answersFrom("Yes")).toEqual([]);
    expect(MAX_CHIPS).toBe(3);
    expect(ANSWERS_SCHEMA.items.type).toBe("string");
  });
});

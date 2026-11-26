import { describe, expect, test } from "vitest";
import * as guard from "./factGuard.js";
import { checkAnswerFacts, factFields, factsReturnedToAgent, readAsking, readHeard, type AnswerFact } from "./factGuard.js";
import { carbonAnswerFor, readKindFacts } from "./projectKinds.js";

// Made-up chats. No real project is named.

const source: AnswerFact = { key: "waterSource", name: "The source of the water", value: "existing" };
const piped: AnswerFact = { key: "publicPiped", name: "Public piped water", value: false, onlyAsAnswer: true };
const home: AnswerFact = { key: "homeUse", name: "Used at home", value: "yes", onlyAsAnswer: true };
const unsafe: AnswerFact = { key: "pipedShownUnsafe", name: "Piped water shown unsafe", value: false, onlyAsAnswer: true };

describe("a fact is filled only when the person gave it", () => {
  test("the river case: the source is kept, and the three facts nobody said are refused", () => {
    const check = checkAnswerFacts([source, piped, home, unsafe], {
      messages: ["We want to treat the river water. People already use the river water."],
      asked: "waterSource",
      asking: "publicPiped",
      heard: [
        { fact: "waterSource", words: "People already use the river water" },
        { fact: "publicPiped", words: "the river water" },
        { fact: "homeUse", words: "people already use" },
      ],
    });
    expect(check.kept).toEqual(["waterSource"]);
    expect(check.refused.map((r) => [r.fact.key, r.why])).toEqual([
      ["publicPiped", "asked in this reply"],
      ["homeUse", "not the question just asked"],
      ["pipedShownUnsafe", "not the question just asked"],
    ]);
  });

  test("with the refused facts left blank, no carbon figure rests on them", () => {
    const kept = readKindFacts({ waterSource: "existing", treatment: "central" });
    expect(carbonAnswerFor(kept)).toEqual({ says: "ask", fact: "publicPiped" });
    expect(carbonAnswerFor({ ...kept, publicPiped: false }).says).not.toBe("ask");
  });

  test("a yes or no is taken as the answer to the question just asked about it", () => {
    const check = checkAnswerFacts([piped], { messages: ["It comes from the river.", "No, nobody pipes it."], asked: "publicPiped", asking: "none" });
    expect(check.kept).toEqual(["publicPiped"]);
  });

  test("the same question again, while filling it, is refused", () => {
    const check = checkAnswerFacts([piped], { messages: ["Hmm, it is the river."], asked: "publicPiped", asking: "publicPiped" });
    expect(check.refused[0]?.why).toBe("asked in this reply");
  });

  test("a question back, or not sure, is not an answer", () => {
    expect(checkAnswerFacts([piped], { messages: ["What does piped mean?"], asked: "publicPiped" }).refused[0]?.why).toBe("not an answer");
    expect(checkAnswerFacts([piped], { messages: ["I'm not sure, to be honest."], asked: "publicPiped" }).refused[0]?.why).toBe("not sure");
    expect(checkAnswerFacts([{ ...home, value: "not sure" }], { messages: ["Not sure yet."], asked: "homeUse" }).kept).toEqual(["homeUse"]);
  });

  test("words handed for the answer must be in the last message", () => {
    const check = checkAnswerFacts([piped], { messages: ["Yes it is."], asked: "publicPiped", heard: [{ fact: "publicPiped", words: "it is not piped" }] });
    expect(check.refused[0]?.why).toBe("not in the visitor's words");
  });

  test("a source or treatment the visitor said on their own is kept with their words, and refused without", () => {
    const messages = ["We are drilling a new borehole near the school."];
    const fresh: AnswerFact = { key: "waterSource", name: "The source of the water", value: "new" };
    expect(checkAnswerFacts([fresh], { messages, heard: [{ fact: "waterSource", words: "drilling a new borehole" }] }).kept).toEqual(["waterSource"]);
    expect(checkAnswerFacts([fresh], { messages }).refused[0]?.why).toBe("not in the visitor's words");
    expect(checkAnswerFacts([fresh], { messages, heard: [{ fact: "waterSource", words: "a brand new well" }] }).refused[0]?.why).toBe("not in the visitor's words");
  });

  test("the agent's own words and a turn no visitor typed are never the visitor's", () => {
    const check = checkAnswerFacts([source], { messages: ["(The visitor opened Calvin's chat.)"], heard: [{ fact: "waterSource", words: "The visitor opened" }] });
    expect(check.refused).toHaveLength(1);
  });

  test("a fact the record already holds changes nothing, and is no fault", () => {
    const check = checkAnswerFacts([{ ...piped, held: false }], { messages: ["Hello"], asking: "publicPiped" });
    expect(check).toEqual({ kept: [], held: ["publicPiped"], refused: [] });
  });

  test("matching ignores case, accents and marks", () => {
    const check = checkAnswerFacts([{ key: "country", name: "Country", value: "PER" }], { messages: ["It's in Perú!"], heard: [{ fact: "country", words: "peru" }] });
    expect(check.kept).toEqual(["country"]);
  });

  test("what goes back to the agent names each fact as still blank, and why; the visitor is told nothing", () => {
    const { refused } = checkAnswerFacts([piped, home], { messages: ["The river."], asking: "publicPiped" });
    expect(factsReturnedToAgent(refused)).toMatch(/^Still blank, because the visitor has not given them: Public piped water \(you are asking for it in this same reply\); Used at home/);
    // A refused fill is dropped quietly (the maintainer, 2026-11-26): there is no line for the visitor.
    expect(Object.keys(guard)).not.toContain("factsTakenOut");
    expect(factsReturnedToAgent([])).toBeNull();
  });

  test("the answer's two fields are read against the agent's own keys", () => {
    expect(readAsking("publicPiped", ["publicPiped"])).toBe("publicPiped");
    expect(readAsking("anything", ["publicPiped"])).toBeUndefined();
    expect(readHeard([{ fact: "waterSource", words: " the river " }, { fact: "other", words: "x" }, { fact: "waterSource", words: "" }], ["waterSource"])).toEqual([{ fact: "waterSource", words: "the river" }]);
    expect(Object.keys(factFields(["waterSource"]))).toEqual(["asking", "heard"]);
  });
});

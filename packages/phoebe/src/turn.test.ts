// One of Phoebe's turns, her worksheet and her readings. Every project here is made up.
import { leavesWaiting, showable } from "@waterbots/core/lookUp";
import { addGivenFacts, emptyRecord, newProjectRecord, readEligibilitySheet, type ProjectRecord } from "@waterbots/core/record";
import { FINISH_NOTE } from "@waterbots/core/lookUp";
import { describe, expect, test } from "vitest";
import { evidenceFor } from "./evidence";
import { CARD_SETS } from "./instructions";
import { addPhoebeResults, classFor, creditedUnderV1, pathwayReading } from "./reading";
import { needCardsSoFar, replySoFar } from "./stream";
import { OPENED_TURN, RECORD_HEADING, WORKSHEET_HEADING, openedAnswer, phoebeDoorBlock, phoebeTurn, readPhoebeAnswer, recordBlock } from "./turn";
import { PHOEBE_REPLY_LIMIT, cardWordsIn, isLongPhoebeReply } from "./words";
import { EMPTY_SHEET, applyUpdates, nothingLeftToAsk, onePathDone, phoebeDone, sheetFromRecord, withSheet, worksheetCaption, type Sheet } from "./worksheet";

const W = "vwba-2.0";
const C = "gs-paa-v2.0";
const record = (given: Parameters<typeof addGivenFacts>[2] = {}): ProjectRecord => addGivenFacts(newProjectRecord(), "wellington", given).record;
const BOREHOLE = record({ does: "A new borehole with a hand pump for a village", type: "C-19", stage: "paper", population: { mode: "people", served: 1600 }, placeWords: "A made-up district", waterSource: "new", treatment: "none" });

describe("where she is", () => {
  test("each door has its block; the Commons and MCP have no record and no Wellington to send anyone to", () => {
    expect(phoebeDoorBlock("free-site")).toContain("You are at the Free site door of rule 21. Wellington leads");
    expect(phoebeDoorBlock("agent-commons")).toContain("never send anyone to Wellington or to a step");
    expect(phoebeDoorBlock("paid-site")).toContain("the Project Record page");
    expect(phoebeDoorBlock("mcp")).toContain("There is no project record");
  });
});

describe("the record, as she reads it", () => {
  test("only what was said, the source and the treatment as plain facts, and no verdict", () => {
    const block = recordBlock(BOREHOLE, (id) => (id === "C-19" ? { name: "A made-up type name", plain: "A made-up plain sentence." } : undefined))!;
    expect(block.split("\n")[0]).toBe(`# ${RECORD_HEADING}`);
    for (const line of ["- What it does: A new borehole with a hand pump for a village", "- What type: A made-up type name — A made-up plain sentence.", "- The source: new", "- Treatment: none", "- Stage: on paper — still a plan — nothing has been spent on building it yet", "- People served: 1,600 people, as the visitor said it", "- Where it is: A made-up district"]) {
      expect(block).toContain(line);
    }
    expect(block).not.toMatch(/class|K[1-6]/);
    expect(recordBlock(emptyRecord())).toBeNull();
  });
  test("a screening made before these rules keeps its class line", () => {
    const old = emptyRecord();
    old.facts.type = { value: "C-19", source: { by: "person", note: "made up" } };
    old.facts.technologyClass = { value: "HWT", source: { by: "person", note: "made up" } };
    expect(recordBlock(old)).toContain("- Which class of drinking-water project: HWT");
    expect(classFor(old)).toBe("hwt");
  });
  test("the class that sorts her rows comes from the source and the treatment, and names none for a supply with treatment", () => {
    expect(classFor(BOREHOLE)).toBe("");
    expect(classFor(record({ waterSource: "new", treatment: "none", sourceSafe: true }))).toBe("cws");
    expect(classFor(record({ waterSource: "existing", treatment: "homes" }))).toBe("hwt");
    expect(classFor(record({ waterSource: "existing", treatment: "central" }))).toBe("cwt");
    expect(classFor(record({ waterSource: "existing", treatment: "institution" }))).toBe("iwt");
    expect(classFor(record({ waterSource: "new", treatment: "central" }))).toBe("");
  });
});

describe("one turn", () => {
  test("the blocks come in order: the cards, the door, the record, the worksheet, the notes; and a further call adds the note to answer now", () => {
    const sheet = applyUpdates(EMPTY_SHEET, { pathways: [{ pack: W, id: "W1", state: "applies" }] });
    const turn = phoebeTurn({ door: "free-site", record: BOREHOLE, sheet, eligibilityDone: true });
    expect(turn.blocks.map((b) => b.split("\n")[0])).toEqual(["# The cards you have on this turn", "# Where you are", `# ${RECORD_HEADING}`, `# ${WORKSHEET_HEADING}`, "Every row you ask on this site has a verdict for this visit. Give the read for each pathway, show once the rows that are acted on at later phases, say Wellington will join with the next step, and set handBack to \"wellington\". Never send them back to him."]);
    expect(phoebeTurn({ door: "free-site", record: BOREHOLE, sheet, again: true, sets: [...CARD_SETS] }).blocks.at(-1)).toBe(FINISH_NOTE);
  });
  test("on the opened turn there is no worksheet block, and the line the model reads is never the visitor's", () => {
    const turn = phoebeTurn({ door: "free-site", record: BOREHOLE, sheet: EMPTY_SHEET, opened: true, introduced: true });
    expect(turn.blocks.some((b) => b.startsWith(`# ${WORKSHEET_HEADING}`))).toBe(false);
    expect(turn.blocks.at(-1)).toContain("Wellington introduced you in this chat");
    expect(OPENED_TURN).toBe("(The visitor opened Eligibility.)");
  });
  test("a running project's first card set includes the carbon rows that judge its start date", () => {
    const running = record({ does: "A made-up running supply", stage: "running", waterSource: "new", treatment: "none" });
    const sheet = applyUpdates(EMPTY_SHEET, { pathways: [{ pack: W, id: "W1", state: "applies" }, { pack: W, id: "W2", state: "applies" }, ...["T1", "T2", "T3"].map((id) => ({ pack: C, id, state: "applies" as const }))] });
    expect(phoebeTurn({ door: "free-site", record: running, sheet }).sets).toContain("carbon:eligibility");
  });
});

describe("her answer, checked", () => {
  const base = { needCards: "none", reply: "Thanks. Is the borehole new?", answers: ["Yes", "Not yet"], closes: [], cited: [], handBack: "none", abstained: false };
  test("a row that does not exist, a Fixable row with no route of its own, a Blocked row its card says can be fixed, or a state with no sentence is dropped", () => {
    const a = readPhoebeAnswer({
      ...base,
      rows: [
        { pack: W, id: "1", state: "met", because: "The visitor named the method." },
        { pack: W, id: "99", state: "met", because: "No such row." },
        { pack: W, id: "1", state: "fixable", because: "x", routes: ["R-99"] },
        { pack: W, id: "1", state: "blocked", because: "Its card says it can be fixed." },
        { pack: W, id: "2", state: "unknown" },
        { pack: W, id: "2", state: "met", because: "x".repeat(501) },
      ],
    })!;
    expect(a.rows).toEqual([{ pack: W, id: "1", state: "met", because: "The visitor named the method." }]);
    expect(a.answers).toEqual(["Yes", "Not yet"]);
  });
  test("a path the reply closes is saved: a test that does not apply, or a Blocked row its card allows; never one that can always be fixed", () => {
    const a = readPhoebeAnswer({
      ...base,
      closes: [
        { pack: C, id: "T2", because: "People already have safe water and do not boil it." },
        { pack: C, id: "G12", because: "It started running years ago, past the year allowed." },
        { pack: C, id: "P2", because: "Its card says this can be fixed." },
      ],
    })!;
    expect(a.pathways).toEqual([{ pack: C, id: "T2", state: "does-not-apply", because: "People already have safe water and do not boil it." }]);
    expect(a.rows).toEqual([{ pack: C, id: "G12", state: "blocked", because: "It started running years ago, past the year allowed." }]);
  });
  test("tokens, sorts, the hand-back, the card set and the button label are held to their lists", () => {
    const a = readPhoebeAnswer({ ...base, needCards: "carbon:routes", cited: ["water:eligibility/4", "water:eligibility/4", "nope:eligibility/1", "water:quiz/1"], sorts: [{ pack: C, value: "hwt" }, { pack: C, value: "all" }, { pack: C, value: "made-up" }], handBack: "somewhere", learnMore: "baseline survey." })!;
    expect([a.cited, a.sorts, a.handBack, a.needCards, a.learnMore]).toEqual([["water:eligibility/4"], [{ pack: C, value: "hwt" }], "none", "carbon:routes", "baseline survey"]);
    expect(readPhoebeAnswer({ ...base, reply: "  " })).toBeNull();
    expect(readPhoebeAnswer({ ...base, learnMore: "x".repeat(49) })!.learnMore).toBe("");
  });
  test("message 1 sets nothing", () => {
    const a = readPhoebeAnswer({ ...base, rows: [{ pack: W, id: "1", state: "met", because: "Said." }], pathways: [{ pack: W, id: "W1", state: "applies" }], sorts: [{ pack: C, value: "cws" }] })!;
    expect(openedAnswer(a)).toMatchObject({ rows: [], pathways: [], sorts: [] });
  });
  test("a reply that ends by promising a look-up goes again; the evidence is read from the cards, never from her", () => {
    expect(leavesWaiting("Let me pull up the detail on how funding affects the carbon side before I answer that properly.")).toBe(true);
    expect(showable("Good question. Let me")).toBe("Good question.");
    const evidence = evidenceFor(["water:eligibility/4", "water:routes/R-5", "water:eligibility/99", "carbon:applies/T1"]);
    expect(evidence.map((e) => e.id)).toEqual(["water:eligibility/4", "water:routes/R-5", "carbon:applies/T1"]);
    expect(evidence[0]!.label).toMatch(/^Criterion 4 — /);
    expect(evidence[0]!.citation.page).toMatch(/^p/);
  });
});

describe("her worksheet and her readings", () => {
  const met = (pack: string, ids: string[]) => ids.map((id) => ({ pack, id, state: "met" as const, because: "Said." }));
  const waterApplies = [{ pack: W, id: "W1", state: "applies" as const }, { pack: W, id: "W2", state: "applies" as const }];
  test("a verdict for a row that does not exist is dropped, and a later class replaces an earlier one", () => {
    const sheet = applyUpdates(EMPTY_SHEET, { rows: [...met(W, ["1"]), { pack: W, id: "nope", state: "met" }], sorts: [{ pack: C, value: "cws" }, { pack: C, value: "hwt" }, { pack: C, value: "transitioning" }] });
    expect(Object.keys(sheet.rows[W]!)).toEqual(["1"]);
    // As carried: the carbon pack lists "transitioning" and "new" among its classes as well as its versions, so one
    // replaces the class word. Left as it is, and listed for the maintainer.
    expect(sheet.sorts[C]).toEqual(["transitioning"]);
    expect(applyUpdates(EMPTY_SHEET, { sorts: [{ pack: C, value: "cws" }, { pack: C, value: "hwt" }, { pack: C, value: "unknown" }] }).sorts[C]).toEqual(["hwt", "unknown"]);
    expect(creditedUnderV1(sheet)).toBe(true);
    expect(worksheetCaption(sheet, [{ pack: W }])).toBe("Worksheet — The water pathway: 1 Met");
  });
  test("likely once every row she asks is met; unlikely once a path is closed; nothing while she is still on it", () => {
    const done = applyUpdates(EMPTY_SHEET, { pathways: waterApplies, rows: met(W, ["1", "2", "4"]) });
    expect(pathwayReading(W, done, "", false)?.reading).toBe("likely");
    const closed = applyUpdates(EMPTY_SHEET, { pathways: [{ pack: C, id: "T2", state: "does-not-apply", because: "They already have safe water." }] });
    expect(pathwayReading(C, closed, "", false)).toMatchObject({ reading: "unlikely" });
    expect(pathwayReading(W, applyUpdates(EMPTY_SHEET, { pathways: waterApplies }), "", false)).toBeUndefined();
    expect(pathwayReading(W, applyUpdates(EMPTY_SHEET, { pathways: waterApplies }), "", true)).toMatchObject({ reading: "more to learn", reason: "Phoebe has not asked about it yet." });
  });
  test("her part is done when one path is done or closed and both were looked at; nothing is left to ask when every path is", () => {
    const one = applyUpdates(EMPTY_SHEET, { pathways: [...waterApplies, { pack: C, id: "T2", state: "does-not-apply", because: "Safe water already." }], rows: met(W, ["1", "2", "4"]) });
    expect([onePathDone(one, ""), phoebeDone(one, ""), nothingLeftToAsk(one, "")]).toEqual([true, true, true]);
    const half = applyUpdates(EMPTY_SHEET, { pathways: waterApplies, rows: met(W, ["1", "2", "4"]) });
    expect([onePathDone(half, ""), phoebeDone(half, ""), nothingLeftToAsk(half, "")]).toEqual([true, false, false]);
  });
  test("the worksheet crosses to the shared record and back, and her part lands there with each reading", () => {
    const sheet: Sheet = applyUpdates(EMPTY_SHEET, { pathways: [...waterApplies, { pack: C, id: "T2", state: "does-not-apply", because: "Safe water already." }], rows: met(W, ["1", "2", "4"]), sorts: [{ pack: C, value: "new" }] });
    expect(sheetFromRecord(withSheet(BOREHOLE, sheet))).toEqual(sheet);
    expect(readEligibilitySheet(withSheet(BOREHOLE, sheet).eligibility![W])).toEqual(withSheet(BOREHOLE, sheet).eligibility![W]);
    const out = addPhoebeResults(BOREHOLE, sheet);
    expect([out.pathways.vwba?.reading, out.pathways.carbon?.reading, out.agents.phoebe?.done, out.facts.creditedUnderV1?.value]).toEqual(["likely", "unlikely", true, false]);
    expect(out.facts.technology).toBeUndefined();
    expect(BOREHOLE.pathways).toEqual({});
  });
});

describe("her reply, measured and read while it is written", () => {
  test("her limit is four sentences and 400 characters, counted and never refused", () => {
    expect(PHOEBE_REPLY_LIMIT).toEqual({ sentences: 4, chars: 400 });
    expect(isLongPhoebeReply("Solar is good news for carbon. For water benefits, you'd count how much water the borehole gives people each year. Next: how do the villagers get drinking water today, and do they boil it?")).toBe(false);
    expect(isLongPhoebeReply("The project is planned. Planned is normal. A well is a new source. Water benefits count the new water. Carbon credits count the fuel saved. Who will use the water?")).toBe(true);
  });
  test("card words are caught, and plain words pass", () => {
    for (const said of ["Your borehole is water stewardship work with a volume behind it.", "There is a mapped way to count that.", "That puts it in the community supply kind.", "This criterion is about additionality.", "We need the baseline first.", "It is a CWS project on the carbon pathway."]) {
      expect(cardWordsIn(said)).not.toEqual([]);
    }
    for (const plain of ["Providing safe water to a community has benefits that can be counted.", "You might need a baseline survey to learn that, and we can help you find tools for it.", "Solar is good news for carbon credits. Who will use the water?"]) {
      expect(cardWordsIn(plain)).toEqual([]);
    }
  });
  test("cut at every character, the reply only grows, shows no half escape, and ends exact; needCards is read as soon as it is written", () => {
    const whole = JSON.stringify({ needCards: "none", reply: 'Line one.\nShe said "yes" — café ✓. Next?', cited: [] });
    let previous = "";
    for (let end = 0; end <= whole.length; end += 1) {
      const sofar = replySoFar(whole.slice(0, end)) ?? "";
      expect(sofar.startsWith(previous)).toBe(true);
      previous = sofar;
    }
    expect(previous).toBe(JSON.parse(whole).reply);
    expect(replySoFar('{"needCards":"none","rep')).toBeNull();
    expect(needCardsSoFar('{"needCards":"carbon:eli')).toBeNull();
    expect(needCardsSoFar('{"needCards":"carbon:eligibility","reply":"')).toBe("carbon:eligibility");
    expect(replySoFar(JSON.stringify({ rows: [{ because: 'He wrote "reply": "no"' }], reply: "Real." }))).toBe("Real.");
  });
});

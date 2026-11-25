// The core step (J5): the open facts, Phoebe's rows, notes, the checks on a reply, the chat and the crew list. Every
// project here is made up.
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { crewSeat } from "./crew";
import { chatContext, openAsks, openedTurn, partIsDone, whenDone, type Ask } from "./chat";
import { PLACES } from "./places";
import { MIN_REPLY_CHARS, READING_GRADE, REPLY_LIMIT, isDegenerateReply, isHardReply, isLongReply, readHandBack, readingGrade, replyLength, walkGrades } from "./reply";
import { NOTE_LIMIT, NOTE_TOO_LONG, addGivenFacts, emptyRecord, noteBy, readEligibilitySheet, setEligibilitySheet, setValueNote, technologyOfFacts, withNote } from "./record";
import { RowNote, ValueNotesProvider } from "./notes";

const at = "2026-11-24T10:00:00.000Z";

describe("the rest of the open site's facts", () => {
  test("Wellington adds them in the visitor's own words, and each counts as one question", () => {
    const { record, added, dropped } = addGivenFacts(emptyRecord(), "wellington", { name: " Made-up wells ", does: "Drills wells.", type: "C-19", technologyClass: "CWS", stage: "paper", placeWords: "near a made-up town" });
    expect(added).toEqual(["name", "does", "type", "technologyClass", "stage", "placeWords"]);
    expect(dropped).toEqual([]);
    expect(record.facts.name).toBe("Made-up wells");
    expect([record.facts.type?.value, record.facts.technologyClass?.value, record.facts.stage?.value, record.place.words?.value]).toEqual(["C-19", "CWS", "paper", "near a made-up town"]);
    expect(record.agents.wellington?.questionsAsked).toBe(6);
  });
  test("a text past its limit is left out whole, never cut", () => {
    const { record, dropped } = addGivenFacts(emptyRecord(), "wellington", { does: "x".repeat(281), placeWords: "y".repeat(161), name: "z".repeat(161) });
    expect(dropped).toEqual(["name", "does", "placeWords"]);
    expect([record.facts.does, record.place.words, record.facts.name]).toEqual([undefined, undefined, undefined]);
  });
  test("a word that is not on its list is left out, and so is a class beside a type that has none", () => {
    expect(addGivenFacts(emptyRecord(), "wellington", { type: "C-99" as never, stage: "soon" as never }).dropped).toEqual(["type", "stage"]);
    expect(addGivenFacts(emptyRecord(), "wellington", { type: "C-3", technologyClass: "HWT" }).dropped).toEqual(["technologyClass"]);
    expect(addGivenFacts(emptyRecord(), "wellington", { technologyClass: "HWT" }).dropped).toEqual(["technologyClass"]);
  });
  test("a fact already on the record is not changed", () => {
    const { record } = addGivenFacts(emptyRecord(), "wellington", { stage: "paper" });
    expect(addGivenFacts(record, "calvin", { stage: "running" }).added).toEqual([]);
  });
  test("the technology the facts name, and nothing for the rest", () => {
    expect(technologyOfFacts("C-19", "CWS")).toEqual({ label: "Community water supply technologies", code: "CWS" });
    expect(technologyOfFacts("C-19", "HWT")).toEqual({ label: "Household water treatment technologies", code: "HWT" });
    expect(technologyOfFacts("C-19", "CWT")).toEqual({ label: "Community level water treatment technologies" });
    expect(technologyOfFacts("C-19", "IWT")).toEqual({ label: "Institutional water treatment technologies" });
    expect(technologyOfFacts("C-11", undefined)).toEqual({ label: "New or alternative water supply" });
    expect([technologyOfFacts("C-19", undefined), technologyOfFacts("C-3", undefined), technologyOfFacts(undefined, undefined)]).toEqual([null, null, null]);
  });
});

describe("Phoebe's rows", () => {
  test("kept by pack and by the row's own id; a row that does not hold is left out whole", () => {
    const sheet = { rows: { W1: { state: "applies", because: " It adds water. " }, 1: { state: "fixable", routes: ["R-3", 4] }, 2: { state: "maybe" }, 3: { state: "met", because: "x".repeat(501) } }, sorts: ["cws", 5] };
    const record = emptyRecord();
    const next = setEligibilitySheet(record, "vwba-2.0", sheet);
    expect(next.eligibility).toEqual({ "vwba-2.0": { rows: { W1: { state: "applies", because: "It adds water." }, 1: { state: "fixable", routes: ["R-3"] } }, sorts: ["cws"] } });
    expect(record.eligibility).toBeUndefined();
    expect(readEligibilitySheet("nothing")).toEqual({ rows: {} });
  });
});

describe("a note has a limit and names its writer", () => {
  test("a person's note, its writer and its limit", () => {
    expect(withNote({}, "a", " x ", at, "A")).toEqual({ a: { text: "x", changed: at, by: "person", label: "A" } });
    expect(withNote({}, "a", "x", at, undefined, "calvin").a?.by).toBe("calvin");
    expect(withNote({}, "a", "x".repeat(NOTE_LIMIT), at).a?.text.length).toBe(2000);
    const before = withNote({}, "a", "kept", at);
    expect(withNote(before, "a", "x".repeat(NOTE_LIMIT + 1), at)).toEqual(before);
    expect(withNote(before, "a", " ", at)).toEqual({});
    expect(NOTE_TOO_LONG).toBe("A note can be up to 2,000 characters.");
  });
  test("one written before the writer was kept was a person's", () => {
    expect(noteBy({ text: "x", changed: at })).toBe("person");
  });
  test("on the record: the record handed in stays as it was, and an empty note takes the part's notes away", () => {
    const record = emptyRecord();
    const next = setValueNote(record, "violet", "peopleServed", "Counted in June.", at, "People");
    expect(next.agents.violet?.notes).toEqual({ peopleServed: { text: "Counted in June.", changed: at, by: "person", label: "People" } });
    expect(record.agents.violet).toBeUndefined();
    expect(setValueNote(next, "violet", "peopleServed", "", at).agents.violet?.notes).toBeUndefined();
  });
  test("the box still shows a note", () => {
    expect(renderToStaticMarkup(<ValueNotesProvider notes={withNote({}, "a", "Seen", at)}><RowNote noteKey="a" label="A" /></ValueNotesProvider>)).toContain("Seen");
  });
});

describe("the checks on a reply, with the open site's numbers unchanged", () => {
  test("the limits", () => {
    expect([MIN_REPLY_CHARS, REPLY_LIMIT, READING_GRADE]).toEqual([40, { sentences: 4, chars: 400 }, { average: 6, reply: 8 }]);
  });
  test("length is counted plainly", () => {
    expect(replyLength("It runs for 2.5 hours, e.g. at night. Is that right?")).toEqual({ sentences: 2, chars: 52 });
    expect(replyLength("Tell me… how many people").sentences).toBe(1);
    expect(isLongReply("One. Two. Three. Four.")).toBe(false);
    expect(isLongReply("One. Two. Three. Four. Five.")).toBe(true);
    expect(isLongReply("x".repeat(401))).toBe(true);
    expect([isDegenerateReply("Hi."), isDegenerateReply("x".repeat(40))]).toEqual([true, false]);
  });
  test("reading level: plain words are low, long words are high, and a name never fails a reply", () => {
    const plain = "We count the water the pump gives. How many people use it?";
    expect(readingGrade(plain)).toBeLessThanOrEqual(6);
    expect(isHardReply(plain)).toBe(false);
    expect(isHardReply("Quantification methodologies necessitate comprehensive documentation of anticipated operational performance.")).toBe(true);
    expect(readingGrade("Ask Wellington about WaterBots in Samburu.")).toBe(readingGrade("Ask Phoebe about fNRB in Lodwar."));
    expect(walkGrades([5, 6, 7])).toEqual({ average: 6, hardest: 7, passes: true });
    expect(walkGrades([2, 9]).passes).toBe(false);
  });
  test("the hand-back is a field from a list", () => {
    expect([readHandBack("wellington"), readHandBack("phoebe"), readHandBack(undefined)]).toEqual(["wellington", "none", "none"]);
  });
});

describe("a calculator agent's chat", () => {
  const asks: Ask[] = [
    { key: "a", about: "how many people it serves", why: "the water is worked out from it", from: "a count", needed: true },
    { key: "b", about: "what powers the pump", why: "it may give off gas", from: "the pump", needed: false },
  ];
  const base = { place: "free-site", asks, kept: [{ key: "k", label: "Days", called: "assumed", shown: "347 d", source: "V2.0 SDWS 32" }], figureShows: false, screen: "THE SCREEN" } as const;
  test("it asks for one thing, says why and where from, and lists the rest for later", () => {
    const block = chatContext({ ...base, known: ["Country: LSO"], opened: true });
    expect(block).toContain("Ask for this one thing, in your own words: how many people it serves.");
    expect(block).toContain("It is for: the water is worked out from it. It usually comes from: a count.");
    expect(block).toContain("Later, one at a time, in this order: what powers the pump.");
    expect(block).toContain("Already on the project record. Never ask for these again.\n- Country: LSO");
    expect(block).toContain('Days: 347 d, called "assumed" (V2.0 SDWS 32).');
    expect(block).toContain("Speak first.");
    expect(block).not.toContain("Your part is done");
  });
  test("a fact left for now is not asked again; one that is needed keeps the part open", () => {
    expect(openAsks(asks, ["a"]).map((x) => x.key)).toEqual(["b"]);
    expect([partIsDone(asks, true), partIsDone(asks.slice(1), true), partIsDone([], false)]).toEqual([false, true, false]);
  });
  test("a refused number is said first", () => {
    expect(chatContext({ ...base, refused: ["Days of access must be between 0 and 365."] })).toContain("Not filled in.\n- Days of access must be between 0 and 365.");
  });
  test("when its part is done, Wellington comes next on both sites, and no one does elsewhere", () => {
    for (const saved of [false, true]) expect(whenDone("paid-site", saved)).toContain("Wellington comes next");
    expect(whenDone("free-site")).toContain("Wellington comes next");
    expect(whenDone("agent-commons")).toContain("hand back to no one");
    expect(whenDone("mcp")).toContain("Hand back to no one");
    for (const place of PLACES) expect(whenDone(place).length).toBeGreaterThan(10);
    expect(chatContext({ ...base, asks: [], figureShows: true })).toContain("Your part is done");
  });
  test("where there is no record, none is listed; in the Agent Commons it introduces itself", () => {
    const block = chatContext({ ...base, place: "agent-commons", opened: true, introduce: true, known: ["Country: LSO"] });
    expect(block).not.toContain("Already on the project record");
    expect(block).toContain("say who you are and what you do");
    expect(openedTurn("Calvin")).toBe("(The visitor opened Calvin's chat.)");
  });
});

describe("the crew list", () => {
  test("the five agents of the map have a seat, and no one else is an agent of the map", () => {
    for (const id of ["wellington", "phoebe", "bridget", "calvin", "violet"]) expect(crewSeat(id)?.name).toBeDefined();
    expect(crewSeat("vector")).toBeUndefined();
  });
});

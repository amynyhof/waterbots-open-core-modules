// Bridget's package: the pin, GPS numbers, the place, her turn, her answer and her instructions. Every case is made up.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { FINISH_NOTE, FINISH_RULE } from "@waterbots/core/lookUp";
import { addGivenFacts, newProjectRecord } from "@waterbots/core/record";
import {
  BRIDGET_ANSWER_SCHEMA,
  BRIDGET_PLACES,
  OPENED_INTRODUCED_TURN,
  OPENED_TURN,
  PINNED_TURN,
  RECORD_HEADING,
  STRESS_LABELS,
  basinContaining,
  bridgetFirstLine,
  bridgetInstructions,
  bridgetRecordBlock,
  chatForTurn,
  countryIsoFor,
  foldPlace,
  inShape,
  isBridgetPlace,
  placedPlace,
  readBridgetAnswer,
  readBridgetAnswerAgain,
  readGps,
  readGpsOutcome,
  readHeardPlace,
  readPin,
  readPlace,
  replyVerdict,
  rulesFrom,
  servedWords,
  settleBridgetAnswer,
  turnBlocks,
  visitBlock,
  type Shape,
} from "./index.js";

const PIN = { hybasId: 1060000010, level: 6 as const, subAreaKm2: 1234.6, stressLabel: "High (40-80%)" };
const prompt = readFileSync(new URL("./agents/bridget/prompt.md", import.meta.url), "utf8");
const rules = readFileSync(new URL("../../core/src/agent-rules.md", import.meta.url), "utf8");

describe("the pin", () => {
  test("a pin the map could have made is kept, and any other is refused whole", () => {
    expect(readPin(PIN)).toEqual(PIN);
    expect(readPin({ ...PIN, level: 4 })?.level).toBe(4);
    for (const bad of [null, "pin", { ...PIN, hybasId: 0 }, { ...PIN, hybasId: 1.5 }, { ...PIN, level: 5 }, { ...PIN, subAreaKm2: 0 }, { ...PIN, subAreaKm2: Infinity }, { ...PIN, stressLabel: "Very high" }]) {
      expect(readPin(bad)).toBeNull();
    }
    expect(STRESS_LABELS).toHaveLength(8);
  });
  test("the GPS outcome is one of three, or none", () => {
    expect(["found", "outside", "failed", "lost", 1].map(readGpsOutcome)).toEqual(["found", "outside", "failed", null, null]);
  });
  test("a place is the visitor's words, up to 80 characters, never cut", () => {
    expect(readPlace("  Kitui   town ")).toBe("Kitui town");
    expect(readPlace("x".repeat(81))).toBe("");
    expect(readPlace(3)).toBe("");
  });
  test("a place she heard is kept only when it is in the visitor's last words, and numbers alone are not one", () => {
    expect(readHeardPlace("Kitui", "It is near kitui, by the road.")).toBe("Kitui");
    expect(readHeardPlace("Machakos", "It is near Kitui.")).toBe("");
    expect(readHeardPlace("1.2, 36.8", "It is at 1.2, 36.8")).toBe("");
    expect(readHeardPlace("Upper  Valley", "the upper valley district")).toBe("Upper Valley");
  });
});

describe("GPS numbers, read by code", () => {
  const cases: [string, { lat: number; lon: number } | null][] = [
    ["It is at -1.2921, 36.8219", { lat: -1.2921, lon: 36.8219 }],
    ["1.5°S 37.25°E", { lat: -1.5, lon: 37.25 }],
    ["37.25 E, 1.5 S", { lat: -1.5, lon: 37.25 }],
    ["S 1.5 E 37.25", { lat: -1.5, lon: 37.25 }],
    ["1°30'0\"S 37°15'0\"E", { lat: -1.5, lon: 37.25 }],
    ["−1.5, 37.25", { lat: -1.5, lon: 37.25 }],
    ["-1.5 and 37.25", { lat: -1.5, lon: 37.25 }],
    ["12 34", null],
    ["95.5, 10.5", null],
    ["10.5, 190.5", null],
    ["10.5 N 20.5 N", null],
    ["The borehole serves 1,200 people.", null],
    ["Call 0722 123 456", null],
    ["", null],
  ];
  test.each(cases)("%s", (message, point) => {
    const read = readGps(message);
    if (point === null) expect(read).toBeNull();
    else {
      expect(read?.lat).toBeCloseTo(point.lat, 6);
      expect(read?.lon).toBeCloseTo(point.lon, 6);
    }
  });
  test("the basin a point falls in, from the basins the site passes in", () => {
    const square = (x: number, y: number, size: number): number[][] => [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]];
    const ring: Shape = { type: "Polygon", coordinates: [square(0, 0, 10), square(4, 4, 2)] };
    const multi: Shape = { type: "MultiPolygon", coordinates: [[square(20, 20, 1)], [square(30, 30, 1)]] };
    expect([inShape({ lat: 1, lon: 1 }, ring), inShape({ lat: 5, lon: 5 }, ring), inShape({ lat: 30.5, lon: 30.5 }, multi), inShape({ lat: 1, lon: 1 }, null)]).toEqual([true, false, true, false]);
    const basins = [{ id: 1, geometry: ring }, { id: 2, geometry: multi }, { id: 3, geometry: null }];
    expect(basinContaining({ lat: 20.5, lon: 20.5 }, basins)?.id).toBe(2);
    expect(basinContaining({ lat: 50, lon: 50 }, basins)).toBeNull();
  });
});

describe("a more exact place", () => {
  const isCountry = (text: string): boolean => countryIsoFor(text, COUNTRIES) !== null;
  const COUNTRIES = [
    { iso: "KEN", name: "Kenya" },
    { iso: "NER", name: "Niger" },
    { iso: "NGA", name: "Nigeria" },
    { iso: "GIN", name: "Guinea" },
    { iso: "PNG", name: "Papua New Guinea" },
    { iso: "CIV", name: "Côte d'Ivoire" },
  ];
  test("it goes in front of what Wellington heard, so the country is kept", () => {
    expect(placedPlace({ text: "Kenya", from: "chat" }, "Kitui", isCountry)).toEqual({ text: "Kitui, Kenya", from: "chat" });
    expect(placedPlace({ text: "", from: "" }, "Kitui", isCountry)).toEqual({ text: "Kitui", from: "chat" });
    expect(placedPlace({ text: "Kenya", from: "chat" }, "Lagos, Nigeria", isCountry)).toEqual({ text: "Lagos, Nigeria", from: "chat" });
    expect(placedPlace({ text: "HYBAS 1 · Level 6 · High (40-80%)", from: "pin" }, "Kitui", isCountry)).toEqual({ text: "Kitui", from: "chat" });
  });
  test("a typed place is never overwritten, and a place already held is kept", () => {
    const typed = { text: "Kenya", from: "typed" as const };
    expect(placedPlace(typed, "Kitui", isCountry)).toBe(typed);
    const held = { text: "Kitui, Kenya", from: "chat" as const };
    expect(placedPlace(held, "kitui", isCountry)).toBe(held);
    expect(placedPlace(held, "  ", isCountry)).toBe(held);
  });
  test("one country named word for word, or none", () => {
    expect(foldPlace("Côte d’Ivoire!")).toBe("cote d ivoire");
    expect(countryIsoFor("Lagos, Nigeria", COUNTRIES)).toBe("NGA");
    expect(countryIsoFor("near Port Moresby, Papua New Guinea", COUNTRIES)).toBe("PNG");
    expect(countryIsoFor("Abidjan, Cote d'Ivoire", COUNTRIES)).toBe("CIV");
    expect(countryIsoFor("Kenya and Niger", COUNTRIES)).toBeNull();
    expect(countryIsoFor("Kenyan hills", COUNTRIES)).toBeNull();
    expect(countryIsoFor("", COUNTRIES)).toBeNull();
  });
});

describe("her turn", () => {
  test("the turns no visitor typed", () => {
    expect(chatForTurn([], { opened: true })?.chat).toEqual([{ role: "user", content: OPENED_TURN }]);
    expect(chatForTurn([], { opened: true, introduced: true })?.chat).toEqual([{ role: "user", content: OPENED_INTRODUCED_TURN }]);
    expect(chatForTurn([], { introduced: true })).toBeNull();
    const hers = [{ role: "assistant" as const, content: "Where is it?" }];
    expect(chatForTurn(hers, { pinned: true })).toEqual({ chat: [{ role: "user", content: OPENED_TURN }, ...hers, { role: "user", content: PINNED_TURN }], lastWords: "", typed: false });
    expect(chatForTurn(hers)).toBeNull();
    const typed = [...hers, { role: "user" as const, content: "Near Kitui." }];
    expect(chatForTurn(typed, { pinned: true })).toMatchObject({ lastWords: "Near Kitui.", typed: true });
  });
  test("the visit block says the place, the device, the GPS outcome and the pin", () => {
    const none = visitBlock("", false, null);
    expect(none).toContain("Wellington has not heard where the project is.");
    expect(none).toContain("they click");
    expect(none).toContain("No basin is pinned yet.");
    const pinned = visitBlock("Kenya", true, PIN, "found");
    expect(pinned).toContain('in their own words: "Kenya"');
    expect(pinned).toContain("they tap");
    expect(pinned).toContain("the console has pinned the basin they fall in");
    expect(pinned).toContain('"High (40-80%)"');
    expect(pinned).toContain("1,235 km²");
    expect(pinned).toContain("The reading is published");
    expect(visitBlock("", false, { ...PIN, level: 4 })).toContain("The reading is derived");
    expect(visitBlock("", false, null, "outside")).toContain("fall in no basin on this map");
    expect(visitBlock("", false, null, "failed")).toContain("could not be read just now");
  });
  test("she reads the record Phoebe reads, and nothing when it holds nothing", () => {
    expect(bridgetRecordBlock(newProjectRecord())).toBeNull();
    const r = addGivenFacts(newProjectRecord(), "wellington", { name: "Made-up well", does: "A new borehole for a village", waterSource: "new", treatment: "none", type: "C-19", stage: "paper", population: { mode: "households", served: 2400 }, placeWords: "Kitui, Kenya" }).record;
    const block = bridgetRecordBlock(r)!;
    expect(block.startsWith(`# ${RECORD_HEADING}`)).toBe(true);
    for (const line of ["- What it does: A new borehole for a village", "- What type: Access to potable water supply — Giving households or a community access to water that is safe to drink.", "- The source: new", "- Treatment: none", "- Stage: on paper — still a plan — nothing has been spent on building it yet", "- People served: 2,400 households, as the visitor said it", "- Where it is: Kitui, Kenya", "- What it is called: Made-up well"]) {
      expect(block).toContain(line);
    }
    expect([servedWords({ mode: "people", served: 1 }), servedWords({ served: 5 })]).toEqual(["1 person", null]);
  });
  test("the blocks come in order, and the same question asked again ends with the note", () => {
    expect(turnBlocks("visit", null)).toEqual(["visit"]);
    expect(turnBlocks("visit", "record", true)).toEqual(["visit", "record", FINISH_NOTE]);
  });
});

describe("her answer, checked", () => {
  const raw = { reply: "Thank you. Could you tell me the town or district it is in?", answers: ["Yes", "Not yet"], showMap: false, place: "Kitui", handBack: "nobody", abstained: false, abstentionTopic: "funders" };
  test("each field is read, and an unknown hand-back is none", () => {
    expect(readBridgetAnswer(raw)).toEqual({ reply: raw.reply, answers: ["Yes", "Not yet"], showMap: false, place: "Kitui", handBack: "none", abstained: false });
    expect(readBridgetAnswer({ ...raw, abstained: true })?.abstentionTopic).toBe("funders");
    for (const bad of [null, {}, { reply: "  " }]) expect(readBridgetAnswer(bad)).toBeNull();
    expect(BRIDGET_ANSWER_SCHEMA.required).toContain("answers");
  });
  test("an answer is sent, asked again once, or a fault", () => {
    const a = readBridgetAnswer(raw)!;
    const waits = { ...a, reply: "Good question. Let me look into that for you, one moment while I check." };
    expect(replyVerdict(a, { pinned: false, call: 1 })).toBe("send");
    expect(replyVerdict(waits, { pinned: false, call: 1 })).toBe("again");
    expect(replyVerdict(waits, { pinned: false, call: 2 })).toBe("fault");
    expect(replyVerdict(waits, { pinned: true, call: 1 })).toBe("send");
    expect(replyVerdict({ ...waits, handBack: "wellington" }, { pinned: false, call: 1 })).toBe("send");
    expect(replyVerdict({ ...a, reply: "Ok." }, { pinned: false, call: 1 })).toBe("fault");
    expect(replyVerdict(null, { pinned: false, call: 1 })).toBe("fault");
  });
  test("settled in code: the place in the visitor's words, the map on her first turn, Wellington after a pin", () => {
    const a = readBridgetAnswer(raw)!;
    const turn = { typed: true, lastWords: "It is near Kitui.", opened: false, pinned: false, pin: null };
    expect(settleBridgetAnswer(a, turn)).toMatchObject({ place: "Kitui", showMap: false, handBack: "none" });
    expect(settleBridgetAnswer(a, { ...turn, lastWords: "Somewhere east." }).place).toBe("");
    expect(settleBridgetAnswer(a, { ...turn, typed: false }).place).toBe("");
    expect(settleBridgetAnswer(a, { ...turn, opened: true }).showMap).toBe(true);
    expect(settleBridgetAnswer({ ...a, showMap: true }, { ...turn, pinned: true, pin: PIN })).toMatchObject({ showMap: false, handBack: "wellington" });
  });
  test("the second check, where the answer is shown", () => {
    expect(readBridgetAnswerAgain({ reply: "Hi.", handBack: "x", answers: ["Yes", 3], place: ` ${"y".repeat(90)}` })).toEqual({ reply: "Hi.", handBack: "none", abstained: false, answers: ["Yes"], showMap: false, place: "y".repeat(80) });
    expect(readBridgetAnswerAgain({ reply: 3 })).toBeNull();
  });
});

describe("her instructions", () => {
  const shared = { primer: "## The roster\n\nFive agents.\n", statusSheet: "# Build status sheet\n\nLive.\n" };
  const free = bridgetInstructions({ place: "free-site", prompt, agentRules: rules, ...shared });
  const paid = bridgetInstructions({ place: "paid-site", prompt, agentRules: rules, ...shared });
  test("she is told her real place", () => {
    expect(free.startsWith(`${bridgetFirstLine("free-site")}\n\n# Your voice`)).toBe(true);
    expect(paid.startsWith("You are Bridget, on the WaterBots paid site: the Paid site door of rule 21.")).toBe(true);
    expect(BRIDGET_PLACES).toEqual(["free-site", "paid-site"]);
    expect([isBridgetPlace("free-site"), isBridgetPlace("agent-commons"), isBridgetPlace("mcp"), isBridgetPlace("lobby-chat")]).toEqual([true, false, false, false]);
  });
  test("rules 1 to 21 come once, from core, and the look-up rule once, in her output", () => {
    expect(free).toContain(rulesFrom(rules));
    expect(free.split("## How an agent talks")).toHaveLength(2);
    expect(free).not.toContain("# Foundational agent rules");
    expect(free.split(FINISH_RULE)).toHaveLength(2);
    expect(free.indexOf(FINISH_RULE)).toBeGreaterThan(free.indexOf("# Your output"));
    expect(free.endsWith("# Build status sheet\n\nLive.\n\n")).toBe(true);
  });
  test("the Free site's own lines are told only there", () => {
    expect(free).toContain("5. **You have no memory.**");
    expect(free).toContain("The map opens on the visitor's country by itself");
    expect(paid).not.toContain("You have no memory");
    expect(paid).not.toContain("by itself");
  });
  test("her own text restates no agent rule, holds no line for her to say, and leaves the map data's lines for its own step", () => {
    expect(prompt).not.toMatch(/two or three short sentences|work out numbers yourself|Never ask its name|in your own words|I'm still being built|\bK[1-6]\b/);
    expect(prompt).not.toMatch(/derived|Free site|thirty messages/i);
    expect(prompt).not.toContain("## How an agent talks");
  });
  test("a prompt without its rules line or its output heading is refused", () => {
    expect(() => bridgetInstructions({ place: "free-site", prompt: "# Your voice\n", agentRules: rules, ...shared })).toThrow(/rules line/);
    expect(() => rulesFrom("# Nothing here\n")).toThrow(/How an agent talks/);
  });
});

// Wellington's package. Every project here is made up. The cases marked "carried" are the open site's own
// (scripts/check-wellington.mjs, commit 0f16957), with its file checks left out: those read the open site's screens.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { STEPS, agentMap } from "@waterbots/core/agentMap";
import { FINISH_NOTE, FINISH_RULE } from "@waterbots/core/lookUp";
import { KIND_ASKS } from "@waterbots/core/projectKinds";
import { PLACES } from "@waterbots/core/places";
import { PROJECT_TYPE_IDS, addGivenFacts, emptyRecord, newProjectRecord, setAgentResults, type ProjectRecord } from "@waterbots/core/record";
import {
  HIS_KIND_FACTS,
  REFUSED_LINE,
  WELLINGTON_RESPONSE_SCHEMA,
  addWellingtonFacts,
  learnedFacts,
  readWellingtonAnswer as validate,
  refusedCount,
} from "./answer";
import { crewRoles, firstLine, placeLines, rulesPart, wellingtonInstructions, type SharedTexts } from "./instructions";
import { STEP_NAMES, afterHomeUse, asksHomeUse, guardRoute, mapBlock, mapNote, readMap, saysAllDone, stepEndNote, stepEndRoute } from "./map";
import { FREE_SITE_MD, LOBBY_CHAT_MD, PAID_SITE_MD, PRIMER_MD, PROMPT_MD } from "./ownText.generated";
import { PROJECT_TYPE_WORDS } from "@waterbots/core/projectWords";
import { projectTypesText } from "./projectTypes";
import { checkWellingtonTurn, countryIsoFor, openedLine, phoebeFoundBlock, stillBlank, visitBlock, wellingtonBlocks } from "./turn";

const own = (name: string): string => readFileSync(new URL(`./agents/wellington/${name}.md`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const RULES = readFileSync(new URL("../../core/src/agent-rules.md", import.meta.url), "utf8");
const SHARED: SharedTexts = { agentRules: RULES, roster: "ROSTER PART", plainWords: "PLAIN WORDS", beforeAfter: "BEFORE AND AFTER", statusSheet: "STATUS SHEET" };
const by = { by: "person", note: "made up" } as const;

describe("his own files", () => {
  test("the code reads them as they are (run `npm run build:text` after changing one)", () => {
    expect([PROMPT_MD, PRIMER_MD, FREE_SITE_MD, PAID_SITE_MD, LOBBY_CHAT_MD]).toEqual(["prompt", "primer", "free-site", "paid-site", "lobby-chat"].map(own));
  });
  test("none restates one of the 21 rules", () => {
    const rules = rulesPart(RULES)
      .split("\n")
      .filter((l) => /^\s*\d+\. /.test(l))
      .flatMap((l) => l.replace(/^\s*\d+\. /, "").split(/(?<=\.) /))
      .filter((s) => s.length > 25);
    const mine = [PROMPT_MD, PRIMER_MD, FREE_SITE_MD, PAID_SITE_MD, LOBBY_CHAT_MD].join("\n");
    expect(rules.filter((s) => mine.includes(s))).toEqual([]);
    expect(mine).not.toMatch(/in your own words|never a script/i);
  });
  test("no kind and no class: he never names one, and nobody is asked for one", () => {
    const all = [PROMPT_MD, PRIMER_MD, FREE_SITE_MD, projectTypesText(), JSON.stringify(WELLINGTON_RESPONSE_SCHEMA)].join("\n");
    expect(all).not.toMatch(/\bK[1-6]\b|gsClass|technologyClass|\b(?:HWT|IWT|CWT|CWS)\b|Safe-water technology classes/);
  });
});

describe("his instructions, for his place", () => {
  test("his first line names his real place, never always the Free site", () => {
    for (const place of PLACES) expect(firstLine(place)).toMatch(/^You are Wellington, the Team Lead, /);
    expect(new Set(PLACES.map(firstLine)).size).toBe(PLACES.length);
    expect(firstLine("paid-site")).not.toMatch(/Free site/);
    expect(firstLine("lobby-chat")).toMatch(/lobby chat/);
  });
  test("the lines that fit one place reach that place only", () => {
    const free = wellingtonInstructions("free-site", SHARED);
    const paid = wellingtonInstructions("paid-site", SHARED);
    expect(free).toContain(FREE_SITE_MD);
    expect(paid).not.toContain('Never say "free"');
    expect(paid).toContain(PAID_SITE_MD);
    expect(wellingtonInstructions("lobby-chat", SHARED)).toContain(LOBBY_CHAT_MD);
    expect(placeLines("agent-commons")).toBe("");
  });
  test("rules 1 to 21 whole, the look-up rule, the team of five, and what the site hands in", () => {
    const text = wellingtonInstructions("free-site", SHARED);
    expect(text).toContain(rulesPart(RULES));
    expect(rulesPart(RULES).startsWith("## How an agent talks")).toBe(true);
    expect(text).toContain(FINISH_RULE);
    expect(text).toContain("The team has five people: you, Phoebe, Bridget, Calvin and Violet.");
    for (const part of ["ROSTER PART", "PLAIN WORDS", "BEFORE AND AFTER", "STATUS SHEET", PRIMER_MD, projectTypesText()]) expect(text).toContain(part);
    expect(wellingtonInstructions("free-site", SHARED)).toBe(text);
    expect(() => rulesPart("no rules here")).toThrow(/How an agent talks/);
  });
  test("what each colleague helps with comes from core's crew list, as the open site had it", () => {
    expect(crewRoles()).toBe(
      "- Phoebe (Eligibility): Pathway eligibility and feasibility screening; What would change eligibility for a project already built and running.\n- Bridget (Partners): The project's place and basin on the map; Who the partners are and whose permission is needed.\n- Calvin (Carbon credits calculator): Emission reductions from the deterministic calculators; Methodology questions.\n- Violet (Volumetric water benefits calculator): The volumetric water benefit of a project that supplies water, from the deterministic calculator; Questions about the D-3 method.\n",
    );
  });
  test("the project types are core's words, each with its name and one plain sentence, and no class", () => {
    expect(PROJECT_TYPE_WORDS.map((t) => t.id)).toEqual([...PROJECT_TYPE_IDS]);
    expect(projectTypesText()).not.toMatch(/(HWT|IWT|CWT|CWS)|carbon classes/);
    expect(projectTypesText()).toMatch(/^## Water stewardship activity types — the VWBA guidebook\n\n- C-1 — /);
  });
});

describe("his answer, checked (carried)", () => {
  test("W24: the introduction is kept on a route to a colleague, dropped elsewhere or past one line", () => {
    const intro = "Phoebe, this is a borehole for 1,600 people in a made-up town, still on paper.";
    expect(validate({ reply: "Let me introduce you to a colleague.", route: "eligibility", introduction: intro, abstained: false })?.introduction).toBe(intro);
    expect(validate({ reply: "Tell me more about it, please.", route: "none", introduction: intro, abstained: false })?.introduction).toBeUndefined();
    expect(validate({ reply: "Let me introduce you to a colleague.", route: "eligibility", introduction: "Phoebe,\nmeet them.", abstained: false })?.introduction).toBeUndefined();
    expect(validate({ reply: "Let me introduce you to a colleague.", route: "map", introduction: "Bridget, this is a borehole.", abstained: false })?.introduction).toBe("Bridget, this is a borehole.");
    expect(validate({ reply: "Let me introduce you to a colleague.", route: "water", introduction: "Violet, this is a borehole.", abstained: false })?.introduction).toBe("Violet, this is a borehole.");
    expect(validate({ reply: "Saving is on the paid site.", route: "paid", introduction: "Nobody, this is a line.", abstained: false })?.introduction).toBeUndefined();
  });
  test("an unknown route is none, and an empty reply is no answer", () => {
    expect(validate({ reply: "Hello there.", route: "nowhere", abstained: false })?.route).toBe("none");
    expect(validate({ reply: "  ", route: "none" })).toBeNull();
    expect(validate("text")).toBeNull();
  });
  test("home use: one of three, and only as the answer to the question his last reply asked", () => {
    const said = (homeUse: string, known: Record<string, unknown>) => validate({ reply: "Thank you.", route: "none", abstained: false, context: { homeUse } }, known);
    expect(said("not sure", { type: "C-11", asked: "homeUse", messages: ["Not sure yet."] })?.context?.homeUse).toBe("not sure");
    expect(said("yes", { type: "C-11", messages: ["People already use the river water."] })).toMatchObject({ notGiven: ["homeUse"] });
    expect(said("yes", { type: "C-11", messages: ["People already use the river water."] })?.context).toBeUndefined();
    expect(said("yes", { type: "C-19", messages: ["Yes."] })?.context).toBeUndefined();
    expect(said("maybe", { type: "C-11", asked: "homeUse", messages: ["Maybe."] })?.context).toBeUndefined();
    expect(said("yes", { asked: "homeUse", messages: ["Yes, they drink it at home."] })?.context?.homeUse).toBe("yes");
  });
});

describe("the source, the treatment and the water's safety, as plain facts", () => {
  const ctx = (context: Record<string, unknown>, known = {}, more = {}) => validate({ reply: "Thank you for that.", route: "none", abstained: false, context, ...more }, known)?.context;
  const well = { messages: ["We will drill a new well, with no treatment.", "Yes, it was tested and is safe to drink."] };
  const words = { heard: [{ fact: "waterSource", words: "drill a new well" }, { fact: "treatment", words: "no treatment" }] };
  test("he returns them as core's facts; a class is never kept", () => {
    expect(ctx({ waterSource: "new", treatment: "none", sourceSafe: true, gsClass: "CWS", technologyClass: "CWS" }, { ...well, asked: "sourceSafe" }, words)).toEqual({ waterSource: "new", treatment: "none", sourceSafe: true });
    expect(ctx({ waterSource: "well", treatment: "a filter" })).toBeUndefined();
    expect(HIS_KIND_FACTS).toEqual(["waterSource", "treatment", "sourceSafe"]);
  });
  test("they belong to a project that gives people water, and the rest only when the map asked", () => {
    expect(ctx({ waterSource: "new", type: "C-12" })).toEqual({ type: "C-12" });
    expect(ctx({ waterSource: "restored" }, { type: "C-12" })).toBeUndefined();
    const fixed = { messages: ["We are fixing the old borehole that broke."] };
    expect(ctx({ waterSource: "restored", outThreeMonths: true }, fixed, { heard: [{ fact: "waterSource", words: "fixing the old borehole" }] })).toEqual({ waterSource: "restored" });
    expect(ctx({ outThreeMonths: true }, { asked: "outThreeMonths", messages: ["Yes, for half a year."] })).toEqual({ outThreeMonths: true });
  });
  test("a fact is filled only when the visitor gave it (2026-11-26): the river case, and no words of theirs", () => {
    const river = { messages: ["We want to treat it at the tank. People already use the river water."], asked: "waterSource" };
    const answer = validate(
      { reply: "Thank you. Is it the public piped supply?", route: "none", abstained: false, asking: "publicPiped", context: { waterSource: "existing", publicPiped: false, homeUse: "yes", pipedShownUnsafe: false }, heard: [{ fact: "waterSource", words: "already use the river water" }] },
      { ...river, type: "C-19" },
    );
    expect(answer?.context).toEqual({ waterSource: "existing" });
    expect(answer?.asking).toBe("publicPiped");
    expect(ctx({ waterSource: "new" }, { messages: ["Hello there."] })).toBeUndefined();
    expect(ctx({ waterSource: "new" })).toBeUndefined();
  });
  test("his shape asks for them by core's own words, and for no class", () => {
    const c = WELLINGTON_RESPONSE_SCHEMA.properties.context.properties as Record<string, { description?: string }>;
    expect(Object.keys(c)).toEqual(["does", "name", "place", "type", "waterSource", "treatment", "sourceSafe", "stage", "served", "homeUse"]);
    expect(c.waterSource!.description).toMatch(/never asked as a list/);
  });
  test("what he heard goes on the record through core: kind facts, a count as said, the place in their words", () => {
    const learned = { does: "A made-up borehole.", type: "C-19", waterSource: "new", treatment: "none", stage: "paper", served: { count: 240, unit: "households" }, place: "A made-up valley" } as const;
    expect(learnedFacts(learned)).toEqual({ waterSource: "new", treatment: "none", does: "A made-up borehole.", placeWords: "A made-up valley", type: "C-19", stage: "paper", population: { served: 240, mode: "households" } });
    const out = addWellingtonFacts(newProjectRecord(), learned);
    expect([out.record.facts.waterSource?.value, out.record.facts.population?.value, out.record.place.words?.value]).toEqual(["new", { served: 240, mode: "households" }, "A made-up valley"]);
  });
  test("a screening made before these rules takes no fact about its kind", () => {
    const old = emptyRecord();
    old.facts.technology = { label: "Community water supply", code: "CWS", source: by };
    const out = addWellingtonFacts(old, { waterSource: "existing", treatment: "homes", does: "A made-up supply." });
    expect([out.newScreening, out.record.facts.waterSource, out.record.facts.does?.value]).toEqual([["waterSource", "treatment"], undefined, "A made-up supply."]);
  });
  test("a count core refuses is kept off, and the visitor is told why", () => {
    expect(validate({ reply: "Thanks.", route: "none", abstained: false, context: { served: { count: -3, unit: "people" } } })?.context).toBeUndefined();
    expect(refusedCount({ served: { count: -3, unit: "people" } })).toBe("below zero");
    expect(refusedCount({ served: { count: 2.5, unit: "people" } })).toBe("not a whole number");
    expect(refusedCount({ served: { count: 30, unit: "people" } })).toBeNull();
    expect(REFUSED_LINE["below zero"]).toMatch(/not kept/);
  });
});

describe("the map's steps (carried)", () => {
  const at = (over: Record<string, unknown>) => readMap({ next: "call", agent: "calvin", agents: ["calvin", "violet"], done: ["eligibility", "partners"], ...over })!;
  test('the step names are the journey\'s, the route at the end of a step is the map\'s, and "done" is never said too soon', () => {
    expect([...STEP_NAMES]).toEqual(STEPS.map((s) => s.name));
    expect(stepEndRoute("map", at({}))).toBe("quantification");
    expect(stepEndRoute("map", at({ done: ["eligibility"] }))).toBeNull();
    expect(stepEndRoute("map", at({ next: "report or sign-up", agent: undefined }))).toBe("none");
    expect(stepEndRoute("quantification", at({ agent: "violet", agents: ["violet"] }))).toBe("water");
    expect(stepEndRoute("quantification", at({}))).toBeNull();
    expect(stepEndNote("map", at({ next: "report or sign-up", agent: undefined, agents: [], steps: ["eligibility", "partners"] }))).toMatch(/Step 2 of 2, Partners/);
    expect([saysAllDone("Every step of the screening is done."), saysAllDone("Your screening is complete.")]).toEqual([true, true]);
    expect([saysAllDone("Step 2, Partners, is done. Next is Step 3, Quantify."), saysAllDone("The screening is not done yet.")]).toEqual([false, false]);
  });
  test("home use is asked before the next step is named, and then the next agent follows", () => {
    const homeUse = at({ next: "gather facts", facts: ["homeUse"], agent: "bridget", agents: ["bridget"], done: ["eligibility"] });
    expect([asksHomeUse(homeUse), stepEndRoute("eligibility", homeUse), afterHomeUse(homeUse)]).toEqual([true, "none", "map"]);
    expect(stepEndNote("eligibility", homeUse)).toMatch(/whether people use the water at home/);
    expect(stepEndNote("eligibility", homeUse, true)).toMatch(/return it in context\.homeUse/);
  });
  test("a route to a desk the map has closed is none", () => {
    expect(guardRoute("quantification", at({ closed: ["calvin"] }))).toBe("none");
    expect(guardRoute("water", at({ closed: ["calvin"] }))).toBe("water");
  });
  test("a map that does not hold is no map", () => {
    expect([readMap(null), readMap({ next: "somewhere" }), readMap({ next: "call" })]).toEqual([null, null, null]);
    expect(readMap({ next: "gather facts", facts: ["waterSource", "kind", "class"] })?.facts).toEqual(["waterSource"]);
  });
});

describe("from core's map, on the shared record", () => {
  const map = (record: ProjectRecord) => agentMap({ place: "free-site", record, reads: ["vwba", "carbon"] });
  test("a new project: gather where the water comes from, with core's one small question, never a kind", () => {
    const r = addGivenFacts(newProjectRecord(), "wellington", { does: "A made-up borehole.", type: "C-19" }).record;
    const note = mapNote(r, map(r))!;
    expect([note.next, note.facts[0]]).toEqual(["gather facts", "waterSource"]);
    const block = mapBlock(note);
    expect(block).toContain(KIND_ASKS.waterSource.about);
    expect(block).not.toMatch(/\bK[1-6]\b|class/);
  });
  test("once the facts are in, Phoebe is next, and the steps are core's", () => {
    const r = addGivenFacts(newProjectRecord(), "wellington", { type: "C-19", waterSource: "new", treatment: "none", sourceSafe: true, country: "XKX" }).record;
    const note = mapNote(r, map(r))!;
    expect([note.next, note.agent, note.steps[0]]).toEqual(["call", "phoebe", "eligibility"]);
    expect(mapBlock(note)).toMatch(/Step 1 of \d, Eligibility, with Phoebe/);
  });
  test("the lobby chat has no map block and no record", () => {
    expect(mapNote(newProjectRecord(), agentMap({ place: "lobby-chat" }))).toBeNull();
    expect(wellingtonBlocks({ place: "lobby-chat", record: addGivenFacts(newProjectRecord(), "wellington", { does: "x".repeat(20) }).record })).toEqual([]);
    expect(validate({ reply: "Happy to help with that.", route: "eligibility", context: { does: "A made-up borehole." }, abstained: false }, { place: "lobby-chat" })).toEqual({
      reply: "Happy to help with that.",
      answers: [],
      route: "none",
      abstained: false,
    });
  });
  test("the free site's own end words come at the free site only", () => {
    const done = readMap({ next: "report or sign-up" })!;
    expect(mapBlock(done, "free-site")).toMatch(/Save and sign up/);
    expect(mapBlock(done, "paid-site")).not.toMatch(/Save and sign up|save button/);
  });
});

describe("one turn", () => {
  const record = addGivenFacts(newProjectRecord(), "wellington", { does: "A made-up borehole.", type: "C-19", waterSource: "new", stage: "paper" }).record;
  test("what the record holds, in plain words, and what is still blank", () => {
    const block = visitBlock(record)!;
    expect(block).toMatch(/^# What this visit already holds/);
    expect(block).toContain("- What type: Access to potable water supply — Giving households or a community access to water that is safe to drink.");
    expect(block).toContain("- The source: new");
    expect(stillBlank(record)).toEqual(["whether it is treated, and where", "people served", "where it is"]);
    expect(visitBlock(newProjectRecord())).toBeNull();
  });
  test("what Phoebe found: reads and row titles, never her sentences; nothing before she has looked", () => {
    expect(phoebeFoundBlock([{ name: "Water benefits", read: "more to learn", looked: false, blocked: [], open: [] }])).toBeNull();
    const block = phoebeFoundBlock([
      { name: "Water benefits", read: "likely", looked: true, blocked: [], open: [{ id: "E-1", title: "A made-up row" }] },
      { name: "Carbon credits", read: "does not apply", looked: false, blocked: [], open: [] },
    ])!;
    expect(block).toContain("- Water benefits: likely. Still open: E-1 — A made-up row.");
    expect(block).toContain("- Carbon credits: unlikely — it does not apply to this project.");
  });
  test("the blocks come in the open site's order, and the second call is told to answer now", () => {
    const note = readMap({ next: "call", agent: "phoebe", agents: ["phoebe"] })!;
    const blocks = wellingtonBlocks({ place: "free-site", record, map: note, opened: { at: "open" }, pass: 2 });
    expect(blocks.map((b) => b.split("\n")[0])).toEqual(["# What this visit already holds", "# This door", "# What the agent map says", "# Where you are speaking", "# Answer now"]);
    expect(blocks[1]).toContain("Say neither.");
    expect(wellingtonBlocks({ place: "free-site", record, door: { savedProject: false, changesKept: "never", recordPage: false } })[1]).toContain("has no Project Record page");
    expect(blocks[4]).toBe(`${FINISH_NOTE} A step is still ahead, so never say the screening, or every step, is done.`);
    expect(openedLine({ handoff: "map" })).toBe("(The visitor has opened Bridget's page. Wellington introduces them there.)");
  });
  test("after his answer: the route is the map's, a look-up goes again once, and done too soon goes again", () => {
    const note = readMap({ next: "call", agent: "bridget", agents: ["bridget"], done: ["eligibility"] })!;
    const reply = "Step 1, Eligibility, is done, and two paths look open. Bridget helps next with the map of your area.";
    const ended = checkWellingtonTurn({ reply, route: "none", introduction: "Bridget, this is a made-up borehole.", abstained: false }, { place: "free-site", map: note, opened: { at: "eligibility" } });
    expect(ended).toMatchObject({ ok: true, answer: { route: "map", introduction: "Bridget, this is a made-up borehole." } });
    const waits = { reply: "Good question. Let me look into that for you before I answer.", route: "none", abstained: false };
    expect(checkWellingtonTurn(waits, { place: "free-site", map: note })).toEqual({ ok: false, again: "look-up" });
    expect(checkWellingtonTurn(waits, { place: "free-site", map: note, pass: 2 })).toEqual({ ok: false, fault: "no answer" });
    const soon = { reply: "Your screening is complete, and thank you for all the details today.", route: "none", abstained: false };
    expect(checkWellingtonTurn(soon, { place: "free-site", map: note })).toEqual({ ok: false, again: "done too soon" });
    expect(checkWellingtonTurn(soon, { place: "free-site", map: note, pass: 2 }).ok).toBe(true);
    expect(checkWellingtonTurn({ reply: "Hi.", route: "none", abstained: false }, { place: "free-site" })).toEqual({ ok: false, fault: "too short" });
    expect(checkWellingtonTurn(null, { place: "free-site" })).toEqual({ ok: false, fault: "empty" });
  });
  test("a hand-off is that page's route, and a closed desk drops the route and its introduction", () => {
    const handed = checkWellingtonTurn({ reply: "Over to Phoebe.", route: "none", introduction: "Phoebe, this is a made-up borehole.", abstained: false }, { place: "free-site", opened: { handoff: "eligibility" } });
    expect(handed).toMatchObject({ ok: true, answer: { route: "eligibility", introduction: "Phoebe, this is a made-up borehole." } });
    const closed = readMap({ next: "call", agent: "violet", agents: ["violet"], closed: ["calvin"] })!;
    const out = checkWellingtonTurn({ reply: "Calvin can help you work out the carbon side next.", route: "quantification", introduction: "Calvin, a made-up borehole.", abstained: false }, { place: "free-site", map: closed });
    expect(out).toMatchObject({ ok: true, answer: { route: "none" } });
    expect(out.ok && out.answer.introduction).toBeUndefined();
  });
});

test("the country a place names, word for word, and none when it names two", () => {
  const countries = [
    { iso: "AAA", name: "Made Up Land" },
    { iso: "BBB", name: "Land" },
    { iso: "CCC", name: "Côte Invented" },
  ];
  expect(countryIsoFor("a valley in Made Up Land", countries)).toBe("AAA");
  expect(countryIsoFor("near the cote invented hills", countries)).toBe("CCC");
  expect(countryIsoFor("Land and Côte Invented", countries)).toBeNull();
  expect(countryIsoFor("", countries)).toBeNull();
});

test("an agent who has finished his part is done on the record the map reads", () => {
  const r = setAgentResults(addGivenFacts(newProjectRecord(), "wellington", { type: "C-19", waterSource: "new", treatment: "none", sourceSafe: true, country: "XKX" }).record, "phoebe", { done: true });
  const note = mapNote(r, agentMap({ place: "free-site", record: r, reads: ["vwba", "carbon"] }))!;
  expect(note.done).toContain("eligibility");
});

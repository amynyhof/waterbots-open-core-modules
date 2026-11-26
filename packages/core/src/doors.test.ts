import { describe, expect, test } from "vitest";
import { chatContext, siteKept, type Kept } from "./chat.js";
import { DOOR_FACTS, doorBlock, doorFactLines, type DoorFacts } from "./places.js";
import { addGivenFacts, changeFacts, newProjectRecord, setAgentResults, setEligibilitySheet, type ProjectRecord } from "./record.js";

// Made-up projects and made-up site values. No real project is named.

const paid: DoorFacts = { savedProject: false, changesKept: "on save", recordPage: true, siteValues: [{ key: "operationalDays", label: "Operating days a year", shown: "365", source: "this site's monitoring rule" }] };
const free: DoorFacts = { savedProject: false, changesKept: "never", recordPage: false };

describe("what a door means, as facts", () => {
  test("the Paid site's facts: kept on Save, a figure before Save, a Project Record page, and its own values", () => {
    const lines = doorFactLines("paid-site", paid).join("\n");
    expect(lines).toContain("kept only when they press Save");
    expect(lines).toContain("any figure shows before Save");
    expect(lines).toContain("has a Project Record page");
    expect(lines).toContain("  - Operating days a year: 365 (this site's monitoring rule).");
  });
  test("a site with no Project Record page is never pointed to one", () => {
    expect(doorFactLines("free-site", free).join("\n")).toContain("has no Project Record page. Never point the person to one");
  });
  test("a site that passes nothing: the agent says neither", () => {
    expect(doorFactLines("free-site")).toEqual(["The site has not said when a change is kept, or whether it has a Project Record page. Say neither."]);
  });
  test("the places with no record know their own facts, and the lobby chat has none", () => {
    expect(doorFacts()).toEqual([DOOR_FACTS["agent-commons"], DOOR_FACTS.mcp]);
    expect(doorFactLines("agent-commons").join(" ")).toContain("Nothing here is kept after the visit.");
    expect(doorBlock("lobby-chat")).toBeNull();
    expect(doorBlock("free-site", free)?.startsWith("# This door\n\n- The project is not saved.")).toBe(true);
  });
  test("the site's own value is read instead of the package's", () => {
    const kept: Kept[] = [{ key: "operationalDays", label: "Operating days", called: "assumed", shown: "347", source: "the package's start" }];
    expect(siteKept(kept, paid)).toEqual([{ key: "operationalDays", label: "Operating days a year", called: "assumed", shown: "365", source: "this site's own value: this site's monitoring rule" }]);
    const block = chatContext({ place: "paid-site", door: paid, asks: [], kept, figureShows: false, screen: "S" });
    expect(block).toContain("Operating days a year: 365");
    expect(block).not.toContain("347");
  });
  test("no line here is one for the agent to say", () => {
    const all = [...doorFactLines("paid-site", paid), ...doorFactLines("free-site", free), ...doorFactLines("free-site")].join("\n");
    expect(all).not.toMatch(/"[A-Z][^"]+[.?!]"/);
  });
});

function doorFacts(): DoorFacts[] {
  return [DOOR_FACTS["agent-commons"]!, DOOR_FACTS.mcp!];
}

describe("when the source or the treatment changes, every reading is worked out again", () => {
  function walked(): ProjectRecord {
    let r = addGivenFacts(newProjectRecord(), "wellington", { waterSource: "new", treatment: "central", does: "A treatment plant for the town", stage: "paper" }).record;
    r = setEligibilitySheet(r, "vwba-2.0", { rows: { c1: { state: "met", because: "The visitor said so." } } });
    r = { ...r, pathways: { vwba: { reading: "likely", reason: "r", wouldChange: "w", source: { by: "phoebe", note: "from her rows" } } } };
    return setAgentResults(r, "phoebe", { done: true });
  }
  test("the readings come off, Phoebe is called again with her rows kept, and the old words of what it does come off", () => {
    const out = changeFacts(walked(), "wellington", { waterSource: "existing", treatment: "none" });
    expect(out.readingsOff).toBe(true);
    expect(out.record.pathways).toEqual({});
    expect(out.record.agents.phoebe).toMatchObject({ done: false, factsChanged: true });
    expect(out.record.eligibility?.["vwba-2.0"]?.rows.c1?.state).toBe("met");
    expect(out.record.facts.does).toBeUndefined();
  });
  test("a new line in the same answer takes the old one's place", () => {
    const out = changeFacts(walked(), "wellington", { waterSource: "existing", does: "A borehole the village already uses" });
    expect(out.record.facts.does?.value).toBe("A borehole the village already uses");
  });
  test("her part done again clears the mark", () => {
    const out = changeFacts(walked(), "wellington", { treatment: "homes" });
    expect(setAgentResults(out.record, "phoebe", { done: true }).agents.phoebe?.factsChanged).toBeUndefined();
  });
  test("nothing changed, nothing comes off", () => {
    const out = changeFacts(walked(), "wellington", { waterSource: "new", stage: "building" });
    expect(out.readingsOff).toBe(false);
    expect(out.record.pathways.vwba?.reading).toBe("likely");
    expect(out.record.facts.does?.value).toBe("A treatment plant for the town");
  });
});

describe("one answer on the shared page", () => {
  test("the crew list reads the same sentence the desk shows, for every reason with no figure", async () => {
    const { noFigureWords } = await import("./agentMap.js");
    const { NO_CALCULATOR_YET } = await import("./projectKinds.js");
    for (const because of ["not covered yet", "not set up yet", "another kind of project"] as const) expect(noFigureWords(because)).toBe(NO_CALCULATOR_YET);
    expect(noFigureWords("waiting for the agent before")).toBeNull();
  });
});

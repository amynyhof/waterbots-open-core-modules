// What Phoebe is told: her instructions at each door, the card stages and the shape of her answer. Every case is made up.
import { readFileSync } from "node:fs";
import { FINISH_RULE } from "@waterbots/core/lookUp";
import { describe, expect, test } from "vitest";
import { CARD_SETS, DOOR_NAME, MAX_PASSES, PHOEBE_ANSWER_SCHEMA, cardsBlock, nextSets, phoebeInstructions, setsFor, whereLine, type PhoebeDoor } from "./instructions";
import { PHOEBE_PROMPT_MD } from "./generated/prompt.generated";

const here = (path: string): string => new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RULES = readFileSync(here("../../core/src/agent-rules.md"), "utf8");
const input = (door: PhoebeDoor, siteLines?: string[]) => ({
  door,
  agentRules: RULES,
  primer: "PRIMER TEXT",
  statusSheet: "STATUS SHEET TEXT",
  plainWords: "PLAIN WORDS TEXT",
  beforeAfter: "BEFORE AND AFTER TEXT",
  ...(siteLines ? { siteLines } : {}),
});

describe("her instructions", () => {
  test("each door gives its own first line, and every part is filled in", () => {
    for (const door of Object.keys(DOOR_NAME) as PhoebeDoor[]) {
      const text = phoebeInstructions(input(door));
      expect(text.split("\n")[0]).toBe(whereLine(door));
      expect(text).toContain(`the ${DOOR_NAME[door]} door of rule 21`);
      expect(text).not.toMatch(/\{\{[A-Z_]+\}\}/);
      for (const part of ["PRIMER TEXT", "STATUS SHEET TEXT", "PLAIN WORDS TEXT", "BEFORE AND AFTER TEXT", FINISH_RULE, "## The four doors", "21. An agent knows which door it is at"]) expect(text).toContain(part);
    }
  });
  test("she is never told she is always at the free site, and the rules sit whole under her own heading", () => {
    const text = phoebeInstructions(input("paid-site"));
    expect(text).not.toMatch(/WaterBots Open Harness|Free site door of rule 21, and the Agent Commons/);
    expect(text).not.toContain("# Foundational agent rules");
    expect(text).toContain("# The rules every agent follows\n\nThey govern. The rest of this prompt is only what is different for you.\n\n## How an agent talks");
  });
  test("a site's own lines come in their own block, one bullet each; with none, there is no block", () => {
    const text = phoebeInstructions(input("free-site", ["The box to reach the team is beside the save button.", " "]));
    expect(text).toContain("# Lines for this site\n\n- The box to reach the team is beside the save button.\n\n# Plain words");
    expect(phoebeInstructions(input("free-site"))).not.toContain("# Lines for this site");
  });
  test("her own text restates no rule and holds none of the open site's own screens", () => {
    for (const gone of [
      /You have no memory/,
      /you read only from cards/,
      /This site holds no link to the consulting page/,
      /box to reach the WaterBots team/,
      /transition-assistance module/,
      /You never say a phase runs here/,
      /\(ref\) marker is the worksheet's on this site/,
      /shelf of knowledge packs/,
      /its class\. It is never a verdict/,
    ]) {
      expect(PHOEBE_PROMPT_MD).not.toMatch(gone);
    }
  });
  test("the kind of project is the source and the treatment, never a class asked of anyone", () => {
    expect(PHOEBE_PROMPT_MD).toContain("a drinking-water project whose source and treatment are on the record settles the carbon pathway's technology question");
    expect(PHOEBE_PROMPT_MD).toContain("for a drinking-water project, where the water comes from and where it is treated");
  });
  test("a marker left out throws rather than sending a wrong prompt", () => {
    expect(() => phoebeInstructions({ ...input("free-site"), agentRules: "{{RULES}}" })).toThrow(/still hold a marker/);
  });
});

describe("the cards she has on a turn", () => {
  const open = [
    { pack: "vwba-2.0", state: "applies", open: 3 },
    { pack: "gs-paa-v2.0", state: "applies" },
  ];
  const stage2 = setsFor({ pathways: open });
  test("before anything is settled: the applies cards; the carbon pack opens in full once the water rows are done", () => {
    expect(setsFor({ pathways: [] })).toEqual(["water:applies", "carbon:applies"]);
    expect(stage2).toEqual(["water:applies", "water:eligibility", "water:routes", "carbon:applies"]);
    expect(setsFor({ pathways: [{ pack: "vwba-2.0", state: "applies", open: 0 }, { pack: "gs-paa-v2.0", state: "applies" }] })).toEqual(["water:applies", "water:eligibility", "water:routes", "carbon:applies", "carbon:eligibility", "carbon:routes"]);
  });
  test("a running project opens every pack that applies at once; a closed pack is never loaded; every row met opens the considerations", () => {
    expect(setsFor({ pathways: open, running: true })).toContain("carbon:eligibility");
    expect(setsFor({ pathways: [{ pack: "vwba-2.0", state: "applies", open: 3 }, { pack: "gs-paa-v2.0", state: "does-not-apply" }] }).some((s) => s.startsWith("carbon:"))).toBe(false);
    expect(setsFor({ pathways: open, allMet: true })).toContain("water:feasibility");
    expect(setsFor({ pathways: open, loaded: ["carbon:routes", "nonsense"] })).toContain("carbon:routes");
  });
  test("the question goes again until it is answered: the set she asks for and its pair, then every set still in play, three calls at most", () => {
    const shut = [
      { pack: "vwba-2.0", state: "applies" },
      { pack: "gs-paa-v2.0", state: "does-not-apply" },
    ];
    expect(nextSets({ used: stage2, asked: "carbon:eligibility", pathways: open, last: false })).toEqual(["water:applies", "water:eligibility", "water:routes", "carbon:applies", "carbon:eligibility", "carbon:routes"]);
    expect(nextSets({ used: stage2, asked: "water:routes", pathways: open, last: false })).toEqual([...CARD_SETS]);
    expect(nextSets({ used: stage2, asked: "none", pathways: open, last: true })).toEqual([...CARD_SETS]);
    expect(nextSets({ used: ["water:applies"], asked: "none", pathways: shut, last: true }).some((s) => s.startsWith("carbon:"))).toBe(false);
    expect(nextSets({ used: ["water:applies"], asked: "carbon:routes", pathways: shut, last: true })).toContain("carbon:routes");
    expect(MAX_PASSES).toBe(3);
  });
  test("the block says what she has, what she can ask for, and never to say she is looking something up", () => {
    const block = cardsBlock(["water:applies"]);
    expect(block).toMatch(/^# The cards you have on this turn/);
    expect(block).toContain("You have: The water pathway — does this apply.");
    expect(block).toContain("`carbon:routes`");
    expect(block).toContain("Never tell the visitor you are looking something up");
    expect(block).not.toMatch(/saying you are fetching it/);
    expect(cardsBlock([...CARD_SETS])).not.toContain("Not on this turn");
  });
});

describe("the shape of her answer", () => {
  test("it asks for the card set first, carries the chips, and names the fields a site acts on", () => {
    expect(Object.keys(PHOEBE_ANSWER_SCHEMA.properties)[0]).toBe("needCards");
    expect(PHOEBE_ANSWER_SCHEMA.required).toEqual(["needCards", "reply", "answers", "closes", "cited", "handBack", "abstained"]);
    expect(PHOEBE_ANSWER_SCHEMA.properties.needCards.enum).toEqual(["none", ...CARD_SETS]);
    expect(PHOEBE_ANSWER_SCHEMA.properties.handBack.enum).toEqual(["none", "wellington"]);
  });
});

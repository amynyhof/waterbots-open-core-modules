// Her two made modules, held to the files they are made from. Each is the file's text, with line endings made LF, one
// constant each, so they run in Node and in a browser alike. After a card file, a pack README or her instructions
// change, `npm run generate` writes them again (vitest's file snapshots); until then this test fails.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const here = (path: string): string => new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const lf = (path: string): string => readFileSync(here(path), "utf8").replace(/\r\n/g, "\n");

/** The sources of each made module, by the constant that holds each one. */
export const CARD_SOURCES: readonly (readonly [string, string])[] = [
  ["WATER_APPLIES_MD", "packs/vwba-2.0/cards/applies-cards-vwba.md"],
  ["WATER_ELIGIBILITY_MD", "packs/vwba-2.0/cards/eligibility-cards-vwba.md"],
  ["WATER_ROUTES_MD", "packs/vwba-2.0/cards/routes-cards-vwba.md"],
  ["WATER_FEASIBILITY_MD", "packs/vwba-2.0/cards/feasibility-cards-vwba.md"],
  ["CARBON_APPLIES_MD", "packs/gs-paa-v2.0/cards/applies-cards-gs.md"],
  ["CARBON_ELIGIBILITY_MD", "packs/gs-paa-v2.0/cards/eligibility-cards-gs.md"],
  ["CARBON_ROUTES_MD", "packs/gs-paa-v2.0/cards/routes-cards-gs.md"],
  ["WATER_README_MD", "packs/vwba-2.0/README.md"],
  ["CARBON_README_MD", "packs/gs-paa-v2.0/README.md"],
];
export const PROMPT_SOURCES: readonly (readonly [string, string])[] = [["PHOEBE_PROMPT_MD", "agents/phoebe/prompt.md"]];

function made(sources: readonly (readonly [string, string])[], what: string): string {
  const head = `/**\n * MADE FILE. Do not edit. Written by \`npm run generate\` (src/generated.test.ts) from ${what}; edit those and run it again.\n */\n\n`;
  return head + sources.map(([name, file]) => `/** ${file} */\nexport const ${name}: string = ${JSON.stringify(lf(file))};\n`).join("\n");
}

describe("the made modules are their files", () => {
  test("her cards and pack READMEs", async () => {
    await expect(made(CARD_SOURCES, "her card files and pack READMEs")).toMatchFileSnapshot("./generated/cards.generated.ts");
  });
  test("her own instructions", async () => {
    await expect(made(PROMPT_SOURCES, "her own instructions")).toMatchFileSnapshot("./generated/prompt.generated.ts");
  });
});

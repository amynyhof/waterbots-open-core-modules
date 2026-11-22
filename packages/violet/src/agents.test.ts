// Violet's agent files. Read as text; nothing here runs a model.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Line endings are set aside: one copy of the repo may give a file CRLF and another LF.
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\r\n/g, "\n");

describe("Violet's agent files", () => {
  it("name her tool, her colour and both doors", () => {
    const config = read("./agents/violet/config.yaml");
    expect(config).toMatch(/calc\/vwba-d3\.computeD3/);
    expect(config).toMatch(/#A457D4/);
    expect(config).toMatch(/agent-commons:/);
    expect(config).toMatch(/hands back to Wellington/);
  });

  it("tell her to ask for every value in the Commons and never add water to carbon", () => {
    const prompt = read("./agents/violet/prompt.md");
    expect(prompt).toMatch(/In the Agent Commons, you work alone/);
    expect(prompt).toMatch(/ask the person for every value/);
    expect(prompt).toMatch(/Never add a water benefit to a carbon figure/);
  });
});
